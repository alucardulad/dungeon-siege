/**
 * 由 assets/scripts/ui/about.ts 生成仓库根目录的 ABOUT.md。
 *
 * 这样游戏里【关于】页面的文案和仓库里的说明文档永远一致：
 * 改文案只改 about.ts，然后跑 npm run about:md。
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const { ABOUT } = await import(pathToFileURL(resolve(root, 'assets/scripts/ui/about.ts')).href)

const markdown = `# ${ABOUT.title}

> ${ABOUT.subtitle}

${ABOUT.paragraphs.join('\n\n')}

## 开发者

- 作者：${ABOUT.developer}
- 邮箱：[${ABOUT.email}](mailto:${ABOUT.email})
- 反馈：欢迎提 issue，或者直接发邮件告诉我

## ${ABOUT.donateTitle}

${ABOUT.donateNote}

![${ABOUT.donateTitle}](docs/images/donate-qr-card.png)

（原海报保存在 \`docs/images/donate-qr.png\`；上面这张是它的裁剪版，去掉了四周空白，扫码更清楚。）

---

本页与游戏内【关于】页面同源，由 \`npm run about:md\` 从 \`assets/scripts/ui/about.ts\` 生成，请勿手改。
`

writeFileSync(resolve(root, 'ABOUT.md'), markdown, 'utf8')
console.log('已生成 ABOUT.md')
