# Git风格合服可视化技术文档

## 1. 概述

### 1.1 目的
将游戏服务器合并（合服）关系以Git分支图风格可视化，清晰展示合并流向和时间顺序。

### 1.2 与泳道图的对比
| 特性 | 泳道图 (Tab1) | Git风格图 (Tab2) |
|------|--------------|-----------------|
| 布局方向 | 时间从左到右，服务器从上到下 | 分支从左到右，时间从上到下 |
| 合并表达 | 汇入连线 | merge操作（分支合并） |
| 适用场景 | 时间轴精确定位 | 合并关系全局概览 |
| endTime字段 | 用于计算时间段结束 | **不显示**（仅表示状态持续） |

### 1.3 核心设计决策
- **分区绘制**：按合并连通分量分组，每组独立绘制gitgraph实例
- **原因**：避免所有分支在同一图中导致初始commit点X方向累积错位
- **效果**：几百服务器场景下，每组错位宽度可控（commit.spacing=10px）

---

## 2. 数据模型映射

### 2.1 MappingNode → Git概念
```typescript
interface MappingNode {
  id: string           // 节点唯一标识
  key: string          // 服务器ID（如 "1服"）→ Git分支
  value: string        // 目标服务器ID → 合并目标分支
  startTime: string    // 开始时间 ISO → commit/merge时间点
  endTime: string | null  // 结束时间 → Git图中不使用
}
```

### 2.2 映射规则
| MappingNode.value | Git操作 | 说明 |
|-------------------|---------|------|
| `value === key` | commit | 独立运行，添加commit点 |
| `value !== key` | merge | 合服，源分支merge到目标分支 |

### 2.3 重要约束
- **endTime字段在Git视图中不显示**
- endTime用于泳道图计算时间段结束点
- Git图仅展示startTime作为关键事件时间点

---

## 3. 算法详解

### 3.1 连通分量分组算法

**目的**：将有合并关系的服务器分组，无合并关系的服务器各自独立成组。

**算法**：DFS遍历无向图找连通分量

```typescript
function findConnectedComponents(nodes: MappingNode[]): string[][] {
  // 步骤1：构建邻接表（无向图）
  const graph: Map<string, Set<string>> = new Map()
  const allServers = new Set<string>()

  nodes.forEach(n => {
    allServers.add(n.key)
    if (n.value !== n.key) {
      // 合并关系：双向连接
      // 例：3服合入2服 → 3服和2服互相连接
      if (!graph.has(n.key)) graph.set(n.key, new Set())
      if (!graph.has(n.value)) graph.set(n.value, new Set())
      graph.get(n.key)!.add(n.value)
      graph.get(n.value)!.add(n.key)
    }
  })

  // 步骤2：DFS找连通分量
  const visited = new Set<string>()
  const components: string[][] = []

  function dfs(server: string, component: string[]) {
    visited.add(server)
    component.push(server)
    const neighbors = graph.get(server)
    if (neighbors) {
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, component)
        }
      })
    }
  }

  // 步骤3：按服务器编号排序后遍历
  const sortedServers = Array.from(allServers).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0')
    const numB = parseInt(b.match(/\d+/)?.[0] || '0')
    return numA - numB
  })

  sortedServers.forEach(server => {
    if (!visited.has(server)) {
      const component: string[] = []
      dfs(server, component)
      // 组内按编号排序
      component.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0')
        const numB = parseInt(b.match(/\d+/)?.[0] || '0')
        return numA - numB
      })
      components.push(component)
    }
  })

  return components
}
```

**分组示例**：
```
输入数据：
- 1服 → 2服 (合入)
- 3服 → 2服 (合入)
- 4服 (独立运行)
- 5服 → 4服 (合入)

输出分组：
- 组1: [1服, 2服, 3服]  (三者有合并关系连通)
- 组2: [4服, 5服]       (5服合入4服)
```

### 3.2 分支Y位置排序算法

**问题**：gitgraph.js中分支的Y位置由第一个commit的时间决定，而非创建顺序。

**解决**：创建所有分支后，立即添加空subject的初始commit。

```typescript
// 正确做法
servers.forEach(server => {
  const branch = branches[server]
  if (branch) {
    branch.commit({
      subject: '',  // 空内容，仅用于固定Y位置
      author: '',
    })
  }
})
```

**原理**：
- branch.spacing = 30，每条分支Y间距30px
- 第一个分支Y=0，第二个Y=30，第三个Y=60...
- 初始commit在同一时间点添加，Y位置由创建顺序决定

