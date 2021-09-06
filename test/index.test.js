import AxiosManager from "../lib/index";



const service = new AxiosManager({
    baseURL:"https://admin.kunzhiyu.cn:8000/api/v1"
})


service.get("/base/regions").then(res=>{
    console.log(res,'---')
})
