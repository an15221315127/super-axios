import {AxiosInstance, AxiosPromise, AxiosRequestConfig, Canceler} from "axios";

export interface Protocol {
    getRequestConfig(config: AxiosRequestConfig): RequestConfig       // 通过axios请求参数来获取原请求接口所有信息
    reconnect<R = any>(r: RequestConfig): AxiosPromise<R>             // 重新请求
    dispatch<R = any>(r: RequestConfig): AxiosPromise<R>              // 请求方法
    getHashCode(r: AxiosRequestConfig): number                        // 获取请求唯一标识
    checkRequestExists(hashCode: number): Boolean                     // 检测是否有存在相同请求
}

export type MethodType = "default" | "delay" | "block" | "kill"

export interface RequestConfig extends AxiosRequestConfig {
    type: MethodType            // 接口类型
    reconnect: Boolean          // 是否需要重连
    hashCode?: number           // 当前请求hashCode
    delayTime: number           // 私有化延迟请求时间
    cancelHandle?: Canceler     // 取消请求回调方法
    reconnectTimes: number      // 当前重连次数

}

export interface Config extends AxiosRequestConfig {
    queue: Map<number, RequestConfig>           // 请求队列
    waitingTime: number                         // 重连等待时间,默认1000
    maxReconnectTimes: number                   // 最大重连次数,默认为5次
    delayTime: number                           // 延迟毫秒数，默认为300毫秒
    reconnectTime: number                       // 重连时间间隔
}

export class SuperAxios implements Protocol {
    public axiosInstance: AxiosInstance             // axios单例对象
    private queue: Map<number, RequestConfig<any>>  // 请求队列
    private maxReconnectTimes: number               // 最大重连次数,默认为5次
    private delayTime: number                       // 延迟毫秒数，默认为300毫秒
    private Timer?: any                             // 延时器对象
    private reconnectTime: number                   // 重连时间间隔
    constructor(config: Config)

    checkRequestExists(hashCode: number): Boolean;

    dispatch<R = any>(r: RequestConfig): AxiosPromise<R>;

    getHashCode(r: AxiosRequestConfig): number;

    getRequestConfig(config: AxiosRequestConfig): RequestConfig;

    reconnect<R = any>(r: RequestConfig): AxiosPromise<R>;


}
