const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

const config = {
    entry: './src/index.ts',
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'lib'),
        library: 'demo', // 以库的形式导出入口文件
        libraryTarget: 'umd' // 以库的形式导出入口文件时，输出的类型,这里是通过umd的方式来暴露library,适用于使用方import的方式导入npm包
    },
    optimization: {
        minimize: true
    },
    plugins: [new CleanWebpackPlugin()]
};

module.exports = config;
