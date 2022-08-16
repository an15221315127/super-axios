# super-axios

## super-axios 基于 axios 封装了断线重连，防抖提交，节流请求，以及自动取消接口功能具体使用方式请看案例：

|       参数          | 类型   |    默认   |   说明     |
|  ------------      | ----  | -------- | --------     |
| reconnectTime      | number |   1000  |  重连等待时间|
| maxReconnectTimes  | number |    3    | 最大重连次数 |
| delayTime         | number |    300    | 延时接口等待时间 |

```ts
import {SuperAxios} from "super-axios"

const services = new SuperAxios({
    baseURL: "http://124.221.204.219:8888",
    timeout: 10,
    headers: {
        "Content-Type": "application/json"
    },
    withCredentials: false,
    reconnectTime: 1000,
    maxReconnectTimes: 3,
})

services.axiosInstance.interceptors.request.use((config) => {
    const token = "ABD123124123"
    if (config.headers) {
        config.headers["x-token"] = token
    }
    return config
})
services.axiosInstance.interceptors.response.use((res) => {
    return res
}, err => {
    if (err.message.search("timeout") > -1) {
        // 断线重连考虑到每个项目的业务处理方式不同，所以只封装了方法，具体触发时机需要开发者自己处理
        return services.reconnect(services.getRequestConfig(err.config))
    }
})
export default services;
```

|       参数          | 类型   |    默认   |   说明     |
|  ------------      | ----  | -------- | --------     |
| type      | string |   default delay block kill  |    delay:节流请求，kill:自动取消，block 防抖提交|
| reconnect  | boolean |    true    | 接口是否需要重连机制 |
| delayTime  | number |    300    | 可覆盖总设置的delayTime参数 |

```ts
/**
 * 本插件把axios封装在了SuperAxios的axiosInstance属性下，保证了axios的无污染
 * type = "default" | "delay" | "block" | "kill"
 * delay 这个参数将会使请求延时发起，如果有相同请求会覆盖，一般用于后台管理select组件远程搜索时使用
 * delayTime:300, 这个参数用于设置延时时间，默认为300ms
 * kill 一般用于tab切换不同类型是获取的列表数据，用于自动取消上一次还未返回数据的请求
 * block 这是防抖参数，在同一接口没有返回数据之前无法发起第二次请求，一般用于form提交时
 * reconnect 默认:true // 默认所有接口都需要重连机制，如果某些接口不需要重连，请单独将接口reconnect设置为false
 * 断线重连默认开启，不关闭
 */
/**
 * 案例一 防抖提交
 * @param username
 * @param password
 * @returns Promise<data>
 */
const login = (username, password): AxiosPromise<UserInfo> =>
    services.dispatch({
        data: {username, password},
        url: "/users/login",
        method: "post",
        type: "block"
    });

/**
 * 自动取消， 用于tab切换过快时取消上一次未响应数据的接口
 * @param pageSize
 * @param pageNum
 */
const userList = (pageSize, pageNum): AxiosPromise<UserInfo[]> =>
    services.dispatch({
        params: {pageSize: 1, pageNum: 10},
        url: "/users/list",
        method: "get",
        type: "kill"
    });
/**
 * 案例三：节流请求，用于模糊查询搜索接口时后置接口覆盖前置接口
 * @param key
 */
const search = (key): AxiosPromise<UserInfo[]> =>
    services.dispatch({
        params: {pageSize: 1, pageNum: 10},
        url: "/users/list",
        method: "get",
        type: "delay",
        reconnect: false,
        delayTime: 500,// 默认为 300ms，可在特定接口覆盖默认参数
    });
```

#### 欢迎大家提问或提出 bug，共同维护这个仓库

#### 作者联系方式 wechat:gda20200604 qq:2890815038
