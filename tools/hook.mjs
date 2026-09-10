/**
 * Node 解析钩子：把「省略扩展名」的导入解析到 .ts 文件。
 *
 * 这样核心代码可以用 Cocos Creator 习惯的写法 `import { Game } from './engine'`，
 * 同时又能直接在 Node 里跑测试。
 */

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) {
    try {
      return await next(`${specifier}.ts`, context)
    } catch {
      // 落到默认解析
    }
  }
  return next(specifier, context)
}
