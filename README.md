# super-axios

## super-axios 基于 axios 封装了断线重连，防抖提交，节流请求，以及自动取消接口功能具体使用方式请看案例：

### reconnect 方法需要自己在业务逻辑response响应拦截器中使用

```ts
import SuperAxios from "super-axios"

const services = new SuperAxios({
    baseURL: "http://localhost:9000",
    timeout: 3000,
    withCredentials: false,
})

/**
 * 本插件把axios封装在了SuperAxios的axiosInstance属性下，保证了axios的无污染
 * type = "default" | "delay" | "block" | "kill"
 * delay 这个参数将会使请求延时发起，如果有相同请求会覆盖，一般用于后台管理select组件远程搜索时使用
 * delayTime:300, 这个参数用于设置延时时间，默认为300ms
 * kill 一般用于tab切换不同类型是获取的列表数据，用于自动取消上一次还未返回数据的请求
 * block 这是防抖参数，在同一接口没有返回数据之前无法发起第二次请求，一般用于form提交时
 * 断线重连默认开启，不关闭
 */
export default service;

type LoginReq = { username: string, password: string }

type UserInfo = {
    username: string
    password: string
    avatar: string
    nickName: string
}

type AxiosError = {
    message: string
    code: number
    reason: string[]
}
/**
 * 案例一 防抖提交
 * @param username
 * @param password
 * @returns Promise<data>
 */
const login = (username, password): Promise<UserInfo> =>
    services.dispatch<LoginReq, UserInfo>({
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
const userList = (pageSize, pageNum): Promise<UserInfo[]> =>
    services.dispatch<LoginReq, UserInfo>({
        params: {pageSize: 1, pageNum: 10},
        url: "/users/list",
        method: "get",
        type: "kill"
    });
/**
 * 案例三：节流请求，用于模糊查询搜索接口时后置接口覆盖前置接口
 * @param key
 */
const search = (key): Promise<UserInfo[]> =>
    services.dispatch<LoginReq, UserInfo>({
        params: {pageSize: 1, pageNum: 10},
        url: "/users/list",
        method: "get",
        type: "delay",
        delayTime: 500,// 默认为 300ms，可在特定接口覆盖默认参数
    });
```

#### 欢迎大家提问或提出 bug，共同维护这个仓库

#### 作者联系方式 wechat:Irm950215 qq:2890815038
