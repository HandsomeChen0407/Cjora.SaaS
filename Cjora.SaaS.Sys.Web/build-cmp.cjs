"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// utils.ts
var import_promises = require("fs/promises");
var import_path = require("path");
var import_node_path = __toESM(require("path"));
var routePatterns = [
  /<Route[^>]*\spath=["']([^"']+)["']/g,
  // <Route path="/xxx">
  /navigate\(\s*["']([^"']+)["']/g,
  // navigate("/xxx")
  /path\s*:\s*["']([^"']+)["']/g
  // path: "/xxx"
];
var ignoreDirs = /* @__PURE__ */ new Set([
  "node_modules",
  "dist",
  "build",
  ".vite",
  "__tests__",
  "test",
  "temp"
]);
var exts = /* @__PURE__ */ new Set([".tsx", ".ts", ".jsx", ".js"]);
async function readAllFiles(dir, result = []) {
  const entries = await (0, import_promises.readdir)(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = (0, import_path.join)(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        await readAllFiles(fullPath, result);
      }
    } else if (entry.isFile()) {
      const ext = import_node_path.default.extname(entry.name);
      if (exts.has(ext)) {
        result.push(fullPath);
      }
    }
  }
  return result;
}
async function extractRoutes(projectRoot) {
  const files = await readAllFiles(projectRoot);
  const routes = /* @__PURE__ */ new Set();
  for (const file of files) {
    const code = await (0, import_promises.readFile)(file, "utf8");
    for (const pattern of routePatterns) {
      for (const match of code.matchAll(pattern)) {
        const pathStr = match[1];
        if (pathStr == null ? void 0 : pathStr.startsWith("/")) {
          routes.add(pathStr);
        }
      }
    }
  }
  return Array.from(routes);
}
async function extractCmps() {
  const componentsDir = import_node_path.default.resolve(__dirname, "src/components");
  const componentFiles = await (0, import_promises.readdir)(componentsDir, {
    withFileTypes: true
  });
  const components = componentFiles.filter(
    (entry) => entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx"))
  ).map((entry) => ({
    name: import_node_path.default.basename(entry.name, import_node_path.default.extname(entry.name)),
    src: `src/components/${entry.name}`
  }));
  return components;
}
var getConfig = async () => {
  try {
    return require("./config.json");
  } catch (e) {
    console.log("\u4E0D\u5B58\u5728\u914D\u7F6E\u6587\u4EF6\uFF0C\u5219\u964D\u7EA7", e);
    const [routes, components] = await Promise.all([
      // 路由分析
      extractRoutes(import_node_path.default.resolve(__dirname, ".")),
      // 只提取 src/components 目录下首层组件（.tsx/.jsx）
      extractCmps()
    ]);
    const config = {
      routes: routes.map((r) => {
        return {
          path: r,
          src: ""
        };
      }),
      components
    };
    await (0, import_promises.writeFile)(
      import_node_path.default.resolve(__dirname, "./config.json"),
      JSON.stringify(config, null, 2),
      "utf8"
    );
    return config;
  }
};
var buildConfig = () => {
  try {
    (0, import_promises.copyFile)(
      import_node_path.default.resolve(__dirname, "./config.json"),
      import_node_path.default.resolve(__dirname, "./dist/config.json")
    );
  } catch (e) {
    console.log("\u6784\u5EFA\u914D\u7F6E\u6587\u4EF6\u5931\u8D25", e);
  }
};
var updateConfig = async (config) => {
  try {
    await (0, import_promises.writeFile)(
      import_node_path.default.resolve(__dirname, "./config.json"),
      JSON.stringify(config, null, 2),
      "utf8"
    );
  } catch (e) {
    console.log("\u66F4\u65B0\u914D\u7F6E\u6587\u4EF6\u5931\u8D25", e);
  }
};

// build-cmp.js
var import_node_child_process = require("child_process");
var fs = require("fs");
var path2 = require("path");
var pkg = JSON.parse(
  fs.readFileSync(path2.resolve(__dirname, "./package.json"), "utf-8")
);
var routerPkg = Object.keys(pkg.dependencies).find((i) => i.match("router"));
var htmlString = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PageHeader</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
var normalMainString = `
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Cmp from '{{cmpPath}}'
import "./index.css";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Cmp />
  </StrictMode>,
)
`;
var routeMainString = `
import { ${routerPkg === "react-router-dom" ? "BrowserRouter as StaticRouter" : "StaticRouter"} } from "${routerPkg}";
import { createRoot } from 'react-dom/client'
import Cmp from '{{cmpPath}}'
import "./index.css";

createRoot(document.getElementById('root')!).render(
  <StaticRouter location="/">
    <Cmp />
  </StaticRouter>
)
`;
var mainString = routerPkg ? routeMainString : normalMainString;
process.env.PIXSO_D2C_REACT_HTML = htmlString;
var buildCmp = async (config) => {
  const flat = config.components.map((i) => {
    i.path = i.src.replace("src", ".");
    return i;
  });
  let modified = false;
  for (const i of flat) {
    const cmpPath = i.path.replace("src", ".");
    const ms = mainString.replace("{{cmpPath}}", cmpPath);
    process.env.PIXSO_D2C_REACT_MAIN = ms;
    process.env.PIXSO_D2C_REACT_CMP_NAME = i.name;
    try {
      (0, import_node_child_process.execSync)(
        "node --max-semi-space-size=32 --max-old-space-size=1300 ./node_modules/vite/bin/vite.js build --config vite.config.cmp.ts",
        {
          stdio: "inherit",
          // 将构建日志输出到主终端
          env: { ...process.env }
          // 继承当前环境变量
        }
      );
    } catch (e) {
      console.log(`\u6784\u5EFA\u7EC4\u4EF6 ${i.name} \u5931\u8D25`, e);
      config.components = config.components.filter((j) => j.name !== i.name);
      modified = true;
    }
  }
  if (modified) {
    await updateConfig(config);
  }
  return config;
};
var build = async () => {
  let config = await getConfig();
  if (!config || !config.components || config.components.length === 0) {
    console.log("\u65E0\u7EC4\u4EF6\u914D\u7F6E\uFF0C\u9000\u51FA\u6784\u5EFA");
    return buildConfig();
  }
  console.log("\u5F00\u59CB\u6784\u5EFA\u7EC4\u4EF6");
  await buildCmp(config);
  console.log("\u7EC4\u4EF6\u6784\u5EFA\u5B8C\u6210");
  buildConfig();
};
if (require.main === module) {
  build();
}
