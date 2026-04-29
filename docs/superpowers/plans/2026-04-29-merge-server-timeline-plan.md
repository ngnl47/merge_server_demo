# 合服时间轴可视化系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建基于 AntV X6 的游戏合服时间轴可视化系统，支持动态泳道、链式合服连线、时间回溯。

**Architecture:** Vue 3 + Pinia 作为状态管理核心，X6 画布渲染泳道和节点，IndexedDB 持久化数据。时间-坐标转换引擎驱动布局，连线引擎自动计算演进线和汇入线。

**Tech Stack:** Vue 3.3.4, TypeScript 4.5.4, Vite 3.2.5, Element Plus 2.2.30, Tailwind CSS 3.3.1, Pinia 2.1.3, AntV X6, Day.js, IndexedDB (Dexie.js), vue3-ts-jsoneditor

---

## 文件结构

```
src/
├── main.ts                          # 应用入口
├── App.vue                          # 根组件
├── style.css                        # 全局样式
├── types/
│   └── mapping.ts                   # 类型定义
├── stores/
│   └── mapping.ts                   # Pinia store (状态 + IndexedDB)
├── utils/
│   ├── db.ts                        # IndexedDB 封装 (Dexie.js)
│   ├── timeAxis.ts                  # 时间-坐标转换引擎
│   └── connectionEngine.ts          # 连线计算引擎
├── components/
│   ├── Canvas/
│   │   ├── index.vue                # 画布容器
│   │   ├── GraphCanvas.vue          # X6 画布组件
│   │   ├── TimelineRuler.vue        # 时间轴标尺
│   │   └── SwimlaneLabel.vue        # 泳道标签
│   ├── DataPanel/
│   │   ├── index.vue                # 数据面板容器
│   │   ├── FormInput.vue            # 表单录入
│   │   └── JsonEditor.vue           # JSON 编辑器
│   ├── TimelineSlider/
│   │   └── index.vue                # 时间滑块
│   └── Toolbar/
│       ├── TimeFilter.vue           # 时间范围过滤
│       └── SwimlaneControl.vue      # 泳道控制（折叠等）
├── views/
│   └── Home.vue                     # 主页面
└── data/
    └── seed.json                    # 初始种子数据
```

---

## 阶段一：基础搭建

### Task 1: 项目初始化

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`
- Create: `index.html`, `src/main.ts`, `src/App.vue`, `src/style.css`, `src/router/index.ts`
- Create: `.gitignore`, `src/views/Home.vue`

- [ ] **Step 1: 初始化 Vite + Vue 3 + TypeScript 项目**

```bash
cd /Users/hcm-b0666/hortor/workspace_other/antv_sample
npm create vite@3.2.5 . -- --template vue-ts
```

Expected: 项目结构生成

- [ ] **Step 2: 安装核心依赖**

```bash
npm install vue@3.3.4 vue-router@4.2.1 pinia@2.1.3 pinia-plugin-persistedstate@3.1.0
npm install element-plus@2.2.30 @element-plus/icons-vue@2.1.0
npm install @antv/x6 @antv/x6-vue-shape
npm install dayjs dexie vue3-ts-jsoneditor
npm install axios@1.4.0
```

- [ ] **Step 3: 安装开发依赖**

```bash
npm install -D tailwindcss@3.3.1 postcss@8.4.14 autoprefixer@10.4.7 sass@1.49.7
npm install -D typescript@4.5.4 @types/node@17.0.31 vite@3.2.5 @vitejs/plugin-vue@3.1.0
```

- [ ] **Step 4: 配置 Tailwind CSS**

Create `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#409eff',
      },
    },
  },
  plugins: [],
}
```

Create `postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: 创建全局样式**

Create `src/style.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

- [ ] **Step 6: 配置 Vite**

Update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
```

