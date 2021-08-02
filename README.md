# super-axios
## super-axios基于axios封装了断线重连，防抖提交，节流请求，以及自动取消接口功能具体使用方式请看案例：
```js
import AxiosManager from "super-axios";

/**
 * 本插件把axios封装在了AxiosManager的Http属性下，保证了axios的无污染
 * delay:true | false  这个参数设置为true以后将会使请求延时发起，如果有相同请求会覆盖，一般用于后台管理select组件远程搜索时使用，默认为false
 * delayTime:300, 这个参数用于设置延时时间，默认为300ms
 * needCancel:true | false 一般用于tab切换不同类型是获取的列表数据，用于自动取消上一次还未返回数据的请求 默认不开启
 * shake: true | false 这是防抖参数，在同一接口没有返回数据之前无法发起第二次请求，一般用于form提交时 默认不开启
 */
const Services = new AxiosManager({
    baseURL: "http://localhost:8000",
    headers: {},
    timeout: 10000,
}, {
    request(c) {
        // 请求拦截器，在这里可以做一些请求前的 处理 比如添加token
        // ...
        return c
    },
    response(res) {
        // 响应拦截器
        // ...
        return res
    }
})
/***
 *  这里需要注意的是重连时考虑到某些页面的接口可能是并发请求的，
 * 所以重连机制属于 检测到需要重连时开始重连执行一次，
 * 过程中将不再提供钩子方法，
 * 直到所有接口重连失败/或者所有接口重连成功时回调一次
 */


/**
 * 开始重连时回调方法
 */
AxiosManager.tryBegin = function () {

}
/**
 * 尝试重连成功时的回调方法，可在这里添加showToast
 */
AxiosManager.trySuccess = function () {

}
/**
 * 尝试重连失败时的回调方法，可在这里添加showToast
 */
AxiosManager.tryFail = function () {

}

/**
 * 案例一 防抖提交
 * @param username
 * @param password
 * @returns Promise<data>
 */
const login2 = (username, password) => Services.post("login", {username, password}, {shake: true})

/***
 * 案例二 自动取消， 用于tab切换过快时取消上一次未响应数据的接口
 * @param cate
 * @returns Promise<data>
 */
const tabList2 = (cate) => Services.get("tabList", {cate}, {
    needCancel: true, // 一般用于tab切换不同类型是获取的列表数据，用于自动取消上一次还未返回数据的请求})
})
/**
 * 案例三：节流请求，用于模糊查询搜索接口时后置接口覆盖前置接口
 * @param key
 */
const search = (key) => Services.get("search", {key}, {
    delay: true,// 这个参数设置为true以后将会使请求延时发起，如果有相同请求会覆盖，一般用于后台管理select组件远程搜索时使用
    delayTime: 300 // 延时时间
})

```
#### 欢迎大家提问或提出bug，共同维护这个仓库
#### 作者联系方式 wechat:Irm950215 qq:2890815038

