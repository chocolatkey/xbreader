/* global require __dirname module */

const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const I18nPlugin = require("i18n-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const FixStyleOnlyEntriesPlugin = require("webpack-fix-style-only-entries"); // Will be unecessary in Webpack 5, apparently
const webpack = require("webpack");
const consts = require("./consts");
const languages = {
    en: null,
    ja: require("./i18n/ja.js"),
    de: require("./i18n/de.json"),
    fr: require("./i18n/fr.json")
};

const stringifiedConstants = Object.assign({}, consts);
Object.keys(stringifiedConstants).forEach((c) => {
    stringifiedConstants[c] = JSON.stringify(stringifiedConstants[c]);
});

module.exports = Object.keys(languages).map((language) => {
    return {
        entry: {
            xbstyles: [
                "./src/css/styles.scss"
            ],
            xbreader: [
                "./src/js/index.js",
            ],
            loader: [
                "./src/js/loader.js"
            ],
        },
        name: language,
        output: {
            path: path.resolve(__dirname, "./dist"),
            filename: `[name]-${language}.js`,
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
            new CleanWebpackPlugin(["dist/*.js", "dist/*.css"], {
                verbose: false
            }),
            new HtmlWebpackPlugin({
                title: "XBReader",
                template: "src/index.html",
                minify: true,
                filename: `index-${language}.html`,
                favicon: "src/favicon.ico",
                excludeChunks: ["xbreader"],
                extra: {
                    v: consts.__VERSION__,
                    dsn: consts.__DSN__,
                    ua: consts.__GA_UA__
                }
            }),
            new I18nPlugin(languages[language]),
            new FixStyleOnlyEntriesPlugin(),
            new MiniCssExtractPlugin({
                filename: `[name]-${consts.__VERSION__}.css`,
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
            new webpack.DefinePlugin(stringifiedConstants)
        ]
    };
});