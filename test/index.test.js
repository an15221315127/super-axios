

const AxiosManager = require("../lib/super-axios.js")

const service = new AxiosManager({
    baseURL: "https://admin.kunzhiyu.cn:8000/api/v1"
}, {
    request(config) {

        return config
    },
    response(res) {

        return res
    }
})


service.get("/base/regions", {}).then(res => {
    console.log(res, '---')
})
