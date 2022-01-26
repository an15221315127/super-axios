import axios from "axios"
import {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    Canceler,
    Method,
    Extension,
    Manager,
    Context,
} from "../types"



const cancelToken = axios.CancelToken

/***
 * Q 为请求参数
 * D 返回值
 * E 错误接受体
 */
class AxiosManager {
    cancelMap: Map<string, Context> = new Map() // 请求队列
    shakeMap: Map<string, Context> = new Map() // 防抖的请求队列
    tryingMap: Map<string, Context> = new Map() // 重连队列
    timeStep = 1000; // 断线重连时间间隔
    maxReconnectionTimes = 5; // 最大重连数
    delayTime = 500; // 延时时间
    request?: (<E>(config: AxiosRequestConfig) => (AxiosRequestConfig | AxiosError<E>))
    response?: (<D, E>(res: D) => D | AxiosError<E>)
    trySuccess?: () => void// 重连成功的回调
    tryFail?: () => void// 重连失败的回调
    tryBegin?: () => void // 开始尝试重连
    Timer?: NodeJS.Timeout // 延时器对象

    Http: AxiosInstance; // axios实例
    cancel: Canceler | null = null; // 取消请求回调方法
    delay = false; // 是否延时
    needCancel = false; // 是否需要取消
    shake = false; // 是否需要阻止
    context: Context = {} // 当前请求上下文


    private sleep(ms: number) {
        return new Promise((resolve) => {
            return this.Timer = setTimeout(resolve, ms)
        });
    }
    // 初始化axios
    constructor(axiosConfig: AxiosRequestConfig, {
        maxReconnectionTimes = 5,
        timeStep = 1000,
        tryBegin = () => {
        },
        tryFail = () => {
        },
        trySuccess = () => {
        },
    }: Extension) {
        this.maxReconnectionTimes = maxReconnectionTimes
        this.timeStep = timeStep
        this.tryBegin = tryBegin
        this.tryFail = tryFail
        this.trySuccess = trySuccess
        this.Http = axios.create(axiosConfig)
        // axios请求过滤
        this.Http.interceptors.request.use(async (config: AxiosRequestConfig) => {
            const {url, method, data, params}: AxiosRequestConfig = config
            const {needCancel, shake} = this
            const that = this
            // 需要观察自动取消的队列
            if (needCancel) {
                config.cancelToken = new cancelToken(function (c: Canceler) {
                    that.cancelMap.set(that.getKey(url, method), {
                        url,
                        method,
                        data,
                        params,
                        cancel: c
                    })
                })
            }
            // 防抖禁止
            if (shake) {
                this.shakeMap.set(this.getKey(url, method), {
                    url,
                    method,
                    data,
                    params,
                })
            }
            // 对外暴露的请求拦截器
            if (this.request) {
                return this.request(config)
            }

            return config
        }, (error: AxiosError) => {  // 当发生错误时，执行该部分代码
            const {url, method} = error.config
            const {needCancel, shake} = this
            // 清除防抖
            if (shake) {
                this.shakeMap.delete(this.getKey(url, method))
            }
            // 清除可取消队列
            if (needCancel) {
                this.cancelMap.delete(this.getKey(url, method))
            }
        })
        // 相应拦截器
        this.Http.interceptors.response.use(<D, E>(res: AxiosResponse<D>): D | AxiosError<E> => {
            const {shake, needCancel} = this
            const {url, method}: AxiosRequestConfig = res.config
            // 清除防抖
            if (shake) {
                this.shakeMap.delete(this.getKey(url, method))
            }
            // 清除可取消队列
            if (needCancel) {
                this.cancelMap.delete(this.getKey(url, method))
            }

            // http状态码判断
            if (res.status == 200) { // 请求服务端成功

                // 先查看当前请求时重连队列是否有正在重连的接口如果有就过滤掉当前这个接口
                if (this.tryingMap.get(this.getKey(url, method))) {
                    this.tryingMap.delete(this.getKey(url, method))
                    // 然后再看是否重连队列已被清空，清空后直接执行success方法
                    if (this.tryingMap.size === 0) {
                        this.trySuccess && this.trySuccess()
                    }
                }

                // 在这里业务验证码判断
                if (this.response) {
                    return this.response(res.data)
                }

                return res.data
            }

            // @ts-ignore
            return Promise.reject(res.toString())
        }, <E>(error: AxiosError<E>) => {
            const {shake, needCancel} = this
            const {url, method,} = error.config
            if (shake) {
                this.shakeMap.delete(this.getKey(url, method))
            }
            if (needCancel) {
                this.cancelMap.delete(this.getKey(url, method))
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

                const {maxReconnectionTimes, tryingMap} = this;
                const {url, method, data, params} = error.config
                let request = tryingMap.get(this.getKey(url, method))
                if (request) {
                    if (request.autoCounts && maxReconnectionTimes > request.autoCounts) {
                        request.autoCounts++
                        this.tryingMap.set(this.getKey(url, method), request)
                        return this.reconnect(this.getKey(url, method))
                    } else {
                        this.tryingMap.delete(this.getKey(url, method))
                        if (this.tryingMap.size === 0) {
                            this.tryFail && this.tryFail()
                        }
                        return Promise.reject("重连失败")
                    }
                } else {
                    if (this.tryingMap.size === 0) {
                        this.tryBegin && this.tryBegin()
                    }
                    this.tryingMap.set(this.getKey(url, method), {
                        url, method, data, params,
                        autoCounts: 1
                    })
                    return this.reconnect(this.getKey(url, method))
                }

            }

            return Promise.reject(error)
        })
    }

