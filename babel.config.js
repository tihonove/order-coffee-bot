module.exports = {
    presets: [
        [
            "@babel/env",
            {
                targets: {
                    node: "10",
                },
            },
        ],
        "@babel/typescript",
    ],
    plugins: [
        ["@babel/proposal-decorators", { legacy: true }],
        ["@babel/proposal-class-properties", { loose: true }],
        ["@babel/proposal-object-rest-spread"],
    ],
};
