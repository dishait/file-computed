<div align="center">
    <img width="100%" height="100%" src="./file-computed.gif" />
    <h1>file-computed</h1>
    <p>文件型计算属性，当且仅当文件内容发生变化时才重新做计算</p>
</div>

<br />

## 动机 

有时候我们的计算在特定目标文件不变时结果是一样的，当计算特别耗时复杂时可以通过本地文件缓存的方式快速得到原先的结果，而不需要每一次都进行该计算，以此提高运算效率。

<br />
<br />

## 使用

### 安装

```shell
pnpm i file-computed
```

<br />

### 基础

```ts
import { createFsComputed } from 'file-computed'

const fsComputed = createFsComputed()

const result = await fsComputed('package.json', () => {
    /** 模拟复杂计算，只会跑一次，后边会直接获取缓存中的结果 */
    let n = 0
    let t = 10000
    while (t--) {
        n++
    }
    return n
})

result // 10000
```

<br />

### 缓存路径

```ts
import { createFsComputed } from 'file-computed'

const fsComputed = createFsComputed({
    cachePath: 'temp' // 默认为最近 node_modules 的 .file-computed
})
```


<br />
<br />

## License

Made with [markthree](https://github.com/markthree)

Published under [MIT License](./LICENSE).


<br />