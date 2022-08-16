"use strict";
exports.__esModule = true;
var axios_1 = require("axios");
var cancelToken = axios_1["default"].CancelToken;
var SuperAxios = /** @class */ (function () {
    function SuperAxios(config) {
        this.waitingTime = 1000; // 重连等待时间,默认1000
        this.maxReconnectTimes = 5; // 最大重连次数,默认为5次
        this.delayTime = 300; // 延迟毫秒数，默认为300毫秒
        this.axiosInstance = axios_1["default"].create(config);
        var _a = config.queue, queue = _a === void 0 ? new Map() : _a, _b = config.waitingTime, waitingTime = _b === void 0 ? 1000 : _b, _c = config.maxReconnectTimes, maxReconnectTimes = _c === void 0 ? 5 : _c, _d = config.delayTime, delayTime = _d === void 0 ? 300 : _d, _e = config.reconnectTime, reconnectTime = _e === void 0 ? 1500 : _e;
        this.queue = queue;
        this.waitingTime = waitingTime;
        this.maxReconnectTimes = maxReconnectTimes;
        this.delayTime = delayTime;
        this.reconnectTime = reconnectTime;
    }
    /***
     * 重连请求
     * @param r
     */
    SuperAxios.prototype.reconnect = function (r) {
        var _this = this;
        var Reconnection = new Promise(function (resolve) {
            setTimeout(function () {
                resolve();
            }, _this.reconnectTime);
        });
        return Reconnection.then(function () {
            return _this.axiosInstance(r);
        });
    };
    /***
     * http请求最终执行方法
     * @param r:RequestConfig
     * @return AxiosPromise<R>
     * @private
     */
    SuperAxios.prototype.dispatch = function (r) {
        switch (r.type) {
            case "block":
                return this.block(r);
            case "delay":
                return this.delay(r);
            case "kill":
                return this.cancel(r);
            default:
                return this.axiosInstance(r);
        }
    };
    /***
     * 堵塞当前请求
     * @param r
     * @private
     */
    SuperAxios.prototype.block = function (r) {
        var _this = this;
        var hashcode = this.getHashCode(r);
        if (!this.checkRequestExists(hashcode)) {
            this.queue.set(hashcode, r);
        }
        var self = this;
        return new Promise((function (resolve, reject) {
            _this.axiosInstance(r).then(function (res) {
                var hashcode = self.getHashCode(r);
                self.queue["delete"](hashcode);
                resolve(res);
            })["catch"](function (err) {
                reject(err);
            });
        }));
    };
    /***
     * 检测是否有存在相同请求
     * @param hashCode
     * @private
     */
    SuperAxios.prototype.checkRequestExists = function (hashCode) {
        return this.queue.has(hashCode);
    };
    /***
     *  处理可取消请求
     * @param r
     * @return RequestConfig
     */
    SuperAxios.prototype.cancel = function (r) {
        var _this = this;
        var _a;
        var hashcode = this.getHashCode(r);
        if (this.checkRequestExists(hashcode)) {
            (_a = this.queue.get(hashcode)) === null || _a === void 0 ? void 0 : _a.cancelHandle("取消上一次相同请求");
            this.queue["delete"](hashcode);
        }
        r.cancelToken = new cancelToken(function (c) {
            r.cancelHandle = c;
        });
        this.queue.set(hashcode, r);
        var self = this;
        return new Promise((function (resolve, reject) {
            _this.axiosInstance(r).then(function (res) {
                var hashcode = self.getHashCode(r);
                self.queue["delete"](hashcode);
                resolve(res);
            })["catch"](function (err) {
                reject(err);
            });
        }));
    };
    /***
     * 节流请求
     * @param r
     */
    SuperAxios.prototype.delay = function (r) {
        var _this = this;
        this.Timer && clearTimeout(this.Timer);
        var Reconnection = new Promise(function (resolve) {
            _this.Timer = setTimeout(function () {
                resolve();
            }, r.delayTime || _this.delayTime);
        });
        return Reconnection.then(function () {
            return _this.axiosInstance(r);
        });
    };
    /***
     * 通过请求参数及请求方法生成唯一标识
     * @param r
     */
    SuperAxios.prototype.getHashCode = function (r) {
        var url = r.url, method = r.method;
        var obj = {
            url: url,
            method: method
        };
        var str = JSON.stringify(obj);
        var hash = 0, i, chr, len;
        if (str.length === 0)
            return hash;
        for (i = 0, len = str.length; i < len; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };
    return SuperAxios;
}());
exports["default"] = SuperAxios;
