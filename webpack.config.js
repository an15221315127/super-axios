const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const UglifyJsPlugin = require("uglifyjs-webpack-plugin")
const config = {
    entry: {
        'index': [path.resolve("src/main.ts")],
        'index.min': [path.resolve("src/main.ts")]
    },
    mode: "production",
    module: {
        rules: [
            {
                test: /\.js$/,
                use: [{
                    loader: "babel-loader",
                }],
                exclude: /node_modules/,
            },
            {
                loader: "ts-loader",
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'lib'),
        library: "super-axios",
        libraryTarget: 'umd',
        umdNamedDefine: true,
    },
    optimization: {
        minimize: true,
        minimizer: [
            new UglifyJsPlugin({
                include: /\.min\.js$/i
            }),

        ],
        splitChunks: false,
        runtimeChunk: false
    },
    plugins: [new CleanWebpackPlugin()]
};

module.exports = config;
