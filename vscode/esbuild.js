const {build} = require("esbuild");
const baseConfig = {
    bundle: true,
    loader: { ".node": "file" },
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV !== "production"
};

const extensionConfig = {
    ...baseConfig,
    platform: "node",
    format: "cjs",
    entryPoints: ["./src/extension.ts"],
    outfile: "./out/extension.js",
    external: ["vscode"],
};

const watchConfig = {
    watch: {
        onRebuild(error, result) {
            console.log("[watch] build started");
            if(error) {
                error.errors.forEach(error => console.error(`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`));
            } else {
                console.log("[watch] build finished");
            }
        },
    },
};

const webviewConfig = {
    ...baseConfig,
    target: "es2020",
    format: "esm",
    entryPoints: ["./src/webview/script.ts"],
    outfile: "./out/webview.js",
};

const webviewCompareConfig = {
    ...baseConfig,
    target: "es2020",
    format: "esm",
    entryPoints: ["./src/webview/compare.ts"],
    outfile: "./out/webview-compare.js",
};

(async () => {
    const args = process.argv.slice(2);
    try {
        if(args.includes("--watch")) {
            console.log("[watch] build started");
            await build({
                ...extensionConfig,
                ...watchConfig,
            });
            console.log("[watch] build finished");
        } else {
            await build(extensionConfig);
            await build(webviewConfig);
            await build(webviewCompareConfig);
            console.log("build complete");
        }
    } catch(err) {
        process.stderr.write(err.stderr);
        process.exit(1);
    }
})();