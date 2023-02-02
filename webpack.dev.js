const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const WebpackBar = require("webpackbar");
const webpack = require("webpack");
const consts = require("./consts");

const stringifiedConstants = Object.assign({}, consts);
Object.keys(stringifiedConstants).forEach((c) => {
    stringifiedConstants[c] = JSON.stringify(stringifiedConstants[c]);
});

module.exports = {
    mode: "development",
    devServer: {
        static: path.join(__dirname, "bin"),
        compress: true,
        port: 8080,
        //hot: true,
        //noInfo: true,
        //disableHostCheck: true,
    },
    infrastructureLogging: {
        level: "warn"
    },
    entry: {
        xbstyles: "./src/css/styles.scss",
        xbreader: "./src/app/index.ts",
        loader: "./src/app/loader.js"
    },
    output: {
        path: path.resolve(__dirname, "./bin"),
        publicPath: "/",
        filename: "[name].js"
    },
    module: {
        rules: [{
            test: /\.tsx?$/,
            exclude: /node_modules/,
            loader: "ts-loader"
        }, {
            test: /\.js$/,
            exclude: /node_modules/,
            loader: "babel-loader"
        },
        {
            test: /\.mjs$/,
            include: /node_modules/,
            type: "javascript/auto"
        },
        {
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
                        sassOptions: {
                            includePaths: [
                                "./src/css",
                                "./node_modules"
                            ]
                        }
                    }
                }
            ]
        }]
    },
    resolve: {
        extensions: [ ".tsx", ".ts", ".js", ".jsx" ],
        alias: {
            "@r2-utils-js": "r2-utils-js/dist/es5/src",
            "@r2-lcp-js": "r2-lcp-js/dist/es5/src",
            "@r2-opds-js": "r2-opds-js/dist/es5/src",
            "@r2-shared-js": "r2-shared-js/dist/es5/src",
            "@r2-streamer-js": "r2-streamer-js/dist/es5/src",
            "@r2-navigator-js": "r2-navigator-js/dist/es5/src",
            "xbreader": path.resolve(__dirname, "src/app/")
        },
        fallback: {
            "util": require.resolve("util/")
        }
    },
    target: "web",
    plugins: [
        new WebpackBar({
            name: "XBReader"
        }),
        new HtmlWebpackPlugin({
            title: "XBReader",
            template: "src/index.html",
            favicon: "src/favicon.ico",
            excludeChunks: ["xbreader"],
            extra: {
                v: consts.__VERSION__
            }
        }),
        new MiniCssExtractPlugin({
            filename: "[name].css"
        }),
        new webpack.DefinePlugin(stringifiedConstants),
        new webpack.DefinePlugin({
            "process.env.NODE_DEBUG": JSON.stringify(process.env.NODE_DEBUG)
        })
    ]
};
