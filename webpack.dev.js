/* global require __dirname module */
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const I18nPlugin = require("i18n-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const FixStyleOnlyEntriesPlugin = require("webpack-fix-style-only-entries"); // Will be unecessary in Webpack 5, apparently
const webpack = require("webpack");
const consts = require("./consts");

const stringifiedConstants = Object.assign({}, consts);
Object.keys(stringifiedConstants).forEach((c) => {
    stringifiedConstants[c] = JSON.stringify(stringifiedConstants[c]);
});

module.exports = {
    devServer: {
        contentBase: path.join(__dirname, "bin"),
        compress: true,
        port: 8080
    },
    entry: {
        xbstyles: [
            "./src/css/styles.scss"
        ],
        xbreader: [
            "./src/js/index.js",
        ],
        loader: [
            "./src/js/loader.js"
        ]
    },
    output: {
        path: path.resolve(__dirname, "./bin"),
        filename: "[name]-en.js",
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
        new CleanWebpackPlugin(["bin/*.js", "bin/*.css"], {
            verbose: false
        }),
        new HtmlWebpackPlugin({
            title: "XBReader",
            template: "src/index.html",
            favicon: "src/favicon.ico",
            excludeChunks: ["xbreader"],
            extra: {
                v: consts.__VERSION__,
                dsn: false,
                ua: false
            }
        }),
        new I18nPlugin(null),
        new FixStyleOnlyEntriesPlugin(),
        new MiniCssExtractPlugin({
            filename: "[name].css",
        }),
        new webpack.DefinePlugin(stringifiedConstants)
    ]
};