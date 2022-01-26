import {AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, Canceler, Method, AxiosPromise} from "axios"


export {
    AxiosInstance,
    AxiosResponse,
    AxiosRequestConfig,
    AxiosError,
    Canceler,
    Method,
    AxiosPromise
}

class AxiosManager {
    /**
     * 请求队列
     */
    cancelMap: Map<string, Context>
    /**
     * 需要防止重复的请求队列
     */
    shakeQueue: Map<string, Context>
    tryingMap: Map<string, Context>
    /**
     *断线重连时间间隔
     */
    timeStep: number
    /**
     * 自动尝试重连
     */
    autoAttempt: boolean

    /**
     * 最大重连数
     */
    maxReconnectionTimes: number
    /**
     * 延时时间
     */
    delayTime: number
    /**
     * 请求拦截器
     * @param config
     */
    request?: (<E>(config: AxiosRequestConfig) => (AxiosRequestConfig | AxiosError<E>))


    /**
     *  响应拦截器
     * @param value
     */
    response?: (<D, E>(res: D) => D | AxiosError<E>)
    /**
     * 开始尝试重连
     */
    tryBegin: () => void
    /**
     * 重连成功的回调
     */
    trySuccess: () => void
    /**
     * 重连成功的回调
     */
    tryFail: () => void

    /**
     *延时器对象
     */
    Timer?: NodeJS.Timeout
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
     *  当前请求上下文
     */
    context: Context


    /**
     * 构造方法
     * @param c
     * @param ext
     */
    constructor(axiosConfig: AxiosRequestConfig, ext: Extension)

    /**
     * get方法
     * @param url
     * @param params
     * @param headers
     * @param c
     */
    get<Q, D, E>(url: string, params: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E>

    /**
     * post
     * @param url
     * @param data
     * @param headers
     * @param c
     */
    post<Q, D, E>(url: string, data: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E>

    /**
     * delete
     * @param url
     * @param data
     * @param headers
     * @param c
     */
    put<Q, D, E>(url: string, data: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E>

    /**
     * put
     * @param url
     * @param data
     * @param headers
     * @param c
     */
    delete<Q, D, E>(url: string, data: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E>

    /**
     * patch
     * @param url
     * @param data
     * @param headers
     * @param c
     */
    patch<Q, D, E>(url: string, data: Q, c?: Manager, headers?: { [key: string]: any }): Promise<D | E>

    /**
     * 发起axios请求
     * @param q
     */
    dispatch<D, E>(context: Context): Promise<D | E>
}


export interface Extension<T = any> {
    trySuccess?: () => void // 重连成功的回调
    tryFail?: () => void// 重连失败的回调
    tryBegin?: () => void // 开始尝试重连
    maxReconnectionTimes?: number; // 最大重连数
    timeStep?: number; // 断线重连时间间隔
    request?: (<E>(config: AxiosRequestConfig) => (AxiosRequestConfig | AxiosError<E>))
    response?: (<D, E>(res: D) => D | AxiosError<E>)
}

export interface Context extends AxiosRequestConfig {
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


export default AxiosManager
