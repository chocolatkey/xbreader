/* global require __dirname module */
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const I18nPlugin = require("i18n-webpack-plugin");
const webpack = require("webpack");
const consts = require("./consts");

module.exports = [{
    entry: {
        xbreader: [
            "./src/js/index.js",
            "./src/css/styles.scss"
        ]
    },
    output: {
        path: path.resolve(__dirname, "./bin"),
        filename: "[name]-en.js", // TODO [hash]?
    },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: "babel-loader"
        }, {
            test: /\.(s*)css$/,
            use: [
                MiniCssExtractPlugin.loader,
                {
                    loader: "css-loader",
                    options: {
                        sourceMap: true
                    }
                },
                {
                    loader: "sass-loader",
                    options: {
                        sourceMap: true,
                        includePaths: [
                            "./src/css",
                            "./node_modules"
                        ]
                    }
                },
            ]
        },
        {
            test: /\.(png|woff|woff2|eot|ttf|svg)$/,
            loader: "file-loader",
            options: {
                name: "[name]-[hash].[ext]"
            }
        }]
    },
    plugins: [
        new I18nPlugin(null),
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            // TODO prod
            //filename: "[name]-[hash].css",
            //chunkFilename: "[id].css"
        }),
        new webpack.DefinePlugin(consts)
    ]
}, {
    entry: {
        loader: [
            "./src/js/loader.js"
        ]
    },
    output: {
        path: path.resolve(__dirname, "./bin"),
        filename: "[name].js", // TODO [hash]?
    },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            loader: "babel-loader"
        }]
    },
    plugins: [
        new webpack.DefinePlugin(consts)
    ]
}];