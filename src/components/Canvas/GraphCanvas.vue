<template>
  <div ref="containerRef" class="graph-canvas"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { Graph } from '@antv/x6'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'
import { calculateAllNodeRenderData, formatTimeRange } from '@/utils/timeAxis'
import { calculateAllConnectionRenderData } from '@/utils/connectionEngine'

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
    mousewheel: {
      enabled: true,
      modifiers: ['ctrl', 'meta'],
    },
    interacting: {
      nodeMovable: false,
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