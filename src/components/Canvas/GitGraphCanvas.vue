<template>
  <div ref="containerRef" class="git-graph-canvas">
    <div v-for="group in graphGroups" :key="group.id" class="graph-group">
      <div class="group-title">{{ group.servers.join(', ') }}</div>
      <div :ref="el => groupRefs[group.id] = el" class="graph-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watchEffect, nextTick } from 'vue'
import { createGitgraph, Orientation, templateExtend, TemplateName } from '@gitgraph/js'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'
import dayjs from 'dayjs'

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

// 连通分量分组算法
function findConnectedComponents(nodes: MappingNode[]): string[][] {
  // 构建邻接表
  const graph: Map<string, Set<string>> = new Map()
  const allServers = new Set<string>()

  nodes.forEach(n => {
    allServers.add(n.key)
    if (n.value !== n.key) {
      // 合并关系：双向连接（连通分量是无向的）
      if (!graph.has(n.key)) graph.set(n.key, new Set())
      if (!graph.has(n.value)) graph.set(n.value, new Set())
      graph.get(n.key)!.add(n.value)
      graph.get(n.value)!.add(n.key)
    }
  })

  // DFS找连通分量
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

  // 按数字排序后遍历
  const sortedServers = Array.from(allServers).sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)?.[0] || '0')
    const numB = parseInt(b.match(/\d+/)?.[0] || '0')
    return numA - numB
  })

  sortedServers.forEach(server => {
    if (!visited.has(server)) {
      const component: string[] = []
      dfs(server, component)
      // 组内按数字排序
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

// 自定义模板：缩小线条和字体，适合大量服务器
function createCompactTemplate() {
  return templateExtend(TemplateName.Metro, {
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
}

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
const groupRefs: Record<string, HTMLDivElement | null> = reactive({})

// 图分组数据
interface GraphGroup {
  id: string
  servers: string[]
  nodes: MappingNode[]
}
const graphGroups = ref<GraphGroup[]>([])

// 渲染单个分组的图
function renderGroupGraph(groupId: string, servers: string[], groupNodes: MappingNode[]) {
  const container = groupRefs[groupId]
  if (!container) return

  container.innerHTML = ''

  // 创建 gitgraph 实例
  const gitgraph = createGitgraph(container, {
    orientation: Orientation.Horizontal,
    template: createCompactTemplate(),
  })

  // 创建分支映射
  const branches: Record<string, ReturnType<typeof gitgraph.branch>> = {}

  const firstServer = servers[0]
  const mainBranch = gitgraph.branch({
    name: firstServer,
    style: { color: getBranchColor(firstServer) },
  })
  branches[firstServer] = mainBranch

  // 其他分支从 mainBranch 分出
  for (let i = 1; i < servers.length; i++) {
    const server = servers[i]
    branches[server] = mainBranch.branch({
      name: server,
      style: { color: getBranchColor(server) },
    })
  }

  // 添加初始 commit
  servers.forEach(server => {
    const branch = branches[server]
    if (branch) {
      branch.commit({
        subject: '',
        author: '',
      })
    }
  })

  // 收集该分组的事件
  interface Event {
    time: number
    sortKey: number
    type: 'commit' | 'merge'
    server: string
    target?: string
    node: MappingNode
  }

  const events: Event[] = []

  groupNodes.forEach(node => {
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

    if (event.type === 'commit') {
      const status = n.value === n.key ? '独立运行' : `→ ${n.value}`
      const timeLabel = dayjs(event.time).format('YYYY-MM-DD HH:mm:ss')
      branch.commit({
        subject: `${n.key} ${status} (${timeLabel})`,
        author: '',
      })
    } else if (event.type === 'merge') {
      const targetBranch = branches[event.target!]
      const timeLabel = dayjs(event.time).format('YYYY-MM-DD HH:mm:ss')
      if (targetBranch) {
        targetBranch.merge({
          branch,
          commitOptions: {
            subject: `${event.server} → ${event.target!} (${timeLabel})`,
            author: '',
          },
        })
      }
    }
  })

  // 渲染后添加顶部标签
  requestAnimationFrame(() => {
    addTopLabels(container, servers)
  })
}

// 渲染后在每个分支列顶部添加服务器名称标签
function addTopLabels(container: HTMLElement, servers: string[]) {
  const svg = container.querySelector('svg')
  if (!svg) return

  const mainGroup = svg.querySelector('g')
  if (!mainGroup) return

  const mainTransform = mainGroup.getAttribute('transform') || ''
  const mainMatch = mainTransform.match(/translate\(\s*([\d.]+)\s*,\s*([\d.]+)/)
  const offsetX = mainMatch ? parseFloat(mainMatch[1]) : 0
  const offsetY = mainMatch ? parseFloat(mainMatch[2]) : 0

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

  const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  labelGroup.setAttribute('class', 'top-labels')

  const dotSize = 5
  const spacing = 30

  servers.forEach((server, index) => {
    const branchY = index * spacing
    const startX = yToStartX.get(branchY) ?? 0

    const x = startX + offsetX + dotSize - 5
    const y = branchY + offsetY + dotSize + 8 - 10

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

function buildGroups() {
  if (props.nodes.length === 0) {
    graphGroups.value = []
    return
  }

  // 找连通分量
  const components = findConnectedComponents(props.nodes)

  // 为每个分组创建 GraphGroup
  graphGroups.value = components.map((servers, index) => {
    // 过滤出该分组相关的节点
    const groupNodes = props.nodes.filter(n =>
      servers.includes(n.key) || servers.includes(n.value)
    )

    return {
      id: `group-${index}`,
      servers,
      nodes: groupNodes,
    }
  })

  console.log('[GitGraph] Groups:', graphGroups.value.map(g => ({
    id: g.id,
    servers: g.servers,
    nodeCount: g.nodes.length,
  })))
}

async function renderAllGroups() {
  await nextTick()
  graphGroups.value.forEach(group => {
    renderGroupGraph(group.id, group.servers, group.nodes)
  })
}

let renderRAF = 0

function scheduleRender() {
  cancelAnimationFrame(renderRAF)
  renderRAF = requestAnimationFrame(() => {
    buildGroups()
    renderAllGroups()
  })
}

onMounted(() => {
  buildGroups()
  renderAllGroups()
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
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 20px;
}

.graph-group {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px;
  background: #fafafa;
}

.group-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px dashed #e4e7ed;
}

.graph-container {
  min-height: 60px;
}
</style>