- [ ] **Step 7: 配置 TypeScript**

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "esnext",
    "useDefineForClassFields": true,
    "module": "esnext",
    "moduleResolution": "node",
    "strict": true,
    "jsx": "preserve",
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["esnext", "dom"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 8: 创建路由**

Create `src/router/index.ts`:
```typescript
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

- [ ] **Step 9: 配置应用入口**

Update `src/main.ts`:
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
```

- [ ] **Step 10: 创建根组件**

Update `src/App.vue`:
```vue
<template>
  <router-view />
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 11: 创建占位首页**

Create `src/views/Home.vue`:
```vue
<template>
  <div class="w-full h-full flex items-center justify-center bg-gray-100">
    <h1 class="text-2xl font-bold text-gray-700">合服时间轴可视化系统</h1>
  </div>
</template>

<script setup lang="ts">
</script>
```

- [ ] **Step 12: 验证项目启动**

```bash
npm run dev
```

Expected: 浏览器打开，显示"合服时间轴可视化系统"标题

- [ ] **Step 13: 提交**

```bash
git add .
git commit -m "feat: 初始化项目结构

- Vite + Vue 3 + TypeScript 配置
- Element Plus + Tailwind CSS 集成
- Pinia 状态管理
- 基础路由配置"
```

---

### Task 2: 类型定义

**Files:**
- Create: `src/types/mapping.ts`

- [ ] **Step 1: 定义核心类型**

Create `src/types/mapping.ts`:
```typescript
/**
 * 映射节点 - 表示一个服务器在某个时间段的状态
 */
export interface MappingNode {
  id: string
  key: string          // 泳道标识（服务器ID，如 "1服"）
  value: string        // 目标服务器ID（当 value === key 时表示独立运行）
  startTime: string    // ISO 时间字符串
  endTime: string | null  // null 表示"至今"
}

/**
 * 连线类型
 */
export type ConnectionType = 'evolution' | 'merge'

/**
 * 泳道数据
 */
export interface Swimlane {
  key: string
  label: string
  collapsed: boolean
  order: number
}

/**
 * 时间范围
 */
export interface TimeRange {
  start: string
  end: string
}

/**
 * 视口状态
 */
export interface ViewportState {
  timeRange: TimeRange
  currentTime: string | null
  pixelsPerSecond: number
}

/**
 * 画布配置
 */
export interface CanvasConfig {
  swimlaneHeight: number
  collapsedSwimlaneHeight: number
  headerWidth: number
  timeAxisHeight: number
  minPixelsPerSecond: number
  maxPixelsPerSecond: number
}

/**
 * 节点渲染数据
 */
export interface NodeRenderData {
  node: MappingNode
  x: number
  y: number
  width: number
  height: number
  swimlaneKey: string
}

/**
 * 连线渲染数据
 */
export interface ConnectionRenderData {
  id: string
  type: ConnectionType
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}
```

- [ ] **Step 2: 提交**

```bash
git add src/types/mapping.ts
git commit -m "feat: 添加核心类型定义

- MappingNode 映射节点
- Swimlane 泳道
- ViewportState 视口状态
- CanvasConfig 画布配置
- NodeRenderData/ConnectionRenderData 渲染数据"
```

---

### Task 3: IndexedDB 数据层

**Files:**
- Create: `src/utils/db.ts`

- [ ] **Step 1: 创建数据库封装**

Create `src/utils/db.ts`:
```typescript
import Dexie, { type EntityTable } from 'dexie'
import type { MappingNode, Swimlane } from '@/types/mapping'

/**
 * 合服数据库
 */
class MergeServerDB extends Dexie {
  nodes!: EntityTable<MappingNode, 'id'>
  swimlanes!: EntityTable<Swimlane, 'key'>

  constructor() {
    super('MergeServerTimeline')

    this.version(1).stores({
      nodes: 'id, key, startTime, endTime, value',
      swimlanes: 'key, order',
    })
  }
}

export const db = new MergeServerDB()

/**
 * 数据库操作封装
 */
export const dbOperations = {
  // 节点操作
  async getAllNodes(): Promise<MappingNode[]> {
    return await db.nodes.toArray()
  },

  async getNodesByTimeRange(start: string, end: string): Promise<MappingNode[]> {
    const allNodes = await db.nodes.toArray()
    return allNodes.filter(node => {
      const nodeStart = new Date(node.startTime).getTime()
      const nodeEnd = node.endTime ? new Date(node.endTime).getTime() : Infinity
      const rangeStart = new Date(start).getTime()
      const rangeEnd = new Date(end).getTime()
      return nodeStart < rangeEnd && nodeEnd > rangeStart
    })
  },

  async getNodesByKey(key: string): Promise<MappingNode[]> {
    return await db.nodes.where('key').equals(key).toArray()
  },

  async addNode(node: MappingNode): Promise<string> {
    return await db.nodes.add(node)
  },

  async updateNode(id: string, changes: Partial<MappingNode>): Promise<number> {
    return await db.nodes.update(id, changes)
  },

  async deleteNode(id: string): Promise<void> {
    await db.nodes.delete(id)
  },

  async clearNodes(): Promise<void> {
    await db.nodes.clear()
  },

  async bulkAddNodes(nodes: MappingNode[]): Promise<void> {
    await db.nodes.bulkAdd(nodes)
  },

  // 泳道操作
  async getAllSwimlanes(): Promise<Swimlane[]> {
    return await db.swimlanes.orderBy('order').toArray()
  },

  async addSwimlane(swimlane: Swimlane): Promise<void> {
    await db.swimlanes.add(swimlane)
  },

  async updateSwimlane(key: string, changes: Partial<Swimlane>): Promise<number> {
    return await db.swimlanes.update(key, changes)
  },

  async deleteSwimlane(key: string): Promise<void> {
    await db.swimlanes.delete(key)
  },

  async clearSwimlanes(): Promise<void> {
    await db.swimlanes.clear()
  },

  // 获取所有唯一的泳道 Key（包括 key 和 value）
  async getUniqueKeys(): Promise<string[]> {
    const nodes = await db.nodes.toArray()
    const keys = new Set<string>()
    nodes.forEach(n => {
      keys.add(n.key)
      keys.add(n.value)
    })
    return Array.from(keys).sort()
  },

  // 清空所有数据
  async clearAll(): Promise<void> {
    await Promise.all([
      db.nodes.clear(),
      db.swimlanes.clear(),
    ])
  },

  // 导出数据
  async exportData(): Promise<{ nodes: MappingNode[]; swimlanes: Swimlane[] }> {
    const [nodes, swimlanes] = await Promise.all([
      db.nodes.toArray(),
      db.swimlanes.toArray(),
    ])
    return { nodes, swimlanes }
  },

  // 导入数据
  async importData(data: { nodes: MappingNode[]; swimlanes: Swimlane[] }): Promise<void> {
    await this.clearAll()
    await Promise.all([
      data.nodes.length > 0 ? db.nodes.bulkAdd(data.nodes) : Promise.resolve(),
      data.swimlanes.length > 0 ? db.swimlanes.bulkAdd(data.swimlanes) : Promise.resolve(),
    ])
  },
}

export default dbOperations
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/db.ts
git commit -m "feat: 添加 IndexedDB 数据层

- Dexie.js 数据库封装
- 节点 CRUD 操作
- 泳道 CRUD 操作
- 时间范围查询
- 数据导入导出"
```

---

### Task 4: Pinia Store

**Files:**
- Create: `src/stores/mapping.ts`

- [ ] **Step 1: 创建 Pinia Store**

Create `src/stores/mapping.ts`:
```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MappingNode, Swimlane, TimeRange, ViewportState, CanvasConfig } from '@/types/mapping'
import { dbOperations } from '@/utils/db'
import dayjs from 'dayjs'

