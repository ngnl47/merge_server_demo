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
      start: dayjs('2024-01-01').toISOString(),
      end: dayjs().toISOString(),
    },
    currentTime: null,
    pixelsPerSecond: 0.001, // 每秒0.001像素，约每天86像素
  })

  // 画布配置
  const canvasConfig = ref<CanvasConfig>({
    swimlaneHeight: 60,
    collapsedSwimlaneHeight: 30,
    headerWidth: 120,
    timeAxisHeight: 40,
    minPixelsPerSecond: 0.0001, // 每秒0.0001像素，约每天8.6像素
    maxPixelsPerSecond: 0.01, // 每秒0.01像素，约每天864像素
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
      console.error('[Store] importNodes error:', e)
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