### 3.3 服务器编号排序算法

**问题**：字符串排序导致"10服"排在"1服"前面。

**解决**：提取数字部分排序。

```typescript
const servers = Array.from(serverSet).sort((a, b) => {
  const numA = parseInt(a.match(/\d+/)?.[0] || '0')
  const numB = parseInt(b.match(/\d+/)?.[0] || '0')
  return numA - numB
})
```

**结果**：`["1服", "2服", "3服", "10服", "11服"]`（正确的数字顺序）

### 3.4 同时间事件排序算法

**问题**：同一startTime的commit和merge需要确定顺序。

**解决**：使用sortKey区分优先级。

```typescript
interface Event {
  time: number
  sortKey: number      // 0=commit, 1=merge
  type: 'commit' | 'merge'
  server: string
  target?: string
  node: MappingNode
}

events.sort((a, b) => {
  if (a.time !== b.time) return a.time - b.time
  return a.sortKey - b.sortKey  // commit先于merge
})
```

**规则**：
- 先按时间排序
- 同一时间：commit(sortKey=0)先于merge(sortKey=1)
- 保证独立运行节点先渲染，合并节点后渲染

---

## 4. gitgraph.js API使用规则

### 4.1 库选择
使用 `@gitgraph/js` 而非 `@gitgraph/react`：
- 纯JavaScript渲染SVG
- 无需React依赖
- API简洁直接

### 4.2 Orientation选择
```typescript
import { Orientation } from '@gitgraph/js'

createGitgraph(container, {
  orientation: Orientation.Horizontal,  // 分支从左到右，时间从上到下
})
```

**注意**：
- `Orientation.Horizontal`：分支横向排列
- `Orientation.HorizontalReverse`：时间从右到左（不推荐）
- `Orientation.Vertical`：分支从上到下，时间从左到右（不推荐）

### 4.3 Template定制
```typescript
import { templateExtend, TemplateName } from '@gitgraph/js'

const compactTemplate = templateExtend(TemplateName.Metro, {
  branch: {
    lineWidth: 2,      // 线条宽度（细线适合大量服务器）
    spacing: 30,       // 分支Y间距
    label: {
      display: false,  // 隐藏内置标签，使用自定义标签
    },
  },
  commit: {
    spacing: 10,       // commit点X间距（初始错位宽度）
    dot: {
      size: 5,         // commit点大小
    },
  },
})
```

### 4.4 分支创建规则

**关键**：所有分支从第一个分支分出，而非独立创建。

```typescript
// 正确做法
const firstServer = servers[0]
const mainBranch = gitgraph.branch({
  name: firstServer,
  style: { color: getBranchColor(firstServer) },
})
branches[firstServer] = mainBranch

for (let i = 1; i < servers.length; i++) {
  const server = servers[i]
  branches[server] = mainBranch.branch({  // 从mainBranch分出
    name: server,
    style: { color: getBranchColor(server) },
  })
}

// 错误做法（不要这样写）
servers.forEach(server => {
  branches[server] = gitgraph.branch({ name: server })  // 独立创建
})
```

### 4.5 Merge操作方向

**语法**：`targetBranch.merge(sourceBranch)` = 源分支合入目标分支

```typescript
// 3服合入2服
const sourceBranch = branches['3服']
const targetBranch = branches['2服']

targetBranch.merge({
  branch: sourceBranch,
  commitOptions: {
    subject: '3服 → 2服 (2024-01-01 10:00:00)',
    author: '',
  },
})
```

**注意**：方向与直觉相反，调用merge的是目标分支。

### 4.6 Tooltip显示规则

gitgraph.js仅显示commit的subject字段，不显示body。

```typescript
branch.commit({
  subject: `${server} ${status} (${timeLabel})`,  // 这会显示在tooltip
  author: '',
})
```

**约束**：
- subject使用单行文本
- 多行会导致hover频闪问题
- 时间使用本地格式（dayjs）

---

## 5. 自定义分支名称标签

### 5.1 为什么需要自定义
- gitgraph内置label.display=false隐藏了标签
- 内置标签位置不符合需求（在分支线旁边）
- 需要在分支顶部第一个commit点下方显示

### 5.2 addTopLabels实现

