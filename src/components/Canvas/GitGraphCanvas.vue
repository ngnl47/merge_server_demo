<template>
  <div ref="containerRef" class="git-graph-canvas"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watchEffect } from 'vue'
import { createGitgraph, Orientation } from '@gitgraph/js'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'

const props = defineProps<{
  nodes: MappingNode[]
  swimlanes: Swimlane[]
  globalMinTime: string
  globalMaxTime: string
  pixelsPerSecond: number
  config: CanvasConfig
  highlightedSwimlane: string | null
}>()

const emit = defineEmits<{
  'node-click': [node: MappingNode]
}>()

const containerRef = ref<HTMLDivElement>()

// 分支颜色映射
const branchColors: Record<string, string> = {}
const colorPalette = ['#409eff', '#e6a23c', '#67c23a', '#f56c6c', '#9b59b6', '#1abc9c', '#e67e22', '#3498db', '#e74c3c', '#2ecc71']

function getBranchColor(server: string): string {
  if (!branchColors[server]) {
    const index = Object.keys(branchColors).length % colorPalette.length
    branchColors[server] = colorPalette[index]
  }
  return branchColors[server]
}

function renderGraph() {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  if (width === 0 || height === 0) return
  if (props.nodes.length === 0) return

  containerRef.value.innerHTML = ''

  // 创建 gitgraph 实例
  // Horizontal: 分支从左到右排列，时间从上到下流动
  const gitgraph = createGitgraph(containerRef.value, {
    orientation: Orientation.Horizontal,
  })

  // 提取所有服务器并排序
  const serverSet = new Set<string>()
  props.nodes.forEach(n => {
    serverSet.add(n.key)
    serverSet.add(n.value)
  })
  const servers = Array.from(serverSet).sort()

  // 创建分支映射
  const branches: Record<string, ReturnType<typeof gitgraph.branch>> = {}

  // 在 gitgraph 中，需要先创建一个初始提交，然后从它创建分支
  // 使用第一个服务器作为起点
  const firstServer = servers[0]
  const mainBranch = gitgraph.branch({
    name: firstServer,
    style: { color: getBranchColor(firstServer) },
  })
  branches[firstServer] = mainBranch

  // 其他服务器从第一个分支创建
  for (let i = 1; i < servers.length; i++) {
    const server = servers[i]
    branches[server] = mainBranch.branch({
      name: server,
      style: { color: getBranchColor(server) },
    })
  }

  // 收集所有事件并按时间排序
  interface Event {
    time: number
    sortKey: number
    type: 'commit' | 'merge'
    server: string
    target?: string
    node: MappingNode
  }

  const events: Event[] = []

  props.nodes.forEach(node => {
    const startTime = new Date(node.startTime).getTime()

    if (node.value === node.key) {
      events.push({
        time: startTime,
        sortKey: 0,
        type: 'commit',
        server: node.key,
        node,
      })
    } else {
      events.push({
        time: startTime,
        sortKey: 1,
        type: 'commit',
        server: node.key,
        node,
      })
      events.push({
        time: startTime,
        sortKey: 2,
        type: 'commit',
        server: node.value,
        node,
      })
      events.push({
        time: startTime,
        sortKey: 3,
        type: 'merge',
        server: node.key,
        target: node.value,
        node,
      })
    }
  })

  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time
    return a.sortKey - b.sortKey
  })

  // 按时间顺序渲染事件
  events.forEach(event => {
    const branch = branches[event.server]
    if (!branch) return

    const n = event.node
    const dateLabel = new Date(event.time).toISOString().slice(0, 10)
    const endTimeLabel = n.endTime ? new Date(n.endTime).toISOString().slice(0, 10) : '至今'

    if (event.type === 'commit') {
      const status = n.value === n.key ? '独立运行' : `→ ${n.value}`
      branch.commit({
        subject: `${n.key} ${status}`,
        body: `Key: ${n.key}\nValue: ${n.value}\n开始: ${dateLabel}\n结束: ${endTimeLabel}`,
        author: '',
      })
    } else if (event.type === 'merge') {
      const targetBranch = branches[event.target!]
      if (targetBranch) {
        // 语义：event.server 合入 event.target
        // gitgraph: targetBranch.merge(sourceBranch) 表示 source 汇入 target
        targetBranch.merge(branch, `${event.server} → ${event.target!}`)
      }
    }
  })
}

let renderRAF = 0

function scheduleRender() {
  cancelAnimationFrame(renderRAF)
  renderRAF = requestAnimationFrame(() => {
    renderGraph()
  })
}

onMounted(() => {
  renderGraph()
})

watchEffect(() => {
  const _nodesLen = props.nodes.length
  scheduleRender()
}, { flush: 'post' })

onUnmounted(() => {
  cancelAnimationFrame(renderRAF)
})

defineExpose({
  centerOnSwimlane(_key: string) {},
  centerOnTime(_time: string) {},
  resize() {},
})
</script>

<style scoped>
.git-graph-canvas {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 20px;
}
</style>