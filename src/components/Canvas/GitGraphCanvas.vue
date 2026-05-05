<template>
  <div ref="containerRef" class="git-graph-canvas"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watchEffect } from 'vue'
import { createGitgraph, Orientation, templateExtend, TemplateName } from '@gitgraph/js'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'

// 自定义模板：缩小线条和字体，适合大量服务器
const compactTemplate = templateExtend(TemplateName.Metro, {
  branch: {
    lineWidth: 2,
    spacing: 30,
    label: {
      display: false,  // 隐藏 gitgraph 内置标签，改用顶部自定义标签
    },
  },
  commit: {
    spacing: 10,
    dot: {
      size: 5,
    },
  },
})

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

// 渲染后在每个分支列顶部添加服务器名称标签
function addTopLabels(container: HTMLElement, servers: string[]) {
  console.log('[GitGraph] addTopLabels called, servers:', servers)
  const svg = container.querySelector('svg')
  if (!svg) {
    console.log('[GitGraph] No svg found')
    return
  }

  // 获取主 group
  const mainGroup = svg.querySelector('g')
  if (!mainGroup) {
    console.log('[GitGraph] No main group found')
    return
  }

  // 获取初始偏移
  const mainTransform = mainGroup.getAttribute('transform') || ''
  const mainMatch = mainTransform.match(/translate\(\s*([\d.]+)\s*,\s*([\d.]+)/)
  const offsetX = mainMatch ? parseFloat(mainMatch[1]) : 0
  const offsetY = mainMatch ? parseFloat(mainMatch[2]) : 0

  // 从分支路径（path）提取每个分支的起点坐标
  // 在 Horizontal 模式下，path 的 d 属性格式如：M 0 0 C ... L ... L ...
  const paths = mainGroup.querySelectorAll('g > path')
  console.log('[GitGraph] Found paths:', paths.length)

  // 建立 Y 坐标到 startX 的映射
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

  console.log('[GitGraph] yToStartX:', Array.from(yToStartX.entries()).sort((a, b) => a[0] - b[0]))

  // 创建顶部标签
  const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  labelGroup.setAttribute('class', 'top-labels')

  // dot.size
  const dotSize = 5
  const spacing = 30 // 与 template 中 branch.spacing 一致

  servers.forEach((server, index) => {
    // Y 位置直接由 index 决定（与 gitgraph 创建顺序一致）
    const branchY = index * spacing
    // 从映射中获取对应的 startX
    const startX = yToStartX.get(branchY) ?? 0

    // X 在分支起点，向左偏移 5
    const x = startX + offsetX + dotSize - 5
    // Y 在分支线下方，向上偏移 10
    const y = branchY + offsetY + dotSize + 8 - 10

    console.log(`[GitGraph] Label: ${server} -> branchY=${branchY}, startX=${startX}, x=${x}, y=${y}`)

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
  console.log('[GitGraph] Labels added')
}

function renderGraph() {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  if (width === 0 || height === 0) return
  if (props.nodes.length === 0) return

  containerRef.value.innerHTML = ''

  // 创建 gitgraph 实例
  const gitgraph = createGitgraph(containerRef.value, {
    orientation: Orientation.Horizontal,
    template: compactTemplate,
  })

  // 提取所有服务器并按数字排序
  const serverSet = new Set<string>()
  props.nodes.forEach(n => {
    serverSet.add(n.key)
    serverSet.add(n.value)
  })
  // 提取数字部分进行排序，如 "10服" -> 10, "1服" -> 1
  const servers = Array.from(serverSet).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0')
    const numB = parseInt(b.match(/\d+/)?.[0] || '0')
    return numA - numB
  })

  // 创建分支映射
  // 所有分支从第一个服务器分支分出，保证合并逻辑正确
  const branches: Record<string, ReturnType<typeof gitgraph.branch>> = {}

  const firstServer = servers[0]
  const mainBranch = gitgraph.branch({
    name: firstServer,
    style: { color: getBranchColor(firstServer) },
  })
  branches[firstServer] = mainBranch

  // 其他分支立即从 mainBranch 分出（在同一位置）
  for (let i = 1; i < servers.length; i++) {
    const server = servers[i]
    branches[server] = mainBranch.branch({
      name: server,
      style: { color: getBranchColor(server) },
    })
  }

  // 为每个分支添加初始 commit，确保 Y 位置按 servers 顺序排列
  servers.forEach(server => {
    const branch = branches[server]
    if (branch) {
      branch.commit({
        subject: '',
        author: '',
      })
    }
  })

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

  console.log('[GitGraph] Events:', events.map(e => ({
    type: e.type,
    server: e.server,
    target: e.target,
    time: new Date(e.time).toISOString().slice(0, 10),
    nodeKey: e.node.key,
    nodeValue: e.node.value,
  })))

  console.log('[GitGraph] Branches:', Object.keys(branches))

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
        subject: `${n.key} ${status} (${dateLabel})`,
        body: `Key: ${n.key}\nValue: ${n.value}\n开始: ${dateLabel}\n结束: ${endTimeLabel}`,
        author: '',
      })
    } else if (event.type === 'merge') {
      const targetBranch = branches[event.target!]
      if (targetBranch) {
        targetBranch.merge(branch, `${event.server} → ${event.target!}`)
      }
    }
  })

  // 渲染后添加顶部标签（gitgraph 渲染是异步的，需要等下一帧）
  requestAnimationFrame(() => {
    if (containerRef.value) {
      addTopLabels(containerRef.value, servers)
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