export const useMappingStore = defineStore('mapping', () => {
  // 状态
  const nodes = ref<MappingNode[]>([])
  const swimlanes = ref<Swimlane[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 视口状态
  const viewportState = ref<ViewportState>({
    timeRange: {
      start: dayjs().subtract(1, 'year').toISOString(),
      end: dayjs().toISOString(),
    },
    currentTime: null,
    pixelsPerSecond: 0.1,
  })

  // 画布配置
  const canvasConfig = ref<CanvasConfig>({
    swimlaneHeight: 60,
    collapsedSwimlaneHeight: 30,
    headerWidth: 120,
    timeAxisHeight: 40,
    minPixelsPerSecond: 0.01,
    maxPixelsPerSecond: 1,
  })

  // 计算属性：获取所有唯一的泳道 Key
  const allSwimlaneKeys = computed(() => {
    const keys = new Set<string>()
    nodes.value.forEach(n => {
      keys.add(n.key)
      keys.add(n.value)
    })
    return Array.from(keys).sort()
  })

  // 计算属性：有效节点（在当前时间范围内）
  const filteredNodes = computed(() => {
    const { start, end } = viewportState.value.timeRange
    return nodes.value.filter(node => {
      const nodeStart = new Date(node.startTime).getTime()
      const nodeEnd = node.endTime ? new Date(node.endTime).getTime() : Infinity
      const rangeStart = new Date(start).getTime()
      const rangeEnd = new Date(end).getTime()
      return nodeStart < rangeEnd && nodeEnd > rangeStart
    })
  })

  // 计算属性：时间范围
  const globalTimeRange = computed(() => {
    if (nodes.value.length === 0) {
      return {
        min: viewportState.value.timeRange.start,
        max: viewportState.value.timeRange.end,
      }
    }
    const times = nodes.value.flatMap(n => [
      new Date(n.startTime).getTime(),
      n.endTime ? new Date(n.endTime).getTime() : Date.now(),
    ])
    return {
      min: new Date(Math.min(...times)).toISOString(),
      max: new Date(Math.max(...times)).toISOString(),
    }
  })

  // Actions
  async function loadNodes() {
    loading.value = true
    error.value = null
    try {
      nodes.value = await dbOperations.getAllNodes()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载节点失败'
      console.error('加载节点失败:', e)
    } finally {
      loading.value = false
    }
  }

  async function loadSwimlanes() {
    try {
      swimlanes.value = await dbOperations.getAllSwimlanes()
    } catch (e) {
      console.error('加载泳道失败:', e)
    }
  }

  async function addNode(node: MappingNode) {
    try {
      await dbOperations.addNode(node)
      nodes.value.push(node)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '添加节点失败'
      throw e
    }
  }

  async function updateNode(id: string, changes: Partial<MappingNode>) {
    try {
      await dbOperations.updateNode(id, changes)
      const index = nodes.value.findIndex(n => n.id === id)
      if (index !== -1) {
        nodes.value[index] = { ...nodes.value[index], ...changes }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : '更新节点失败'
      throw e
    }
  }

  async function deleteNode(id: string) {
    try {
      await dbOperations.deleteNode(id)
      nodes.value = nodes.value.filter(n => n.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '删除节点失败'
      throw e
    }
  }

  async function importNodes(newNodes: MappingNode[]) {
    try {
      await dbOperations.clearNodes()
      await dbOperations.bulkAddNodes(newNodes)
      nodes.value = newNodes
    } catch (e) {
      error.value = e instanceof Error ? e.message : '导入数据失败'
      throw e
    }
  }

  async function loadData() {
    await Promise.all([loadNodes(), loadSwimlanes()])
  }

  function setTimeRange(range: TimeRange) {
    viewportState.value.timeRange = range
  }

  function setCurrentTime(time: string | null) {
    viewportState.value.currentTime = time
  }

  function setPixelsPerSecond(pps: number) {
    const { minPixelsPerSecond, maxPixelsPerSecond } = canvasConfig.value
    viewportState.value.pixelsPerSecond = Math.max(minPixelsPerSecond, Math.min(maxPixelsPerSecond, pps))
  }

  function toggleSwimlaneCollapse(key: string) {
    const swimlane = swimlanes.value.find(s => s.key === key)
    if (swimlane) {
      swimlane.collapsed = !swimlane.collapsed
      dbOperations.updateSwimlane(key, { collapsed: swimlane.collapsed })
    }
  }

  return {
    // 状态
    nodes,
    swimlanes,
    loading,
    error,
    viewportState,
    canvasConfig,

    // 计算属性
    allSwimlaneKeys,
    filteredNodes,
    globalTimeRange,

    // Actions
    loadNodes,
    loadSwimlanes,
    addNode,
    updateNode,
    deleteNode,
    importNodes,
    loadData,
    setTimeRange,
    setCurrentTime,
    setPixelsPerSecond,
    toggleSwimlaneCollapse,
  }
})
```

- [ ] **Step 2: 提交**

```bash
git add src/stores/mapping.ts
git commit -m "feat: 添加 Pinia Store

- 节点和泳道状态管理
- 视口状态和画布配置
- 时间范围过滤
- IndexedDB 同步操作"
```

---

## 阶段二：画布核心

### Task 5: 时间-坐标转换引擎

**Files:**
- Create: `src/utils/timeAxis.ts`

- [ ] **Step 1: 创建时间轴转换引擎**

Create `src/utils/timeAxis.ts`:
```typescript
import dayjs from 'dayjs'
import type { MappingNode, CanvasConfig, NodeRenderData } from '@/types/mapping'

/**
 * 时间转 X 坐标
 */
export function timeToX(
  time: string,
  globalMinTime: string,
  pixelsPerSecond: number,
  headerWidth: number
): number {
  const timeMs = new Date(time).getTime()
  const minTimeMs = new Date(globalMinTime).getTime()
  const diffSeconds = (timeMs - minTimeMs) / 1000
  return headerWidth + diffSeconds * pixelsPerSecond
}

/**
 * X 坐标转时间
 */
export function xToTime(
  x: number,
  globalMinTime: string,
  pixelsPerSecond: number,
  headerWidth: number
): string {
  const minTimeMs = new Date(globalMinTime).getTime()
  const diffSeconds = (x - headerWidth) / pixelsPerSecond
  return new Date(minTimeMs + diffSeconds * 1000).toISOString()
}

/**
 * 泳道索引转 Y 坐标
 */
export function swimlaneIndexToY(
  index: number,
  swimlaneKeys: string[],
  swimlanes: { key: string; collapsed: boolean }[],
  config: CanvasConfig
): number {
  let y = config.timeAxisHeight
  for (let i = 0; i < index; i++) {
    const key = swimlaneKeys[i]
    const swimlane = swimlanes.find(s => s.key === key)
    const height = swimlane?.collapsed ? config.collapsedSwimlaneHeight : config.swimlaneHeight
    y += height
  }
  return y
}

/**
 * 获取泳道高度
 */
export function getSwimlaneHeight(
  key: string,
  swimlanes: { key: string; collapsed: boolean }[],
  config: CanvasConfig
): number {
  const swimlane = swimlanes.find(s => s.key === key)
  return swimlane?.collapsed ? config.collapsedSwimlaneHeight : config.swimlaneHeight
}

/**
 * 计算节点渲染数据
 */
export function calculateNodeRenderData(
  node: MappingNode,
  swimlaneIndex: number,
  swimlaneKeys: string[],
  swimlanes: { key: string; collapsed: boolean }[],
  globalMinTime: string,
  pixelsPerSecond: number,
  config: CanvasConfig
): NodeRenderData {
  const x = timeToX(node.startTime, globalMinTime, pixelsPerSecond, config.headerWidth)
  const y = swimlaneIndexToY(swimlaneIndex, swimlaneKeys, swimlanes, config)
  const height = getSwimlaneHeight(node.key, swimlanes, config)

  // 计算宽度
  const startTimeMs = new Date(node.startTime).getTime()
  const endTimeMs = node.endTime ? new Date(node.endTime).getTime() : Date.now()
  const durationSeconds = (endTimeMs - startTimeMs) / 1000
  const width = Math.max(20, durationSeconds * pixelsPerSecond) // 最小宽度 20px

  return {
    node,
    x,
    y,
    width,
    height,
    swimlaneKey: node.key,
  }
}

/**
 * 批量计算节点渲染数据
 */
export function calculateAllNodeRenderData(
  nodes: MappingNode[],
  swimlanes: { key: string; collapsed: boolean }[],
  globalMinTime: string,
  pixelsPerSecond: number,
  config: CanvasConfig
): NodeRenderData[] {
  // 构建泳道 Key 列表（包括所有 key 和 value）
  const keySet = new Set<string>()
  nodes.forEach(n => {
    keySet.add(n.key)
    keySet.add(n.value)
  })
  const swimlaneKeys = Array.from(keySet).sort()

  return nodes.map(node => {
    const index = swimlaneKeys.indexOf(node.key)
    return calculateNodeRenderData(
      node,
      index,
      swimlaneKeys,
      swimlanes,
      globalMinTime,
      pixelsPerSecond,
      config
    )
  })
}

/**
 * 计算画布总宽度
 */
export function calculateCanvasWidth(
  globalMinTime: string,
  globalMaxTime: string,
  pixelsPerSecond: number,
  headerWidth: number
): number {
  const minMs = new Date(globalMinTime).getTime()
  const maxMs = new Date(globalMaxTime).getTime()
  const durationSeconds = (maxMs - minMs) / 1000
  return headerWidth + durationSeconds * pixelsPerSecond + 100
}

/**
 * 格式化时间显示
 */
export function formatTimeRange(startTime: string, endTime: string | null): string {
  const start = dayjs(startTime).format('YYYY-MM-DD')
  const end = endTime ? dayjs(endTime).format('YYYY-MM-DD') : '至今'
  return `${start} ~ ${end}`
}
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/timeAxis.ts
git commit -m "feat: 添加时间-坐标转换引擎

- timeToX/xToTime 双向转换
- 泳道 Y 坐标计算
- 节点渲染数据计算
- 画布尺寸计算"
```

---

### Task 6: 连线计算引擎

**Files:**
- Create: `src/utils/connectionEngine.ts`

- [ ] **Step 1: 创建连线计算引擎**

Create `src/utils/connectionEngine.ts`:
```typescript
import type { MappingNode, ConnectionRenderData, ConnectionType, CanvasConfig } from '@/types/mapping'
import { timeToX, swimlaneIndexToY, getSwimlaneHeight } from './timeAxis'

/**
 * 连线数据结构（内部使用）
 */
interface Connection {
  id: string
  type: ConnectionType
  sourceNodeId: string
  targetNodeId: string
}

/**
 * 计算演进线（同一泳道内的连续节点）
 */
function calculateEvolutionConnections(nodes: MappingNode[]): Connection[] {
  const connections: Connection[] = []

  // 按 key 分组
  const nodesByKey = new Map<string, MappingNode[]>()
  nodes.forEach(node => {
    const list = nodesByKey.get(node.key) || []
    list.push(node)
    nodesByKey.set(node.key, list)
  })

  // 每个泳道内按时间排序
  nodesByKey.forEach((swimlaneNodes) => {
    const sorted = [...swimlaneNodes].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    // 相邻节点连成演进线
    for (let i = 0; i < sorted.length - 1; i++) {
      const source = sorted[i]
      const target = sorted[i + 1]
      connections.push({
        id: `evo-${source.id}-${target.id}`,
        type: 'evolution',
        sourceNodeId: source.id,
        targetNodeId: target.id,
      })
    }
  })

  return connections
}

/**
 * 计算汇入线（跨泳道的合并关系）
 */
function calculateMergeConnections(nodes: MappingNode[]): Connection[] {
  const connections: Connection[] = []

  nodes.forEach(node => {
    // 只有当 value !== key 时才需要汇入线
    if (node.value === node.key) return

    // 找到目标泳道中对应时间的节点
    const targetNodes = nodes.filter(n =>
      n.key === node.value &&
      new Date(n.startTime).getTime() <= new Date(node.startTime).getTime() &&
      (n.endTime === null || new Date(n.endTime!).getTime() > new Date(node.startTime).getTime())
    )

    if (targetNodes.length > 0) {
      // 选择时间最近的节点
      const target = targetNodes.reduce((closest, n) => {
        const nTime = new Date(n.startTime).getTime()
        const closestTime = new Date(closest.startTime).getTime()
        return nTime > closestTime ? n : closest
      })

      connections.push({
        id: `merge-${target.id}-${node.id}`,
        type: 'merge',
        sourceNodeId: target.id,
        targetNodeId: node.id,
      })
    }
  })

  return connections
}

/**
 * 计算所有连线
 */
export function calculateAllConnections(nodes: MappingNode[]): Connection[] {
  return [
    ...calculateEvolutionConnections(nodes),
    ...calculateMergeConnections(nodes),
  ]
}

/**
 * 计算连线渲染数据
 */
export function calculateConnectionRenderData(
  connection: Connection,
  sourceNode: MappingNode,
  targetNode: MappingNode,
  sourceSwimlaneIndex: number,
  targetSwimlaneIndex: number,
  swimlaneKeys: string[],
  swimlanes: { key: string; collapsed: boolean }[],
  globalMinTime: string,
  pixelsPerSecond: number,
  config: CanvasConfig
): ConnectionRenderData {
  // 源节点右边缘中点
  const sourceEndTime = sourceNode.endTime || new Date().toISOString()
  const sourceX = timeToX(sourceEndTime, globalMinTime, pixelsPerSecond, config.headerWidth)
  const sourceY = swimlaneIndexToY(sourceSwimlaneIndex, swimlaneKeys, swimlanes, config)
    + getSwimlaneHeight(sourceNode.key, swimlanes, config) / 2

  // 目标节点左边缘中点
  const targetX = timeToX(targetNode.startTime, globalMinTime, pixelsPerSecond, config.headerWidth)
  const targetY = swimlaneIndexToY(targetSwimlaneIndex, swimlaneKeys, swimlanes, config)
    + getSwimlaneHeight(targetNode.key, swimlanes, config) / 2

  return {
    id: connection.id,
    type: connection.type,
    sourceX,
    sourceY,
    targetX,
    targetY,
  }
}

/**
 * 批量计算连线渲染数据
 */
export function calculateAllConnectionRenderData(
  nodes: MappingNode[],
  swimlanes: { key: string; collapsed: boolean }[],
  globalMinTime: string,
  pixelsPerSecond: number,
  config: CanvasConfig
): ConnectionRenderData[] {
  // 构建泳道 Key 列表
  const keySet = new Set<string>()
  nodes.forEach(n => {
    keySet.add(n.key)
    keySet.add(n.value)
  })
  const swimlaneKeys = Array.from(keySet).sort()

  // 节点 ID 映射
  const nodeMap = new Map<string, MappingNode>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  // 计算所有连线
  const connections = calculateAllConnections(nodes)

  return connections.map(conn => {
    const sourceNode = nodeMap.get(conn.sourceNodeId)!
    const targetNode = nodeMap.get(conn.targetNodeId)!
    const sourceIndex = swimlaneKeys.indexOf(sourceNode.key)
    const targetIndex = swimlaneKeys.indexOf(targetNode.key)

    return calculateConnectionRenderData(
      conn,
      sourceNode,
      targetNode,
      sourceIndex,
      targetIndex,
      swimlaneKeys,
      swimlanes,
      globalMinTime,
      pixelsPerSecond,
      config
    )
  })
}

export type { Connection }
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/connectionEngine.ts
git commit -m "feat: 添加连线计算引擎

- 演进线计算（同泳道连续）
- 汇入线计算（跨泳道合并）
- 连线渲染数据计算"
```

---

### Task 7: X6 画布组件

**Files:**
- Create: `src/components/Canvas/index.vue`
- Create: `src/components/Canvas/GraphCanvas.vue`
- Create: `src/components/Canvas/TimelineRuler.vue`
- Create: `src/components/Canvas/SwimlaneLabel.vue`

- [ ] **Step 1: 创建画布容器组件**

Create `src/components/Canvas/index.vue`:
```vue
<template>
  <div class="canvas-container flex flex-col h-full">
    <!-- 时间轴标尺 -->
    <TimelineRuler
      :min-time="globalMinTime"
      :max-time="globalMaxTime"
      :pixels-per-second="pixelsPerSecond"
      :header-width="headerWidth"
    />
    <div class="flex flex-1 overflow-hidden">
      <!-- 泳道标签 -->
      <SwimlaneLabel
        :swimlane-keys="swimlaneKeys"
        :swimlanes="swimlanes"
        :config="canvasConfig"
        @toggle-collapse="$emit('toggle-collapse', $event)"
      />
      <!-- X6 画布 -->
      <GraphCanvas
        ref="graphCanvasRef"
        :nodes="nodes"
        :swimlanes="swimlanes"
        :global-min-time="globalMinTime"
        :pixels-per-second="pixelsPerSecond"
        :config="canvasConfig"
        :current-time="currentTime"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'
import TimelineRuler from './TimelineRuler.vue'
import SwimlaneLabel from './SwimlaneLabel.vue'
import GraphCanvas from './GraphCanvas.vue'

const props = defineProps<{
  nodes: MappingNode[]
  swimlanes: Swimlane[]
  globalMinTime: string
  globalMaxTime: string
  pixelsPerSecond: number
  canvasConfig: CanvasConfig
  currentTime: string | null
}>()

defineEmits<{
  'toggle-collapse': [key: string]
}>()

const swimlaneKeys = computed(() => {
  const keySet = new Set<string>()
  props.nodes.forEach(n => {
    keySet.add(n.key)
    keySet.add(n.value)
  })
  return Array.from(keySet).sort()
})

const headerWidth = computed(() => props.canvasConfig.headerWidth)
</script>

<style scoped>
.canvas-container {
  background: #f5f7fa;
}
</style>
```

- [ ] **Step 2: 创建时间轴标尺组件**

Create `src/components/Canvas/TimelineRuler.vue`:
```vue
<template>
  <div class="timeline-ruler flex" :style="{ marginLeft: `${headerWidth}px` }">
    <div
      v-for="tick in ticks"
      :key="tick.time"
      class="tick flex flex-col items-center"
      :style="{ position: 'absolute', left: `${tick.x}px` }"
    >
      <span class="text-xs text-gray-500">{{ tick.label }}</span>
      <div class="w-px h-2 bg-gray-300"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps<{
  minTime: string
  maxTime: string
  pixelsPerSecond: number
  headerWidth: number
}>()

interface Tick {
  time: string
  x: number
  label: string
}

const ticks = computed<Tick[]>(() => {
  const start = dayjs(props.minTime)
  const end = dayjs(props.maxTime)
  const result: Tick[] = []

  const durationDays = end.diff(start, 'day')
  let intervalDays = 1
  if (durationDays > 365) intervalDays = 30
  else if (durationDays > 90) intervalDays = 7
  else if (durationDays > 30) intervalDays = 3

  let current = start.startOf('day')
  while (current.isBefore(end)) {
    const x = props.headerWidth + (current.diff(props.minTime, 'second') * props.pixelsPerSecond)
    result.push({
      time: current.toISOString(),
      x,
      label: current.format('MM-DD'),
    })
    current = current.add(intervalDays, 'day')
  }

  return result
})
</script>

<style scoped>
.timeline-ruler {
  position: relative;
  height: 40px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
</style>
```

- [ ] **Step 3: 创建泳道标签组件**

Create `src/components/Canvas/SwimlaneLabel.vue`:
```vue
<template>
  <div class="swimlane-labels flex flex-col bg-white border-r border-gray-200">
    <div
      v-for="key in swimlaneKeys"
      :key="key"
      class="swimlane-label flex items-center px-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
      :style="{ height: `${getHeight(key)}px` }"
      @click="$emit('toggle-collapse', key)"
    >
      <el-icon class="mr-1 text-gray-400">
        <ArrowRight v-if="isCollapsed(key)" />
        <ArrowDown v-else />
      </el-icon>
      <span class="text-sm font-medium">{{ key }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import type { Swimlane, CanvasConfig } from '@/types/mapping'

const props = defineProps<{
  swimlaneKeys: string[]
  swimlanes: Swimlane[]
  config: CanvasConfig
}>()

defineEmits<{
  'toggle-collapse': [key: string]
}>()

function isCollapsed(key: string): boolean {
  const swimlane = props.swimlanes.find(s => s.key === key)
  return swimlane?.collapsed ?? false
}

function getHeight(key: string): number {
  return isCollapsed(key) ? props.config.collapsedSwimlaneHeight : props.config.swimlaneHeight
}
</script>

<style scoped>
.swimlane-labels {
  width: 120px;
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 4: 创建 X6 画布组件**

Create `src/components/Canvas/GraphCanvas.vue`:
```vue
<template>
  <div ref="containerRef" class="graph-canvas"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { Graph } from '@antv/x6'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'
import { calculateAllNodeRenderData } from '@/utils/timeAxis'
import { calculateAllConnections, calculateAllConnectionRenderData } from '@/utils/connectionEngine'
import { formatTimeRange } from '@/utils/timeAxis'

const props = defineProps<{
  nodes: MappingNode[]
  swimlanes: Swimlane[]
  globalMinTime: string
  pixelsPerSecond: number
  config: CanvasConfig
  currentTime: string | null
}>()

const containerRef = ref<HTMLDivElement>()
let graph: Graph | null = null

function initGraph() {
  if (!containerRef.value) return

  graph = new Graph({
    container: containerRef.value,
    width: containerRef.value.clientWidth,
    height: containerRef.value.clientHeight,
    background: {
      color: '#f5f7fa',
    },
    grid: {
      size: 10,
      visible: true,
      type: 'dot',
      args: {
        color: '#e5e7eb',
        thickness: 1,
      },
    },
    scroller: {
      enabled: true,
      pannable: true,
    },
    mousewheel: {
      enabled: true,
      modifiers: ['ctrl', 'meta'],
    },
    interacting: {
      nodeMovable: false, // 禁止拖动节点
    },
  })
}

function renderNodes() {
  if (!graph) return

  graph.clearCells()

  if (props.nodes.length === 0) return

  // 计算节点渲染数据
  const nodeRenderData = calculateAllNodeRenderData(
    props.nodes,
    props.swimlanes,
    props.globalMinTime,
    props.pixelsPerSecond,
    props.config
  )

  // 渲染节点
  nodeRenderData.forEach(data => {
    const swimlane = props.swimlanes.find(s => s.key === data.node.key)
    const isCollapsed = swimlane?.collapsed ?? false
    const isMerge = data.node.value !== data.node.key

    if (isCollapsed) {
      // 折叠状态：渲染迷你时间线标记
      graph!.addNode({
        id: data.node.id,
        shape: 'rect',
        x: data.x,
        y: data.y + 10,
        width: Math.max(4, data.width),
        height: 10,
        attrs: {
          body: {
            fill: isMerge ? '#e6a23c' : '#409eff',
            stroke: 'none',
            rx: 2,
            ry: 2,
          },
        },
      })
    } else {
      // 展开状态：渲染完整节点
      const timeLabel = formatTimeRange(data.node.startTime, data.node.endTime)

      graph!.addNode({
        id: data.node.id,
        shape: 'rect',
        x: data.x,
        y: data.y + 5,
        width: Math.max(60, data.width),
        height: data.height - 10,
        attrs: {
          body: {
            fill: isMerge ? '#fdf6ec' : '#ecf5ff',
            stroke: isMerge ? '#e6a23c' : '#409eff',
            strokeWidth: 1,
            rx: 4,
            ry: 4,
          },
          label: {
            text: `→${data.node.value}\n${timeLabel}`,
            fill: '#606266',
            fontSize: 12,
            textAnchor: 'middle',
            textVerticalAnchor: 'middle',
          },
        },
      })
    }
  })

  // 计算并渲染连线
  const connectionRenderData = calculateAllConnectionRenderData(
    props.nodes,
    props.swimlanes,
    props.globalMinTime,
    props.pixelsPerSecond,
    props.config
  )

  connectionRenderData.forEach(conn => {
    graph!.addEdge({
      id: conn.id,
      source: { x: conn.sourceX, y: conn.sourceY },
      target: { x: conn.targetX, y: conn.targetY },
      connector: {
        name: 'smooth',
      },
      attrs: {
        line: {
          stroke: conn.type === 'merge' ? '#e6a23c' : '#409eff',
          strokeWidth: 2,
          targetMarker: conn.type === 'merge' ? {
            name: 'block',
            width: 8,
            height: 6,
          } : null,
        },
      },
    })
  })
}

// 高亮当前时间点的节点
function highlightCurrentTime() {
  if (!graph) return

  graph.getNodes().forEach(node => {
    const nodeData = props.nodes.find(n => n.id === node.id)
    if (!nodeData) return

    const isHighlighted = props.currentTime
      ? new Date(nodeData.startTime).getTime() <= new Date(props.currentTime).getTime() &&
        (nodeData.endTime === null || new Date(nodeData.endTime!).getTime() > new Date(props.currentTime).getTime())
      : false

    node.setAttrs({
      body: {
        stroke: isHighlighted ? '#67c23a' : (nodeData.value !== nodeData.key ? '#e6a23c' : '#409eff'),
        strokeWidth: isHighlighted ? 3 : 1,
      },
    })
  })
}

onMounted(() => {
  initGraph()
  renderNodes()
})

watch(() => [props.nodes, props.swimlanes, props.pixelsPerSecond], () => {
  renderNodes()
}, { deep: true })

watch(() => props.currentTime, () => {
  highlightCurrentTime()
})

onUnmounted(() => {
  graph?.dispose()
})

defineExpose({
  renderNodes,
})
</script>

<style scoped>
.graph-canvas {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
```

- [ ] **Step 5: 提交**

```bash
git add src/components/Canvas/
git commit -m "feat: 添加 X6 画布组件

- 画布容器组件
- 时间轴标尺
- 泳道标签（支持折叠）
- X6 图渲染（节点+连线）"
```

---

## 阶段三：数据录入面板

### Task 8: 数据录入面板

**Files:**
- Create: `src/components/DataPanel/index.vue`
- Create: `src/components/DataPanel/FormInput.vue`
- Create: `src/components/DataPanel/JsonEditor.vue`

- [ ] **Step 1: 创建表单录入组件**

Create `src/components/DataPanel/FormInput.vue`:
```vue
<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" size="small">
    <el-form-item label="服务器" prop="key">
      <el-input v-model="form.key" placeholder="如: 1服" />
    </el-form-item>
    <el-form-item label="目标服" prop="value">
      <el-input v-model="form.value" placeholder="指向的服务器" />
    </el-form-item>
    <el-form-item label="开始时间" prop="startTime">
      <el-date-picker
        v-model="form.startTime"
        type="datetime"
        placeholder="选择开始时间"
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DDTHH:mm:ss"
      />
    </el-form-item>
    <el-form-item label="结束时间" prop="endTime">
      <el-date-picker
        v-model="form.endTime"
        type="datetime"
        placeholder="留空表示至今"
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DDTHH:mm:ss"
        clearable
      />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="handleSubmit">添加</el-button>
      <el-button @click="handleReset">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { MappingNode } from '@/types/mapping'

const emit = defineEmits<{
  submit: [node: MappingNode]
}>()

const formRef = ref<FormInstance>()

const form = reactive({
  key: '',
  value: '',
  startTime: '',
  endTime: '' as string | null,
})

const rules: FormRules = {
  key: [{ required: true, message: '请输入服务器', trigger: 'blur' }],
  value: [{ required: true, message: '请输入目标服', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  const node: MappingNode = {
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key: form.key,
    value: form.value,
    startTime: new Date(form.startTime).toISOString(),
    endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
  }

  emit('submit', node)
  handleReset()
}

function handleReset() {
  formRef.value?.resetFields()
  form.endTime = null
}
</script>
```

- [ ] **Step 2: 创建 JSON 编辑器组件**

Create `src/components/DataPanel/JsonEditor.vue`:
```vue
<template>
  <div class="json-editor">
    <div class="toolbar mb-2">
      <el-button size="small" @click="handleFormat">格式化</el-button>
      <el-button size="small" type="primary" @click="handleApply">应用更改</el-button>
    </div>
    <div ref="editorRef" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { JSONEditor } from 'vue3-ts-jsoneditor'
import type { MappingNode } from '@/types/mapping'

const props = defineProps<{
  nodes: MappingNode[]
}>()

const emit = defineEmits<{
  change: [nodes: MappingNode[]]
}>()

const editorRef = ref<HTMLDivElement>()
let editor: JSONEditor | null = null

onMounted(() => {
  if (!editorRef.value) return

  editor = new JSONEditor({
    target: editorRef.value,
    props: {
      mode: 'tree',
      mainMenuBar: false,
      navigationBar: false,
      statusBar: false,
    },
  })

  editor.set(props.nodes)
})

watch(() => props.nodes, (newNodes) => {
  if (editor) {
    editor.set(newNodes)
  }
}, { deep: true })

function handleFormat() {
  // JSON Editor 内置格式化
}

function handleApply() {
  if (!editor) return

  const content = editor.get()
  if (Array.isArray(content.json)) {
    emit('change', content.json as MappingNode[])
  }
}
</script>

<style scoped>
.json-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-container {
  flex: 1;
  overflow: hidden;
}
</style>
```

- [ ] **Step 3: 创建数据面板容器**

Create `src/components/DataPanel/index.vue`:
```vue
<template>
  <el-tabs v-model="activeTab" class="data-panel">
    <el-tab-pane label="表单录入" name="form">
      <FormInput @submit="handleSubmit" />
    </el-tab-pane>
    <el-tab-pane label="JSON编辑" name="json">
      <JsonEditor :nodes="nodes" @change="handleJsonChange" />
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { MappingNode } from '@/types/mapping'
import FormInput from './FormInput.vue'
import JsonEditor from './JsonEditor.vue'

defineProps<{
  nodes: MappingNode[]
}>()

const emit = defineEmits<{
  add: [node: MappingNode]
  change: [nodes: MappingNode[]]
}>()

const activeTab = ref('form')

function handleSubmit(node: MappingNode) {
  emit('add', node)
}

function handleJsonChange(nodes: MappingNode[]) {
  emit('change', nodes)
}
</script>

<style scoped>
.data-panel {
  height: 100%;
  padding: 16px;
}

:deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow: auto;
}

:deep(.el-tab-pane) {
  height: 100%;
}
</style>
```

- [ ] **Step 4: 提交**

```bash
git add src/components/DataPanel/
git commit -m "feat: 添加数据录入面板

- 表单录入组件
- JSON 编辑器组件
- 标签页切换容器"
```

---

## 阶段四：时间滑块和工具栏

### Task 9: 时间滑块组件

**Files:**
- Create: `src/components/TimelineSlider/index.vue`

- [ ] **Step 1: 创建时间滑块组件**

Create `src/components/TimelineSlider/index.vue`:
```vue
<template>
  <div class="timeline-slider">
    <div class="slider-track" ref="trackRef" @click="handleTrackClick">
      <div
        class="slider-thumb"
        :style="{ left: `${thumbPosition}px` }"
        @mousedown="handleMouseDown"
      ></div>
      <div
        v-if="currentTime"
        class="time-indicator"
        :style="{ left: `${thumbPosition}px` }"
      ></div>
    </div>
    <div class="time-display">
      <span>{{ formattedCurrentTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'

const props = defineProps<{
  minTime: string
  maxTime: string
  currentTime: string | null
  pixelsPerSecond: number
}>()

const emit = defineEmits<{
  'update:currentTime': [time: string | null]
}>()

const trackRef = ref<HTMLDivElement>()
const isDragging = ref(false)
const trackWidth = ref(0)

const minTimeMs = computed(() => new Date(props.minTime).getTime())
const maxTimeMs = computed(() => new Date(props.maxTime).getTime())
const durationMs = computed(() => maxTimeMs.value - minTimeMs.value)

const thumbPosition = computed(() => {
  if (!props.currentTime) return 0
  const currentMs = new Date(props.currentTime).getTime()
  const ratio = (currentMs - minTimeMs.value) / durationMs.value
  return Math.max(0, Math.min(1, ratio)) * trackWidth.value
})

const formattedCurrentTime = computed(() => {
  if (!props.currentTime) return '拖动选择时间点'
  return dayjs(props.currentTime).format('YYYY-MM-DD HH:mm:ss')
})

function positionToTime(x: number): string {
  const ratio = x / trackWidth.value
  const timeMs = minTimeMs.value + ratio * durationMs.value
  return new Date(timeMs).toISOString()
}

function handleTrackClick(e: MouseEvent) {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const time = positionToTime(x)
  emit('update:currentTime', time)
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  e.preventDefault()
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value || !trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(trackWidth.value, e.clientX - rect.left))
  const time = positionToTime(x)
  emit('update:currentTime', time)
}

function handleMouseUp() {
  isDragging.value = false
}

onMounted(() => {
  if (trackRef.value) {
    trackWidth.value = trackRef.value.clientWidth
  }
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
.timeline-slider {
  padding: 8px 16px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.slider-track {
  position: relative;
  height: 20px;
  background: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: #409eff;
  border-radius: 50%;
  cursor: grab;
  z-index: 2;
}

.slider-thumb:active {
  cursor: grabbing;
}

.time-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #409eff;
  transform: translateX(-50%);
  z-index: 1;
}

.time-display {
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
  color: #606266;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/TimelineSlider/
git commit -m "feat: 添加时间滑块组件

- 可拖动时间选择
- 时间位置指示线
- 时间格式化显示"
```

---

### Task 10: 工具栏组件

**Files:**
- Create: `src/components/Toolbar/TimeFilter.vue`
- Create: `src/components/Toolbar/SwimlaneControl.vue`

- [ ] **Step 1: 创建时间范围过滤组件**

Create `src/components/Toolbar/TimeFilter.vue`:
```vue
<template>
  <div class="time-filter flex items-center gap-2">
    <span class="text-sm text-gray-600">时间范围:</span>
    <el-date-picker
      v-model="timeRange"
      type="datetimerange"
      range-separator="至"
      start-placeholder="开始时间"
      end-placeholder="结束时间"
      format="YYYY-MM-DD HH:mm:ss"
      value-format="YYYY-MM-DDTHH:mm:ss"
      size="small"
      @change="handleChange"
    />
    <el-button size="small" @click="handleReset">重置</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TimeRange } from '@/types/mapping'

const props = defineProps<{
  timeRange: TimeRange
}>()

const emit = defineEmits<{
  change: [range: TimeRange]
  reset: []
}>()

const timeRange = ref<[string, string]>([
  props.timeRange.start,
  props.timeRange.end,
])

watch(() => props.timeRange, (newRange) => {
  timeRange.value = [newRange.start, newRange.end]
})

function handleChange(value: [string, string] | null) {
  if (value) {
    emit('change', {
      start: new Date(value[0]).toISOString(),
      end: new Date(value[1]).toISOString(),
    })
  }
}

function handleReset() {
  emit('reset')
}
</script>
```

- [ ] **Step 2: 创建泳道控制组件**

Create `src/components/Toolbar/SwimlaneControl.vue`:
```vue
<template>
  <div class="swimlane-control flex items-center gap-2">
    <span class="text-sm text-gray-600">泳道:</span>
    <el-button size="small" @click="$emit('expand-all')">全部展开</el-button>
    <el-button size="small" @click="$emit('collapse-all')">全部折叠</el-button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'expand-all': []
  'collapse-all': []
}>()
</script>
```

- [ ] **Step 3: 提交**

```bash
git add src/components/Toolbar/
git commit -m "feat: 添加工具栏组件

- 时间范围过滤
- 泳道展开/折叠控制"
```

---

## 阶段五：主页面集成

### Task 11: 主页面集成

**Files:**
- Modify: `src/views/Home.vue`
- Create: `src/data/seed.json`

- [ ] **Step 1: 创建种子数据**

Create `src/data/seed.json`:
```json
[
  {
    "id": "node-1",
    "key": "1服",
    "value": "1服",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-03-01T00:00:00.000Z"
  },
  {
    "id": "node-2",
    "key": "1服",
    "value": "2服",
    "startTime": "2024-03-01T00:00:00.000Z",
    "endTime": null
  },
  {
    "id": "node-3",
    "key": "2服",
    "value": "2服",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": null
  },
  {
    "id": "node-4",
    "key": "3服",
    "value": "3服",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-06-01T00:00:00.000Z"
  },
  {
    "id": "node-5",
    "key": "3服",
    "value": "2服",
    "startTime": "2024-06-01T00:00:00.000Z",
    "endTime": null
  },
  {
    "id": "node-6",
    "key": "4服",
    "value": "4服",
    "startTime": "2024-01-01T00:00:00.000Z",
    "endTime": "2024-09-01T00:00:00.000Z"
  },
  {
    "id": "node-7",
    "key": "4服",
    "value": "1服",
    "startTime": "2024-09-01T00:00:00.000Z",
    "endTime": null
  }
]
```

- [ ] **Step 2: 更新主页面**

Update `src/views/Home.vue`:
```vue
<template>
  <div class="home h-full flex flex-col">
    <!-- 顶部工具栏 -->
    <header class="toolbar flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <h1 class="text-lg font-bold text-gray-800">合服时间轴可视化系统</h1>
      <div class="flex items-center gap-4">
        <TimeFilter :time-range="viewportState.timeRange" @change="setTimeRange" @reset="handleResetTimeRange" />
        <SwimlaneControl @expand-all="handleExpandAll" @collapse-all="handleCollapseAll" />
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="flex-1 flex overflow-hidden">
      <!-- 画布区域 -->
      <div class="flex-1 flex flex-col">
        <Canvas
          :nodes="filteredNodes"
          :swimlanes="swimlanes"
          :global-min-time="globalMinTime"
          :global-max-time="globalMaxTime"
          :pixels-per-second="viewportState.pixelsPerSecond"
          :canvas-config="canvasConfig"
          :current-time="viewportState.currentTime"
          @toggle-collapse="toggleSwimlaneCollapse"
        />
        <!-- 时间滑块 -->
        <TimelineSlider
          v-model:current-time="viewportState.currentTime"
          :min-time="globalMinTime"
          :max-time="globalMaxTime"
          :pixels-per-second="viewportState.pixelsPerSecond"
        />
      </div>

      <!-- 右侧数据面板 -->
      <aside class="w-80 border-l border-gray-200 bg-white overflow-hidden">
        <DataPanel
          :nodes="nodes"
          @add="handleAddNode"
          @change="handleImportNodes"
        />
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMappingStore } from '@/stores/mapping'
import { storeToRefs } from 'pinia'
import type { MappingNode } from '@/types/mapping'
import Canvas from '@/components/Canvas/index.vue'
import DataPanel from '@/components/DataPanel/index.vue'
import TimelineSlider from '@/components/TimelineSlider/index.vue'
import TimeFilter from '@/components/Toolbar/TimeFilter.vue'
import SwimlaneControl from '@/components/Toolbar/SwimlaneControl.vue'
import seedData from '@/data/seed.json'
import { dbOperations } from '@/utils/db'

const store = useMappingStore()
const { nodes, swimlanes, viewportState, canvasConfig, filteredNodes, globalTimeRange } = storeToRefs(store)
const { addNode, importNodes, loadData, setTimeRange, toggleSwimlaneCollapse } = store

const globalMinTime = computed(() => globalTimeRange.value.min)
const globalMaxTime = computed(() => globalTimeRange.value.max)

const isInitialized = ref(false)

async function handleAddNode(node: MappingNode) {
  await addNode(node)
}

async function handleImportNodes(newNodes: MappingNode[]) {
  await importNodes(newNodes)
}

function handleResetTimeRange() {
  setTimeRange({
    start: globalMinTime.value,
    end: globalMaxTime.value,
  })
}

function handleExpandAll() {
  swimlanes.value.forEach(s => {
    if (s.collapsed) {
      toggleSwimlaneCollapse(s.key)
    }
  })
}

function handleCollapseAll() {
  swimlanes.value.forEach(s => {
    if (!s.collapsed) {
      toggleSwimlaneCollapse(s.key)
    }
  })
}

onMounted(async () => {
  await loadData()

  // 如果没有数据，加载种子数据
  if (nodes.value.length === 0) {
    await dbOperations.bulkAddNodes(seedData as MappingNode[])
    await loadData()
  }

  isInitialized.value = true
})
</script>

<style scoped>
.home {
  background: #f5f7fa;
}

.toolbar {
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 3: 提交**

```bash
git add src/views/Home.vue src/data/seed.json
git commit -m "feat: 集成主页面

- 画布 + 数据面板布局
- 工具栏集成
- 时间滑块集成
- 种子数据加载"
```

---

### Task 12: 最终验证和文档更新

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 运行项目验证**

```bash
npm run dev
```

Expected:
- 项目启动成功
- 显示合服时间轴可视化界面
- 能看到 4 个泳道：1服、2服、3服、4服
- 能看到连线（演进线和汇入线）
- 时间滑块可以拖动

- [ ] **Step 2: 更新 CLAUDE.md**

Update `CLAUDE.md`:
```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

合服时间轴可视化系统 - 基于 AntV X6 的游戏服务器合并管理可视化工具。

## Commands

```bash
# 开发
npm run dev

# 构建
npm run build

# 类型检查
vue-tsc --noEmit

# 预览构建结果
npm run preview
```

## Architecture

```
src/
├── components/       # Vue 组件
│   ├── Canvas/       # X6 画布相关
│   ├── DataPanel/    # 数据录入面板
│   ├── TimelineSlider/ # 时间滑块
│   └── Toolbar/      # 工具栏
├── stores/           # Pinia 状态管理
├── utils/            # 工具函数
│   ├── db.ts         # IndexedDB 封装
│   ├── timeAxis.ts   # 时间-坐标转换
│   └── connectionEngine.ts # 连线计算
├── types/            # TypeScript 类型定义
├── views/            # 页面组件
└── data/             # 种子数据
```

## Key Concepts

- **泳道 (Swimlane)**: 每个游戏服务器对应一个泳道
- **节点 (Node)**: 服务器在某个时间段的状态，value === key 表示独立运行
- **演进线**: 同一泳道内相邻时间段的连线
- **汇入线**: 跨泳道的合并关系连线（value !== key 时）
- **链式合服**: 支持级联合并，如 3服→2服→1服
```

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "docs: 更新项目文档

- 添加构建命令
- 说明项目架构
- 说明核心概念"
```

---

## 验收清单

- [ ] 数据录入：表单和 JSON 编辑器都能正常添加/修改/删除数据
- [ ] 画布渲染：泳道和节点按时间轴正确布局
- [ ] 连线正确：演进线和汇入线正确生成，链式合服显示正确
- [ ] 时间回溯：滑块拖动时正确高亮对应时间点的节点
- [ ] 折叠功能：泳道折叠后显示迷你时间线
- [ ] 数据持久化：刷新页面后数据保留