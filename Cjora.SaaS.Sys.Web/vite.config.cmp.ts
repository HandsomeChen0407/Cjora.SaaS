import originConfig from "./vite.config";
import { defineConfig, mergeConfig } from "vite";
import * as swc from "@swc/core";

const htmlString = process.env.PIXSO_D2C_REACT_HTML;
const mainString = process.env.PIXSO_D2C_REACT_MAIN;
const cmpName = process.env.PIXSO_D2C_REACT_CMP_NAME;

console.log("cmpName", cmpName);

export default defineConfig(
  mergeConfig(
    // @ts-ignore
    typeof originConfig === "function" ? originConfig({}) : originConfig,
    {
      root: ".",
      base: `/${cmpName}/`,
      plugins: [
        // {
        //   name: "component-mark",
        //   enforce: "pre",
        //   transform(code, id) {
        //     if (id.match(`${cmpName}.tsx`)) {
        //       let transformed = code;

        //       transformed = transformed.replace(
        //         /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?return\s*\([\s\r\n]*<(\w+)/s,
        //         (m) =>
        //           m.replace(
        //             /return\s*\([\s\r\n]*<(\w+)/s,
        //             `return (<$1 data-component="${cmpName}"`
        //           )
        //       );

        //       transformed = transformed.replace(
        //         /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[\s\S]*?return\s*\([\s\r\n]*<(\w+)/s,
        //         (m) =>
        //           m.replace(
        //             /return\s*\([\s\r\n]*<(\w+)/s,
        //             `return (<$1 data-component="${cmpName}"`
        //           )
        //       );

        //       transformed = transformed.replace(
        //         /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\([\s\r\n]*<(\w+)/s,
        //         `const $1 = () => (<$2 data-component="${cmpName}"`
        //       );

        //       transformed = transformed.replace(
        //         /return\s*\([\s\r\n]*<>\s*/s,
        //         `return (<div data-component="${cmpName}" data-fragment="true">`
        //       );

        //       return transformed;
        //     }
        //   },
        // },
        // {
        //   name: "react-ast-transform-swc",
        //   enforce: "pre",
        //   async transform(code, id) {
        //     if (
        //       !id.endsWith(`${cmpName}.tsx`) &&
        //       !id.endsWith(`${cmpName}.jsx`)
        //     )
        //       return;

        //     const ast = await swc.parse(code, {
        //       syntax: "typescript",
        //       tsx: true,
        //       target: "esnext",
        //       comments: false,
        //     });
        //     console.log("抽象语法树", ast);

        //     // function traverse(node: any, parent: any = null) {
        //     //   if (!node || typeof node !== "object") return;

        //     //   if (
        //     //     node.type === "JSXOpeningElement" &&
        //     //     node.name.type === "Identifier" &&
        //     //     node.name.value === "div"
        //     //   ) {
        //     //     node.attributes.push({
        //     //       type: "KeyValueAttribute",
        //     //       key: { type: "Identifier", value: "data-injected" },
        //     //       value: { type: "StringLiteral", value: "true" },
        //     //     });
        //     //   }

        //     //   // 深度遍历所有属性
        //     //   for (const key in node) {
        //     //     const child = (node as any)[key];
        //     //     if (Array.isArray(child))
        //     //       child.forEach((c) => traverse(c, node));
        //     //     else traverse(child, node);
        //     //   }
        //     // }

        //     // traverse(ast);

        //     // const { code: outCode } = await swc.print(ast, {
        //     //   minify: false,
        //     // });

        //     return {
        //       code: code,
        //       map: null,
        //     };
        //   },
        // },
        // {
        //   name: "inject-cmp-slot-markers",
        //   enforce: "pre",
        //   async transform(code, id) {
        //     if (
        //       !id.endsWith(`${cmpName}.tsx`) &&
        //       !id.endsWith(`${cmpName}.jsx`)
        //     )
        //       return;

        //     const ast = await swc.parse(code, {
        //       syntax: "typescript",
        //       tsx: true,
        //       target: "esnext",
        //     });

        //     let currentComponentName: string | null = null;

        //     // 递归工具
        //     function traverse(node: any, parent: any = null) {
        //       if (!node || typeof node !== "object") return;

        //       // 1️⃣ 找出组件名
        //       if (
        //         node.type === "VariableDeclarator" &&
        //         node.id?.type === "Identifier" &&
        //         node.init?.type === "ArrowFunctionExpression"
        //       ) {
        //         currentComponentName = node.id.value;
        //       }

        //       // 2️⃣ 找出最外层 JSXElement
        //       if (
        //         node.type === "ReturnStatement" &&
        //         node.argument?.type === "JSXElement"
        //       ) {
        //         const root = node.argument.opening;
        //         if (root?.type === "JSXOpeningElement") {
        //           // 给顶层 <div> 加 data-cmp
        //           const tagName =
        //             root.name.type === "Identifier" ? root.name.value : null;
        //           if (tagName === "div" && currentComponentName) {
        //             root.attributes.push({
        //               type: "KeyValueAttribute",
        //               key: { type: "Identifier", value: "data-cmp" },
        //               value: {
        //                 type: "StringLiteral",
        //                 value: currentComponentName,
        //               },
        //             });
        //           }
        //         }
        //       }

        //       // 3️⃣ 找出包含 {children} 的 JSX 元素并给它打 data-type="slot"
        //       if (node.type === "JSXElement") {
        //         for (const child of node.children || []) {
        //           if (
        //             child.type === "JSXExpressionContainer" &&
        //             child.expression.type === "Identifier" &&
        //             child.expression.value === "children"
        //           ) {
        //             const opening = node.opening;
        //             if (opening?.type === "JSXOpeningElement") {
        //               const alreadyHas = opening.attributes.some(
        //                 (attr: any) =>
        //                   attr.type === "KeyValueAttribute" &&
        //                   attr.key.value === "data-type"
        //               );
        //               if (!alreadyHas) {
        //                 opening.attributes.push({
        //                   type: "KeyValueAttribute",
        //                   key: { type: "Identifier", value: "data-type" },
        //                   value: { type: "StringLiteral", value: "slot" },
        //                 });
        //               }
        //             }
        //           }
        //         }
        //       }

        //       // 递归子节点
        //       for (const key in node) {
        //         const child = (node as any)[key];
        //         if (Array.isArray(child))
        //           child.forEach((c) => traverse(c, node));
        //         else traverse(child, node);
        //       }
        //     }

        //     traverse(ast);

        //     const { code: outCode } = await swc.print(ast, { minify: false });

        //     console.log("转换后的代码", outCode);
        //     return { code: outCode, map: null };
        //   },
        // },
        {
          name: "virtual-file-system",
          resolveId(id) {
            if (id === "index.html") return id;
            if (id.match("main.tsx")) return id;
          },
          load(id) {
            if (id === "index.html") return htmlString;
            if (id.match("main.tsx")) return mainString;
          },
        },
      ],
      build: {
        outDir: `dist/${cmpName}`,
        emptyOutDir: false,
        rollupOptions: {
          input: {
            main: "index.html",
          },
        },
      },
    }
  )
);
