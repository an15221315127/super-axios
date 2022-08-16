import axios, {AxiosInstance, AxiosPromise, AxiosRequestConfig, Method, Canceler, AxiosError} from "axios";


const cancelToken = axios.CancelToken

interface Protocol {
    getRequestConfig(config: AxiosRequestConfig): RequestConfig       // 通过axios请求参数来获取原请求接口所有信息
    reconnect<R = any>(r: RequestConfig): AxiosPromise<R>             // 重新请求
    dispatch<R = any>(r: RequestConfig): AxiosPromise<R>              // 请求方法
    getHashCode(r: AxiosRequestConfig): number                        // 获取请求唯一标识
    checkRequestExists(hashCode: number): Boolean                     // 检测是否有存在相同请求
}

type MethodType = "default" | "delay" | "block" | "kill"

interface RequestConfig extends AxiosRequestConfig {
    type: MethodType            // 接口类型
    reconnect: Boolean          // 是否需要重连
    hashCode?: number           // 当前请求hashCode
    delayTime: number           // 私有化延迟请求时间
    cancelHandle?: Canceler     // 取消请求回调方法
    reconnectTimes: number      // 当前重连次数

}

interface Config extends AxiosRequestConfig {
    queue: Map<number, RequestConfig>           // 请求队列
    waitingTime: number                         // 重连等待时间,默认1000
    maxReconnectTimes: number                   // 最大重连次数,默认为5次
    delayTime: number                           // 延迟毫秒数，默认为300毫秒
    reconnectTime: number                       // 重连时间间隔
}

interface RequestUniqueObject {
    url: string,
    method: Method,
}


class SuperAxios implements Protocol {


    public axiosInstance: AxiosInstance                      // axios单例对象
    private queue: Map<number, RequestConfig>                // 请求队列
    private readonly maxReconnectTimes: number = 5           // 最大重连次数,默认为5次
    private readonly delayTime: number = 300                 // 延迟毫秒数，默认为300毫秒
    private Timer?: any                                      // 延时器对象
    private readonly reconnectTime: number                   // 重连时间间隔
    constructor(config: Config) {
        this.axiosInstance = axios.create(config)
        const {
            queue = new Map(),
            maxReconnectTimes = 5,
            delayTime = 300,
            reconnectTime = 1500
        } = config
        this.queue = queue
        this.maxReconnectTimes = maxReconnectTimes
        this.delayTime = delayTime
        this.reconnectTime = reconnectTime

    }

    /***
     * 重连请求
     * @param r
     */
    public reconnect<R = any>(r: RequestConfig): AxiosPromise<R> {
        if (r.reconnectTimes < this.maxReconnectTimes) {
            this.queue.delete(this.getHashCode(r))
            r.reconnectTimes++
            const Reconnection = new Promise<void>((resolve) => {
                setTimeout(() => {
                    resolve();
                }, this.reconnectTime)
            })
            return Reconnection.then(() => {
                return this.dispatch(r)
            });
        }
        return Promise.reject("已经尽力了，但是网络还是不给力")
    }

    /***
     * http请求最终执行方法
     * @param r:RequestConfig
     * @return AxiosPromise<R>
     * @private
     */
    dispatch<R = any>(r: RequestConfig = {
        type: "default", reconnect: true,
        delayTime: 300,
        reconnectTimes: 0,
    }): AxiosPromise<R> {
        if (!r.reconnectTimes) {
            r.reconnectTimes = 0
        }
        switch (r.type) {
            case "block":
                return this.block(r)
            case "delay":
                return this.delay(r)
            case "kill":
                return this.cancel(r)
            default:
                if (r.reconnect) {
                    this.queue.set(this.getHashCode(r), r)
                }
                return this.axiosInstance(r)
        }
    }

    /***
     * 堵塞当前请求
     * @param r
     * @private
     */
    private block<R = any>(r: RequestConfig): AxiosPromise<R> {
        const hashcode = this.getHashCode(r)
        if (this.checkRequestExists(hashcode)) {
            return Promise.reject(`在第一次未响应返回前不可重复请求该接口${r.url}`)
        }
        this.queue.set(hashcode, r)
        return this.resolve(r)
    }

    /***
     * 续接promise动作
     * @param r
     * @private
     */
    private resolve<R = any>(r: RequestConfig): AxiosPromise<R> {
        const self = this
        return new Promise(((resolve, reject) => {
            this.axiosInstance(r).finally(() => {
                const hashcode = self.getHashCode(r)
                self.queue.delete(hashcode)
            }).then((res) => {
                resolve(res)
            }).catch((err: AxiosError) => {
                reject(err)
            })
        }))
    }

    /***
     * 检测是否有存在相同请求
     * @param hashCode
     * @private
     */
    public checkRequestExists(hashCode: number): Boolean {
        return this.queue.has(hashCode)
    }


    /***
     *  处理可取消请求
     * @param r
     * @return RequestConfig
     */
    private cancel<R = any>(r: RequestConfig): AxiosPromise<R> {
        const hashcode = this.getHashCode(r);
        if (this.checkRequestExists(hashcode)) {
            this.queue.get(hashcode)?.cancelHandle?.("取消上一次相同请求")
            this.queue.delete(hashcode)
        }
        this.queue.set(hashcode, r)
        r.cancelToken = new cancelToken(function (c: Canceler) {
            r.cancelHandle = c
        })
        return this.resolve(r)
    }

    /***
     * 节流请求
     * @param r
     */
    private delay<R = any>(r: RequestConfig): AxiosPromise<R> {
        this.Timer && clearTimeout(this.Timer)
        const Reconnection = new Promise<void>((resolve) => {
            this.Timer = setTimeout(() => {
                resolve();
            }, r.delayTime || this.delayTime)
        })
        return Reconnection.then(() => {
            return this.axiosInstance(r)
        })

    }


    /***
     * 通过请求参数及请求方法生成唯一标识
     * @param r
     */
    public getHashCode(r: AxiosRequestConfig): number {
        const {url, method} = r
        const obj: RequestUniqueObject = {
            url: <string>url,
            method: <Method>method,
        }
        var str = JSON.stringify(obj);
        var hash = 0, i, chr, len;
        if (str.length === 0) return hash;
        for (i = 0, len = str.length; i < len; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    /***
     * 通过AxiosRequestConfig获取RequestConfig
     * @param config
     */
    public getRequestConfig(config: AxiosRequestConfig): RequestConfig {
        return this.queue.get(this.getHashCode(config))!;
    }

}




export default SuperAxios;
