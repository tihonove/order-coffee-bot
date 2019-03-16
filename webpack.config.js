const path = require("path");
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    optimization: {
        minimize: false,
    },
    target: "node",
    entry: {
        index: "./src/index",
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "babel-loader",
                include: path.join(__dirname, "src"),
            },
        ],
    },
    output: {
        path: path.resolve(__dirname, "dist"),
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    plugins: [
        new CopyPlugin([
            { from: './src/settings.json', to: 'settings.json' },
        ]),
    ],
    node: {
        __dirname: false,
        __filename: false,
    }
};
