import {AxiosPromise, AxiosRequestConfig} from "./axios";


class AxiosManager<V = any> {
    /**
     * 请求队列
     */
    static requesting: Map<string,Request>
    /**
     * 需要防止重复的请求队列
     */
    static shakeQueue:  Map<string,Request>
    /**
     *断线重连时间间隔
     */
    static timeStep: number
    /**
     * 最大重连数
     */
    static maxReconnectionTimes: number
    /**
     * 延时时间
     */
    static delayTime: number
    /**
     * 请求拦截器
     * @param config
     */
    static request: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<V>

    /**
     *  响应拦截器
     * @param value
     */
    static response: (value: V) => V | Promise<V>
    /**
     * 开始尝试重连
     */
    static tryBegin: () => void
    /**
     * 重连成功的回调
     */
    static trySuccess: () => void
    /**
     * 重连成功的回调
     */
    static tryFail: () => void
    /**
     *  重连管理对象
     */
    static autoWorker: AutoWorker
    /**
     *延时器对象
     */
    static Timer?: NodeJS.Timeout
    /**
     * Axios实例
     */
    Http: AxiosInstance

    /**
     *  取消请求回调方法
     */
    cancel: Canceler
    /**
     * 是否延时
     */
    delay: boolean
    /**
     * 是否需要自动取消
     */
    needCancel: boolean
    /**
     * 是否需要防抖
     */
    shake: boolean
    /**
     *  懒人装载
     */
    requester: Request


    /**
     * 构造方法
     * @param c
     * @param ext
     */
    constructor(axiosConfig: AxiosRequestConfig, ext: Extension)

    /**
     * 重连方法
     */
    reconnect: () => val | Promise<AxiosPromise>
    /**
     * get方法
     * @param url
     * @param params
     * @param headers
     * @param c
     */
    get: (url: string, params?: V, c: Manager, headers?: V) => Promise<AxiosPromise>
    /**
     * post
     * @param url
     * @param data
     * @param headers
     * @param c
     */
    post: (url: string, data: V, c: Manager, headers?: V) => Promise<AxiosPromise>
    /**
     * delete
     * @param url
     * @param data
     * @param headers
     * @param c
     */
    delete: (url: string, data: V, c: Manager, headers?: V) => Promise<AxiosPromise>
    /**
     * put
     * @param url
     * @param data
     * @param headers
     * @param c
     */
    put: (url: string, data: V, c: Manager, headers?: V) => Promise<AxiosPromise>
    /**
     * patch
     * @param url
     * @param data
     * @param headers
     * @param c
     */
    patch: (url: string, data: V, c: Manager, headers?: V) => Promise<AxiosPromise>
    /**
     * 发起axios请求
     * @param q
     */
    dispatch: (q: Request) => Promise<AxiosPromise>
}

export interface ManagerConfig<V = any> {
    cancel: Canceler | null,// 可手动取消axios请求的回调方法
    shake: boolean,
    needCancel: boolean,
    delay?: boolean,
    Http: AxiosInstance
    requester?: Request

}


export interface Extension<V = any> {
    request: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosPromise>
    response: (value: AxiosResponse) => any | Promise<AxiosPromise>
}

export interface Request extends AxiosRequestConfig {
    cancel?: Canceler | null,// 可手动取消axios请求的回调方法
    shake?: boolean,
    needCancel?: boolean,
    delay?: boolean,
    delayTime?: number
    isDelay?: boolean
    autoCounts?: number
}

export interface Manager {
    shake?: boolean,
    needCancel?: boolean,
    delay?: boolean,
    delayTime?: number
}

export interface AutoWorker {
    autoAttempt: boolean,
    attemptMap: Map<string,Request>
}



export default AxiosManager