```typescript
function addTopLabels(container: HTMLElement, servers: string[]) {
  const svg = container.querySelector('svg')
  const mainGroup = svg.querySelector('g')

  // 获取主group的transform偏移
  const mainTransform = mainGroup.getAttribute('transform') || ''
  const match = mainTransform.match(/translate\(\s*([\d.]+)\s*,\s*([\d.]+)/)
  const offsetX = match ? parseFloat(match[1]) : 0
  const offsetY = match ? parseFloat(match[2]) : 0

  // 从path提取每个分支的起点X坐标
  const paths = mainGroup.querySelectorAll('g > path')
  const yToStartX: Map<number, number> = new Map()
  paths.forEach(path => {
    const d = path.getAttribute('d') || ''
    const match = d.match(/^M\s*([\d.]+)\s+([\d.]+)/)
    if (match) {
      const startX = parseFloat(match[1])
      const y = Math.round(parseFloat(match[2]))
      yToStartX.set(y, startX)
    }
  })

  // 创建标签组
  const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const spacing = 30  // 与template中branch.spacing一致

  servers.forEach((server, index) => {
    const branchY = index * spacing  // Y位置由创建顺序决定
    const startX = yToStartX.get(branchY) ?? 0

    // 计算标签位置
    const x = startX + offsetX + dotSize - 5   // 向左偏移
    const y = branchY + offsetY + dotSize + 8 - 10  // 第一个commit点下方

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', x.toString())
    text.setAttribute('y', y.toString())
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('dominant-baseline', 'hanging')
    text.setAttribute('font-size', '10')
    text.setAttribute('fill', getBranchColor(server))
    text.textContent = server
    labelGroup.appendChild(text)
  })

  mainGroup.insertBefore(labelGroup, mainGroup.firstChild)
}
```

### 5.3 坐标计算规则
- **branchY = index * spacing**：由分支创建顺序决定
- **startX**：从path的d属性提取（M x y格式）
- **offsetX/offsetY**：从mainGroup的transform提取
- **标签位置调整**：(x - 5, y - 10) 向左上方偏移

---

## 6. 时间显示规则

### 6.1 时区问题
**错误**：使用toISOString()会将本地时间转为UTC
```typescript
// 错误示例
const timeLabel = new Date(startTime).toISOString()
// 本地 2024-01-01 00:00:00 → UTC 2024-01-01T16:00:00Z（东八区）
```

**正确**：使用dayjs本地格式化
```typescript
import dayjs from 'dayjs'

const timeLabel = dayjs(startTime).format('YYYY-MM-DD HH:mm:ss')
// 显示本地时间：2024-01-01 00:00:00
```

### 6.2 格式规范
- 时间格式：`YYYY-MM-DD HH:mm:ss`
- tooltip显示：`${server} ${status} (${timeLabel})`
- merge tooltip：`${source} → ${target} (${timeLabel})`

---

## 7. 渲染流程

### 7.1 整体流程
```
props.nodes变化
    ↓
watchEffect触发
    ↓
scheduleRender (requestAnimationFrame)
    ↓
buildGroups (连通分量分组)
    ↓
graphGroups.value更新 (Vue响应式)
    ↓
nextTick后DOM更新
    ↓
renderAllGroups (遍历渲染每组)
    ↓
每组：createGitgraph → 创建分支 → 初始commit → 按时间渲染事件 → addTopLabels
```

### 7.2 单组渲染流程
```typescript
function renderGroupGraph(groupId, servers, groupNodes) {
  // 1. 清空容器
  container.innerHTML = ''

  // 2. 创建gitgraph实例
  const gitgraph = createGitgraph(container, {
    orientation: Orientation.Horizontal,
    template: createCompactTemplate(),
  })

  // 3. 创建分支（按servers顺序）
  const branches = {}
  const mainBranch = gitgraph.branch({ name: servers[0] })
  branches[servers[0]] = mainBranch
  servers.slice(1).forEach(s => {
    branches[s] = mainBranch.branch({ name: s })
  })

  // 4. 添加初始commit（固定Y位置）
  servers.forEach(s => branches[s].commit({ subject: '', author: '' }))

  // 5. 收集并排序事件
  const events = groupNodes.map(...)
  events.sort((a, b) => a.time - b.time || a.sortKey - b.sortKey)

  // 6. 按时间渲染
  events.forEach(event => {
    if (event.type === 'commit') {
      branches[event.server].commit({ subject: ... })
    } else {
      branches[event.target].merge({ branch: branches[event.server], ... })
    }
  })

  // 7. 异步添加标签（等SVG渲染完成）
  requestAnimationFrame(() => addTopLabels(container, servers))
}
```

---

## 8. 注意点与陷阱

