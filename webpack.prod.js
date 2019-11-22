const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TtagWebpackPlugin = require("ttag-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const FixStyleOnlyEntriesPlugin = require("webpack-fix-style-only-entries"); // Will be unecessary in Webpack 5, apparently
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const WebpackBar = require("webpackbar");
const TerserPlugin = require("terser-webpack-plugin");
const webpack = require("webpack");
const consts = require("./consts");

const stringifiedConstants = Object.assign({}, consts);
Object.keys(stringifiedConstants).forEach((c) => {
    stringifiedConstants[c] = JSON.stringify(stringifiedConstants[c]);
});

module.exports = {
    entry: {
        xbstyles: [
            "./src/css/styles.scss"
        ],
        xbreader: [
            "./src/app/index.ts"
        ],
        loader: [
            "./src/app/loader.js"
        ]
    },
    devtool: "source-map",
    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "[name].js"
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
                }
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
            "xbreader": path.resolve(__dirname, "src/app/"),
            "ttag": "ttag/dist/mock"
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
        new WebpackBar({
            name: "XBReader"
        }),
        new webpack.DefinePlugin(stringifiedConstants),
        new MiniCssExtractPlugin({
            filename: "[name].css"
        }),
        new FixStyleOnlyEntriesPlugin({
            silent: true
        }),
        new HtmlWebpackPlugin({
            title: "XBReader",
            template: "src/index.html",
            minify: {
                collapseWhitespace: true
            },
            filename: "index.html",
            favicon: "src/favicon.ico",
            excludeChunks: [ // TODO https://github.com/jamesjieye/html-webpack-exclude-assets-plugin
                "xbreader-ja",
                "xbreader-de",
                "xbreader-fr",
                "xbreader",
                "xbstyles-ja",
                "xbstyles-de",
                "xbstyles-fr",
                "loader-ja",
                "loader-de",
                "loader-fr"
            ],
            extra: {
                v: consts.__VERSION__,
                dsn: consts.__DSN__,
                ua: consts.__GA_UA__
            }
        }),
        new TtagWebpackPlugin({
            filename: "[name].js",
            chunkFilename: "[id].js",
            translations: {
                de: path.resolve(__dirname, "./i18n/de.po"),
                fr: path.resolve(__dirname, "./i18n/fr.po"),
                ja: path.resolve(__dirname, "./i18n/ja.po")
            }
        })
    ].concat(
        process.argv.includes("--analyze") 
            ? [new BundleAnalyzerPlugin({
                analyzerMode: "static",
                defaultSizes: "gzip",
                generateStatsFile: true,
                openAnalyzer: false,
                reportFilename: path.resolve(__dirname, "stats/xbreader.html"),
                statsFilename: path.resolve(__dirname, "stats/xbreader.json")
            })]
            : [] 
    ),
    optimization: {
        minimizer: [
            new TerserPlugin({
                sourceMap: true,
                terserOptions: {
                    output: {
                        comments: false
                    }
                }
            })
        ]
    }
};