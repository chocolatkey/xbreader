/* global require __dirname module */

const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const I18nPlugin = require("i18n-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const FixStyleOnlyEntriesPlugin = require("webpack-fix-style-only-entries"); // Will be unecessary in Webpack 5, apparently
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
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
                "./src/app/index.ts",
            ],
            loader: [
                "./src/app/loader.js"
            ],
        },
        name: language,
        devtool: "source-map",
        output: {
            path: path.resolve(__dirname, "./dist"),
            filename: `[name]-${language}.js`,
        },
        module: {
            rules: [{
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loader: ["babel-loader", {loader: "ts-loader", options: {transpileOnly: true}}]
            }, {
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
                test: /\.(jpg|webp|ico|tiff|bmp|png|woff|woff2|eot|ttf|svg)$/,
                loader: "file-loader",
                options: {
                    name: "[name]-[hash].[ext]"
                }
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
            }
        },
        target: "web",
        node: {
            Buffer: false, // Fixes inclusion of useless Buffer polyfill needed by ta-json-x. The buffer loader is NEVER used
            process: false,
            setImmediate: false,
            global: false
        },
        plugins: [
            new HtmlWebpackPlugin({
                title: "XBReader",
                template: "src/index.html",
                minify: {
                    collapseWhitespace: true,
  
                },
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
            new MiniCssExtractPlugin({
                filename: "[name].css",
            }),
            new FixStyleOnlyEntriesPlugin(),
            new webpack.DefinePlugin(stringifiedConstants),
            new BundleAnalyzerPlugin({
                analyzerMode: "static",
                defaultSizes: "gzip",
                generateStatsFile: true,
                openAnalyzer: false,
                reportFilename: path.resolve(__dirname, `stats/xbreader-${language}.html`),
                statsFilename: path.resolve(__dirname, `stats/xbreader-${language}.json`)
            })
        ]
    };
});