### 8.1 已解决的问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 10服排在1服前面 | 字符串排序 | 提取数字部分排序 |
| 9服显示在7服位置 | Y位置由commit时间决定 | 添加初始commit固定Y位置 |
| 分支名称全部堆叠 | path DOM顺序与servers不一致 | 使用index * spacing计算Y |
| 第一个分支标签偏移100px | startX提取错误 | 从path的d属性提取M x y |
| tooltip显示UTC时间 | toISOString()转换 | dayjs本地格式化 |
| tooltip频闪 | 多行文本hover干扰 | 使用单行subject |
| merge点左侧有额外commit | 添加了源分支commit | 合服仅执行merge操作 |
| 几百服务器错位过大 | 所有分支同一图 | 分区绘制（连通分量分组） |

### 8.2 关键约束

1. **初始commit必须添加**
   - 不添加会导致Y位置由第一个事件时间决定
   - 服务器编号顺序被打乱

2. **merge方向正确**
   - `targetBranch.merge(sourceBranch)`
   - 不是 `sourceBranch.merge(targetBranch)`

3. **同时间事件sortKey**
   - commit先于merge
   - 保证独立节点先渲染

4. **path提取startX**
   - path的d属性格式：`M startX startY C ...`
   - startX用于计算标签X位置

5. **requestAnimationFrame添加标签**
   - gitgraph渲染是异步的
   - 直接同步操作DOM找不到SVG元素

### 8.3 不要做的事

```typescript
// ❌ 不要独立创建分支
servers.forEach(s => {
  branches[s] = gitgraph.branch({ name: s })
})

// ❌ 不要使用toISOString
const timeLabel = new Date(startTime).toISOString()

// ❌ 不要在merge前添加commit（合服场景）
branch.commit({ subject: '合服前' })
targetBranch.merge({ branch })

// ❌ 不要使用body字段（不会显示）
branch.commit({
  subject: '简短描述',
  body: '详细内容',  // 不显示
})

// ❌ 不要同步添加标签
addTopLabels(container, servers)  // SVG还未渲染

// ✅ 正确做法
requestAnimationFrame(() => addTopLabels(container, servers))
```

---

## 9. 调试指南

### 9.1 Console日志
```typescript
// 分组结果
console.log('[GitGraph] Groups:', graphGroups.value.map(g => ({
  id: g.id,
  servers: g.servers,
  nodeCount: g.nodes.length,
})))

// 事件排序
console.log('[GitGraph] Events:', events.map(e => ({
  type: e.type,
  server: e.server,
  target: e.target,
  time: new Date(e.time).toISOString().slice(0, 10),
})))
```

### 9.2 检查清单

**分组异常**：
- 检查邻接表构建：是否双向连接？
- 检查DFS遍历：是否正确标记visited？
- 检查独立服务器：是否自成一组？

**分支位置异常**：
- 检查servers排序：是否按数字排序？
- 检查初始commit：是否所有分支都添加？
- 检查spacing配置：是否与Y计算一致？

**标签位置异常**：
- 检查offsetX/offsetY：是否正确提取transform？
- 检查startX：是否从path正确提取？
- 检查Y计算：是否使用index * spacing？

**时间显示异常**：
- 检查dayjs使用：是否format本地时间？
- 检查tooltip：是否显示正确格式？

---

## 10. 扩展参考

### 10.1 @gitgraph/js文档
- GitHub: https://github.com/nicoespeon/gitgraph.js
- API文档: https://gitgraph.js.org/

### 10.2 相关文件
- `src/components/Canvas/GitGraphCanvas.vue` - 主组件
- `src/types/mapping.ts` - 数据类型定义
- `src/utils/db.ts` - IndexedDB数据存储

### 10.3 后续优化方向
- 虚拟滚动（如果分组数量过大）
- 分组间时间轴对齐（可选）
- 分组标题显示合并关系摘要
- 点击分支高亮相关合并线

---

## 11. 实现检查清单

二次实现时，按此清单验证：

- [ ] 连通分量算法正确分组
- [ ] 服务器按数字排序
- [ ] 分支从第一个分支分出
- [ ] 所有分支添加初始commit
- [ ] 事件按时间+sortKey排序
- [ ] merge方向正确（target.merge(source))
- [ ] 时间使用dayjs本地格式
- [ ] tooltip使用单行subject
- [ ] 标签异步添加（requestAnimationFrame）
- [ ] Y位置使用index * spacing计算
- [ ] startX从path的d属性提取
- [ ] endTime字段不显示在Git图

---

*文档版本: 1.0*
*最后更新: 2026-05-06*