import axios from "axios";
import {
    AxiosError,
    AxiosInstance,
    AxiosPromise,
    AxiosRequestConfig,
    AxiosResponse,
    Canceler, Method
} from "../types/axios"
import {AutoWorker, Extension, Manager, ManagerConfig, Request} from "../types/index";


const cancelToken = axios.CancelToken

class AxiosManager implements ManagerConfig {
    static requestMap: Map<string, Request> = new Map() // 请求队列
    static shakeMap: Map<string, Request> = new Map() // 需要防止重复的请求队列
    static timeStep = 1000; // 断线重连时间间隔
    static maxReconnectionTimes = 5; // 最大重连数
    static delayTime = 500; // 延时时间
    static request: (config: AxiosRequestConfig) => (AxiosRequestConfig | Promise<AxiosPromise>)
    static response: (value: AxiosResponse) => any | Promise<AxiosPromise>
    static trySuccess: () => void // 重连成功的回调
    static tryFail: () => void  // 重连失败的回调
    static tryBegin: () => void // 开始尝试重连
    static Timer?: NodeJS.Timeout // 延时器对象

    static autoWorker: AutoWorker = {
        autoAttempt: false,  // 自动尝试重连
        attemptMap: new Map()// 重连队列
    }
    Http: AxiosInstance; // axios实例
    cancel: Canceler | null = null; // 取消请求回调方法
    delay = false; // 是否延时
    needCancel = false; // 是否需要取消
    shake = false; // 是否需要阻止
    requester?: Request


    private sleep(ms: number) {
        return new Promise((resolve) => {
            return AxiosManager.Timer = setTimeout(resolve, ms)
        });
    }


    // 初始化axios
    constructor(axiosConfig: AxiosRequestConfig, ext: Extension) {
        if (ext) {
            AxiosManager.request = ext.request
            AxiosManager.response = ext.response
        }
        this.Http = axios.create(axiosConfig)
        // axios请求过滤
        this.Http.interceptors.request.use(async (config: AxiosRequestConfig) => {
            const {url, method, data, params}: AxiosRequestConfig = config
            const {needCancel} = this
            const that = this
            // 需要观察自动取消的队列
            if (needCancel) {
                config.cancelToken = new cancelToken(function (c: Canceler) {
                    const item: any = {
                        url,
                        method,
                        data,
                        params,
                        cancel: c
                    }
                    AxiosManager.requestMap.set(that.getKey(url,method), item)
                })
            }
            // 对外暴露的请求拦截器
            if (AxiosManager.request) {
                return AxiosManager.request(config)
            }

            return config
        }, (error: AxiosError) => {  // 当发生错误时，执行该部分代码
            const {url, method} = error.config
            const {needCancel, shake} = this
            // 清除防抖
            if (shake) {
                AxiosManager.shakeMap.delete(this.getKey(url,method))
            }
            // 清除可取消队列
            if (needCancel) {
                AxiosManager.requestMap.delete(this.getKey(url,method))
            }
        })
        // 相应拦截器
        this.Http.interceptors.response.use((res: AxiosResponse) => {
            const {shake, needCancel} = this
            const {url, method}: AxiosRequestConfig = res.config
            // 清除防抖
            if (shake) {
                AxiosManager.shakeMap.delete(this.getKey(url,method))
            }
            // 清除可取消队列
            if (needCancel) {
                AxiosManager.requestMap.delete(this.getKey(url,method))
            }
            // http状态码判断
            if (res.status === 200) { // 请求服务端成功
                // 先查看当前请求时重连队列是否有正在重连的接口如果有就过滤掉当前这个接口
                if (AxiosManager.autoWorker.attemptMap.get(this.getKey(url,method))) {
                    AxiosManager.autoWorker.attemptMap.delete(this.getKey(url,method))
                    // 然后再看是否重连队列已被清空，清空后直接执行success方法
                    if (AxiosManager.autoWorker.attemptMap.size === 0) {
                        AxiosManager.autoWorker.autoAttempt = false
                        AxiosManager.trySuccess && AxiosManager.trySuccess()
                    }
                }
                // 在这里业务验证码判断
                if (AxiosManager.response) {
                    return AxiosManager.response(res)
                }
                return res.data
            }

            // @ts-ignore
            return Promise.reject(res.toString())
        }, (error: AxiosError) => {
            const {shake,needCancel} = this
            const {url, method, } = error.config
            if (shake) {
                AxiosManager.shakeMap.delete(this.getKey(url,method))
            }
            if (needCancel) {
                AxiosManager.requestMap.delete(this.getKey(url,method))
            }
            if (error && error.response) {
                switch (error.response.status) {
                    case 400:
                        error.message = '请求参数错误';
                        break;
                    case 401:
                        error.message = '未授权，请登录';
                        break;
                    case 403:
                        error.message = '跨域拒绝访问';
                        break;
                    case 404:
                        error.message = `请求地址出错: ${error.response.config.url}`;
                        break;
                    case 408:
                        error.message = '请求超时';
                        break;
                    case 500:
                        error.message = '服务器内部错误';
                        break;
                    case 501:
                        error.message = '服务未实现';
                        break;
                    case 502:
                        error.message = '网关错误';
                        break;
                    case 503:
                        error.message = '服务不可用';
                        break;
                    case 504:
                        error.message = '网关超时';
                        break;
                    case 505:
                        error.message = 'HTTP版本不受支持';
                        break;
                    default:
                        break;
                }
            }
            if (error.message.search('timeout') > -1) {
                const {maxReconnectionTimes, autoWorker} = AxiosManager;
                const {attemptMap} = autoWorker
                if (this.requester){
                    const {url, method} = this.requester
                    let request = attemptMap.get(this.getKey(url,method))
                    if (request) {
                        if (request.autoCounts && maxReconnectionTimes > request.autoCounts) {
                            request.autoCounts++
                            AxiosManager.autoWorker.attemptMap.set(this.getKey(url,method), request)
                            return this.reconnect()
                        } else {
                            AxiosManager.autoWorker.attemptMap.delete(this.getKey(url,method))
                            if (AxiosManager.autoWorker.attemptMap.size === 0) {
                                AxiosManager.autoWorker.autoAttempt = false
                                AxiosManager.tryFail && AxiosManager.tryFail()
                            }
                            return Promise.reject("重连失败")
                        }
                    } else {
                        AxiosManager.autoWorker.attemptMap.set(this.getKey(url,method), {
                            ...this.requester,
                            autoCounts: 1
                        })
                        return this.reconnect()
                    }
                }

            }

        })
    }

