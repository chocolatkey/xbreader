/* global require __dirname module */

const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const I18nPlugin = require("i18n-webpack-plugin");
const webpack = require("webpack");
const pkg = require("./package.json");
const languages = {
    en: null,
    ja: require("./i18n/ja.js"),
    de: require("./i18n/de.json"),
    fr: require("./i18n/fr.json")
};

let exp = Object.keys(languages).map((language) => {
    return {
        entry: {
            xbreader: [
                "./src/js/index.js",
                "./src/css/styles.scss"
            ],
            loader: [
                "./src/js/loader.js"
            ]
        },
        name: language,
        output: {
            path: path.resolve(__dirname, "./bin"),
            filename: `[name]-${language}.js`, // TODO [hash]?
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
            new I18nPlugin(languages[language]),
            new MiniCssExtractPlugin({
                // Options similar to the same options in webpackOptions.output
                // both options are optional
                // TODO prod
                //filename: "[name]-[hash].css",
                //chunkFilename: "[id].css"
            }),
            new UglifyJsPlugin({
                parallel: true,
                uglifyOptions: {
                    toplevel: true,
                    mangle: {
                        toplevel: true,
                    }
                }
            }),
            new webpack.DefinePlugin({
                __VERSION__: JSON.stringify(pkg.version),
                __NAME__: JSON.stringify(pkg.name),
                __DEV__: false
            })
        ]
    };
});

exp.push({
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
        new webpack.DefinePlugin({
            __VERSION__: JSON.stringify(pkg.version),
            __NAME__: JSON.stringify(pkg.name),
            __DEV__: false
        })
    ]
});

module.exports = exp;