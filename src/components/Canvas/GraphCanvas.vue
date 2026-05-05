<template>
  <div ref="containerRef" class="graph-canvas"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watchEffect } from 'vue'
import { Graph, Shape } from '@antv/x6'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'
import { calculateAllNodeRenderData, formatTimeRange } from '@/utils/timeAxis'
import { calculateAllConnectionRenderData } from '@/utils/connectionEngine'
import dayjs from 'dayjs'

// 注册自定义文本节点（纯文本，无背景框）
Graph.registerNode('custom-text', {
  markup: [
    {
      tagName: 'text',
      selector: 'label',
    },
  ],
  attrs: {
    label: {
      textAnchor: 'middle',
      textVerticalAnchor: 'middle',
      fontSize: 11,
      fill: '#6b7280',
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
let graph: Graph | null = null
const timeAxisHeight = 40

// 从节点数据提取泳道 Key 列表
const swimlaneKeys = computed(() => {
  const keySet = new Set<string>()
  props.nodes.forEach(n => {
    keySet.add(n.key)
    keySet.add(n.value)
  })
  return Array.from(keySet).sort()
})

// 计算时间刻度
function getTimeTicks(): { x: number; label: string }[] {
  const minTimeMs = new Date(props.globalMinTime).getTime()
  const maxTimeMs = new Date(props.globalMaxTime).getTime()
  const result: { x: number; label: string }[] = []

  // 一天的像素宽度 = 86400秒 * pixelsPerSecond
  const pixelPerDay = 86400 * props.pixelsPerSecond

  // 根据像素密度选择间隔，确保标签不重叠
  // 每个完整日期标签（YYYY-MM-DD）约需要 100px 宽度
  let intervalDays: number
  if (pixelPerDay >= 100) {
    intervalDays = 1
  } else if (pixelPerDay >= 33) {
    intervalDays = 3
  } else if (pixelPerDay >= 14) {
    intervalDays = 7
  } else if (pixelPerDay >= 5) {
    intervalDays = 15
  } else if (pixelPerDay >= 3.3) {
    intervalDays = 30
  } else if (pixelPerDay >= 1) {
    intervalDays = 90
  } else {
    intervalDays = 180
  }

  // 使用毫秒计算
  const intervalMs = intervalDays * 86400 * 1000
  let currentMs = minTimeMs

  while (currentMs <= maxTimeMs) {
    const diffSeconds = (currentMs - minTimeMs) / 1000
    const x = props.config.headerWidth + diffSeconds * props.pixelsPerSecond

    result.push({
      x,
      label: dayjs(currentMs).format('YYYY-MM-DD'),
    })

    currentMs += intervalMs
  }

  return result
}

function initGraph() {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth || 800
  const height = containerRef.value.clientHeight || 600

  graph = new Graph({
    container: containerRef.value,
    width,
    height,
    background: {
      color: '#f5f7fa',
    },
    grid: {
      size: 10,
      visible: false,
    },
    panning: {
      enabled: true,
    },
    mousewheel: {
      enabled: true,
    },
    interacting: {
      nodeMovable: false,
    },
  })

  // 监听节点点击
  graph.on('node:click', ({ node }) => {
    const nodeId = node.id
    const nodeData = props.nodes.find(n => n.id === nodeId)
    if (nodeData) {
      emit('node-click', nodeData)
    }
  })
}

// 防抖渲染：多次 watchEffect 触发时只执行最后一次
let renderRAF = 0

function scheduleRender() {
  if (!graph) return
  cancelAnimationFrame(renderRAF)
  renderRAF = requestAnimationFrame(() => {
    renderNodes()
  })
}

function renderNodes() {
  if (!graph) return

  graph.clearCells()

  if (props.nodes.length === 0) return

  const ticks = getTimeTicks()

  // 渲染时间刻度背景
  graph!.addNode({
    id: 'time-axis-bg',
    shape: 'rect',
    x: 0,
    y: 0,
    width: 20000,
    height: timeAxisHeight,
    attrs: {
      body: {
        fill: '#ffffff',
        stroke: '#e5e7eb',
        strokeWidth: 1,
      },
    },
    zIndex: -1,
  })

  // 渲染时间刻度标签
  ticks.forEach((tick, index) => {
    graph!.addNode({
      id: `tick-${index}`,
      shape: 'custom-text',
      x: tick.x,
      y: 20,
      attrs: {
        label: {
          text: tick.label,
        },
      },
    })
  })

  // 渲染泳道背景
  swimlaneKeys.value.forEach((key, index) => {
    const y = timeAxisHeight + index * props.config.swimlaneHeight
    const isHighlighted = key === props.highlightedSwimlane

    // 泳道背景条纹（交替色），高亮泳道使用特殊颜色
    graph!.addNode({
      id: `lane-bg-${key}`,
      shape: 'rect',
      x: 0,
      y,
      width: 20000,
      height: props.config.swimlaneHeight,
      attrs: {
        body: {
          fill: isHighlighted ? '#e6f7ff' : (index % 2 === 0 ? '#ffffff' : '#fafbfc'),
          stroke: isHighlighted ? '#409eff' : '#ebeef5',
          strokeWidth: isHighlighted ? 2 : 0.5,
        },
      },
      zIndex: -1,
    })

    // 泳道名称标签，高亮时使用更醒目的颜色
    graph!.addNode({
      id: `lane-label-${key}`,
      shape: 'rect',
      x: 10,
      y: y + 8,
      width: 50,
      height: props.config.swimlaneHeight - 16,
      attrs: {
        body: {
          fill: isHighlighted ? '#f5222d' : '#409eff',
          stroke: isHighlighted ? '#f5222d' : 'none',
          strokeWidth: isHighlighted ? 1 : 0,
          rx: 4,
          ry: 4,
        },
        label: {
          text: key,
          fill: '#ffffff',
          fontSize: isHighlighted ? 14 : 12,
          fontWeight: 'bold',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
        },
      },
    })
  })

  // 计算节点渲染数据（增加 timeAxisHeight 偏移）
  const nodeRenderData = calculateAllNodeRenderData(
    props.nodes,
    props.swimlanes,
    props.globalMinTime,
    props.pixelsPerSecond,
    props.config
  )

  // 渲染节点
  nodeRenderData.forEach(data => {
    const isMerge = data.node.value !== data.node.key
    const timeLabel = formatTimeRange(data.node.startTime, data.node.endTime)

    graph!.addNode({
      id: data.node.id,
      shape: 'rect',
      x: data.x,
      y: timeAxisHeight + data.y + 5,
      width: Math.max(60, data.width),
      height: data.height - 10,
      attrs: {
        body: {
          fill: isMerge ? '#fdf6ec' : '#ecf5ff',
          stroke: isMerge ? '#e6a23c' : '#409eff',
          strokeWidth: 1,
          rx: 4,
          ry: 4,
          cursor: 'pointer',
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
  })

  // 计算并渲染连线（增加 timeAxisHeight 偏移）
  const connectionRenderData = calculateAllConnectionRenderData(
    props.nodes,
    props.swimlanes,
    props.globalMinTime,
    props.pixelsPerSecond,
    props.config
  )

  connectionRenderData.forEach(conn => {
    const sourceY = timeAxisHeight + conn.sourceY
    const targetY = timeAxisHeight + conn.targetY

    if (conn.type === 'merge') {
      // 汇入线：正交路由
      graph!.addEdge({
        id: conn.id,
        source: { x: conn.sourceX, y: sourceY },
        target: { x: conn.targetX, y: targetY },
        vertices: [
          { x: conn.sourceX - 20, y: sourceY },
          { x: conn.sourceX - 20, y: targetY },
        ],
        connector: {
          name: 'rounded',
          args: { radius: 8 },
        },
        attrs: {
          line: {
            stroke: '#e6a23c',
            strokeWidth: 2,
            strokeDasharray: '4,2',
            targetMarker: {
              name: 'block',
              width: 8,
              height: 6,
            },
          },
        },
      })
    } else {
      // 演进线：平滑曲线
      graph!.addEdge({
        id: conn.id,
        source: { x: conn.sourceX, y: sourceY },
        target: { x: conn.targetX, y: targetY },
        connector: { name: 'smooth' },
        attrs: {
          line: {
            stroke: '#409eff',
            strokeWidth: 2,
          },
        },
      })
    }
  })
}

onMounted(() => {
  initGraph()
  renderNodes()
})

// 定位到指定泳道（居中显示）
function centerOnSwimlane(key: string) {
  if (!graph) return

  const index = swimlaneKeys.value.indexOf(key)
  if (index === -1) return

  const y = timeAxisHeight + index * props.config.swimlaneHeight + props.config.swimlaneHeight / 2
  const contentArea = graph.getContentArea()
  const graphWidth = graph.options.width || 800
  const graphHeight = graph.options.height || 600

  // 将泳道移动到画布中央
  graph.positionContent('center', {
    padding: { left: 0, top: y - graphHeight / 2 + timeAxisHeight },
  })

  // 或者使用 translate 方法更精确控制
  graph.translate(0, -y + graphHeight / 2)
}

// 定位到指定时间点（居中显示）
function centerOnTime(time: string) {
  if (!graph) return

  const timeMs = new Date(time).getTime()
  const minTimeMs = new Date(props.globalMinTime).getTime()
  const x = (timeMs - minTimeMs) / 1000 * props.pixelsPerSecond
  const graphWidth = graph.options.width || 800

  // 将时间点移动到画布中央
  graph.translate(-x + graphWidth / 2, 0)
}

// 使用 watchEffect 监听所有依赖，通过防抖避免多次快速渲染
watchEffect(() => {
  // 显式读取所有依赖，触发响应式追踪
  const _nodesLen = props.nodes.length
  const _swimlanesLen = props.swimlanes.length
  const _minTime = props.globalMinTime
  const _maxTime = props.globalMaxTime
  const _pps = props.pixelsPerSecond
  const _keys = swimlaneKeys.value
  const _highlightedSwimlane = props.highlightedSwimlane

  // 使用防抖渲染，避免 X6 DOM 残留问题
  if (graph) {
    scheduleRender()
  }
}, { flush: 'post' })

onUnmounted(() => {
  cancelAnimationFrame(renderRAF)
  graph?.dispose()
})

defineExpose({
  renderNodes,
  centerOnSwimlane,
  centerOnTime,
})
</script>

<style scoped>
.graph-canvas {
  flex: 1;
  width: 100%;
  min-height: 400px;
  overflow: hidden;
}
</style>