    reconnect(key: string) {
        const data = this.tryingMap.get(key)
        const Reconnection = new Promise<void>((resolve) => {
            setTimeout(() => {
                resolve();
            }, this.timeStep)
        })
        return Reconnection.then(() => {
            return data && this.dispatch(data)
        });
    }

    get<Q, D, E>(url: string, params: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E> {
        return this.dispatch({
            params,
            url,
            headers,
            method: "get",
            ...c
        })
    }

    post<Q, D, E>(url: string, data: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E> {
        return this.dispatch({
            data,
            url,
            headers,
            ...c,
            method: "post"
        })
    }

    put<Q, D, E>(url: string, data: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E> {
        return this.dispatch({
            data,
            url,
            headers,
            ...c,
            method: "put"
        })
    }

    delete<Q, D, E>(url: string, data: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E> {
        return this.dispatch({
            data,
            url,
            headers,
            ...c,
            method: "delete"
        })
    }

    patch<Q, D, E>(url: string, data: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E> {
        return this.dispatch({
            data,
            url,
            headers,
            ...c,
            method: "patch"
        })
    }

    private async dispatch<D, E>(context: Context): Promise<D | E> {
        // 保存当前请求上下文
        this.context = context
        const {url, method, data, params, headers, delayTime, delay, shake, needCancel} = context
        this.delay = delay ?? false
        this.shake = shake ?? false
        this.needCancel = needCancel ?? false
        const {shakeMap, cancelMap} = this
        // 是否需要取消上一次的请求
        if (needCancel && cancelMap.has(this.getKey(url, method))) {
            let it = cancelMap.get(this.getKey(url, method))
            if (it && it.cancel) {
                it.cancel("取消接口")
                this.cancelMap.delete(this.getKey(url, method))
            }
        }
        // 是否延迟
        if (delay) {
            this.Timer && clearTimeout(this.Timer)
            await this.sleep(delayTime || this.delayTime)
        }
        // 是否阻止后面的重复提交
        if (shake && shakeMap.has(this.getKey(url, method))) {
            return Promise.reject("请勿重复提交")
        }
        // 提交请求
        try {
            const res = await this.Http({
                url,
                method,
                data,
                params,
                headers: {...this.Http.defaults.headers, ...headers}
            })
            return res?.data ?? res
        } catch (e: any) {
            return e
        }

    }


    private getKey(url?: string, method?: Method): string {

        return `url=${url}method=${method}`
    }

}

export default AxiosManager;