    reconnect() {
        if (!AxiosManager.autoWorker.autoAttempt) {
            AxiosManager.autoWorker.autoAttempt = true
            AxiosManager.tryBegin && AxiosManager.tryBegin()
        }

        const Reconnection = new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, AxiosManager.timeStep)
        })
        return Reconnection.then(() => {
            return this.requester && this.dispatch(this.requester)
        });
    }

    get(url: string, params: any, c: Manager, headers: any) {
        return this.dispatch({
            params,
            url,
            headers,
            method: "get",
            ...c
        })
    }

    post(url: string, data: any, c: Manager, headers: any) {
        return this.dispatch({
            data,
            url,
            headers,
            ...c,
            method: "post"
        })
    }

    put(url: string, data: any, c: Manager, headers: any) {
        return this.dispatch({
            data,
            url,
            headers,
            ...c,
            method: "put"
        })
    }

    delete(url: string, data: any, c: Manager, headers: any) {
        return this.dispatch({
            data,
            url,
            headers,
            ...c,
            method: "delete"
        })
    }

    patch(url: string, data: any, c: Manager, headers: any) {
        return this.dispatch({
            data,
            url,
            headers,
            ...c,
            method: "patch"
        })
    }

    // @ts-ignore
    async dispatch(request: Request): Promise<AxiosPromise> {
        // 这里只为偷个懒
        this.requester = request
        const {url, method, data, params, headers, delayTime, delay, shake, needCancel} = request
        this.delay = delay ?? false
        this.shake = shake ?? false
        this.needCancel = needCancel ?? false
        const {shakeMap, requestMap} = AxiosManager

        if (needCancel && requestMap.has(this.getKey(url,method))) {
            let it = requestMap.get(this.getKey(url,method))
            if (it && it.cancel) {
                it.cancel("取消接口")
                AxiosManager.requestMap.delete(this.getKey(url,method))
            }
        }
        // 是否延迟
        if (delay) {
            AxiosManager.Timer && clearTimeout(AxiosManager.Timer)
            await this.sleep(delayTime || AxiosManager.delayTime)
        }
        // 是否阻止后面的重复提交
        if (shake) {
            if (shakeMap.has(this.getKey(url,method))) {

                return Promise.reject({
                    message: `${url}正在请求，请勿重复提交`
                })
            }
            shakeMap.delete(this.getKey(url,method))

        }
        return this.Http({url, method, data, params, headers: headers ?? this.Http.defaults.headers})
    }


    private getKey(url?:string,method?:Method):string{
        return `url=${url}method=${method}`
    }

}


export default AxiosManager;
