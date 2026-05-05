<template>
  <div class="home h-full flex flex-col">
    <!-- 顶部工具栏 -->
    <header class="toolbar flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <h1 class="text-lg font-bold text-gray-800">合服时间轴可视化系统</h1>
      <div class="flex items-center gap-4">
        <!-- 服务器搜索 -->
        <div class="search-box flex items-center gap-2">
          <el-input
            v-model="searchQuery"
            placeholder="搜索服务器 (如: 1服)"
            size="small"
            clearable
            @keyup.enter="handleSearch"
            style="width: 150px"
          />
          <el-button size="small" type="primary" @click="handleSearch">定位</el-button>
        </div>
        <!-- 时间跳转 -->
        <div class="time-jump flex items-center gap-2">
          <el-date-picker
            v-model="jumpTime"
            type="date"
            placeholder="跳转到日期"
            size="small"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 130px"
          />
          <el-button size="small" @click="handleTimeJump">跳转</el-button>
        </div>
        <TimeFilter :time-range="viewportState.timeRange" @change="setTimeRange" @reset="handleResetTimeRange" />
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="flex-1 flex min-h-0 overflow-hidden">
      <!-- 画布区域 -->
      <div class="canvas-area flex-1 min-h-0 overflow-hidden">
        <Canvas
          ref="canvasRef"
          :nodes="nodes"
          :swimlanes="swimlanes"
          :global-min-time="globalMinTime"
          :global-max-time="globalMaxTime"
          :pixels-per-second="viewportState.pixelsPerSecond"
          :canvas-config="canvasConfig"
          :highlighted-swimlane="highlightedSwimlane"
          @node-click="handleNodeClick"
        />
      </div>

      <!-- 右侧数据面板 -->
      <aside class="w-80 ml-4 border-l border-gray-200 bg-white overflow-hidden flex flex-col">
        <DataPanel
          :nodes="nodes"
          @add="handleAddNode"
          @change="handleImportNodes"
        />
        <!-- 节点详情 -->
        <div v-if="selectedNode" class="node-detail p-4 border-t border-gray-200">
          <h3 class="text-sm font-bold mb-2">节点详情</h3>
          <div class="text-sm space-y-1">
            <p><span class="text-gray-500">服务器：</span>{{ selectedNode.key }}</p>
            <p><span class="text-gray-500">目标：</span>{{ selectedNode.value }}</p>
            <p><span class="text-gray-500">开始：</span>{{ formatTime(selectedNode.startTime) }}</p>
            <p><span class="text-gray-500">结束：</span>{{ selectedNode.endTime ? formatTime(selectedNode.endTime) : '至今' }}</p>
            <p><span class="text-gray-500">状态：</span>
              <span v-if="selectedNode.value === selectedNode.key" class="text-green-600">独立运行</span>
              <span v-else class="text-orange-600">已合入 {{ selectedNode.value }}</span>
            </p>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from 'vue'
import { useMappingStore } from '@/stores/mapping'
import { storeToRefs } from 'pinia'
import type { MappingNode } from '@/types/mapping'
import Canvas from '@/components/Canvas/index.vue'
import DataPanel from '@/components/DataPanel/index.vue'
import TimeFilter from '@/components/Toolbar/TimeFilter.vue'
import seedData from '@/data/seed.json'
import { dbOperations } from '@/utils/db'
import dayjs from 'dayjs'

import { ElMessage } from 'element-plus'

const store = useMappingStore()
const { nodes, swimlanes, viewportState, canvasConfig, filteredNodes, globalTimeRange } = storeToRefs(store)
const { addNode, importNodes, loadData, setTimeRange } = store

const globalMinTime = computed(() => globalTimeRange.value.min)
const globalMaxTime = computed(() => globalTimeRange.value.max)

const isInitialized = ref(false)
const selectedNode = ref<MappingNode | null>(null)
const searchQuery = ref('')
const jumpTime = ref('')
const highlightedSwimlane = ref<string | null>(null)
const canvasRef = ref<InstanceType<typeof Canvas> | null>(null)

// 所有泳道 key 列表（用于搜索匹配）
const allSwimlaneKeys = computed(() => {
  const keys = new Set<string>()
  nodes.value.forEach(n => {
    keys.add(n.key)
    keys.add(n.value)
  })
  return Array.from(keys).sort()
})

function formatTime(time: string): string {
  return dayjs(time).format('YYYY-MM-DD')
}

// 搜索服务器并定位
function handleSearch() {
  const query = searchQuery.value.trim()
  if (!query) {
    highlightedSwimlane.value = null
    return
  }

  // 模糊匹配：支持 "1服"、"1" 等格式
  const matched = allSwimlaneKeys.value.find(key =>
    key === query || key.includes(query) || query.includes(key.replace('服', ''))
  )

  if (matched) {
    highlightedSwimlane.value = matched
    // 调用 Canvas 的定位方法
    canvasRef.value?.centerOnSwimlane(matched)
  } else {
    highlightedSwimlane.value = null
    ElMessage.warning(`未找到服务器: ${query}`)
  }
}

// 跳转到指定时间点
function handleTimeJump() {
  if (!jumpTime.value) return

  const targetTime = dayjs(jumpTime.value).toISOString()
  canvasRef.value?.centerOnTime(targetTime)
}

async function handleAddNode(node: MappingNode) {
  await addNode(node)
}

async function handleImportNodes(newNodes: MappingNode[]) {
  try {
    await importNodes(newNodes)

    // 更新泳道数据
    const keySet = new Set<string>()
    newNodes.forEach(n => {
      keySet.add(n.key)
      keySet.add(n.value)
    })
    const swimlaneKeys = Array.from(keySet).sort()

    await dbOperations.clearSwimlanes()
    for (let i = 0; i < swimlaneKeys.length; i++) {
      await dbOperations.addSwimlane({
        key: swimlaneKeys[i],
        label: swimlaneKeys[i],
        order: i,
        collapsed: false,
      })
    }

    await loadData()

    // 等待 Vue 响应式更新完成
    await nextTick()

    // 更新时间范围和缩放比例
    if (nodes.value.length > 0) {
      const { min, max } = globalTimeRange.value
      viewportState.value.timeRange = { start: min, end: max }

      const durationSeconds = (new Date(max).getTime() - new Date(min).getTime()) / 1000
      const targetWidth = 1000
      const calculatedPPS = targetWidth / durationSeconds
      viewportState.value.pixelsPerSecond = Math.max(
        canvasConfig.value.minPixelsPerSecond,
        Math.min(canvasConfig.value.maxPixelsPerSecond, calculatedPPS)
      )

      await nextTick()
    }
  } catch (e) {
    console.error('[Home] handleImportNodes ERROR:', e)
  }
}

function handleResetTimeRange() {
  setTimeRange({
    start: globalMinTime.value,
    end: globalMaxTime.value,
  })
}

function handleNodeClick(node: MappingNode) {
  selectedNode.value = node
}

onMounted(async () => {
  await loadData()

  // 如果没有数据，加载种子数据并初始化泳道
  if (nodes.value.length === 0) {
    const seedNodes = seedData as MappingNode[]
    await dbOperations.bulkAddNodes(seedNodes)

    // 从节点数据自动创建泳道
    const keySet = new Set<string>()
    seedNodes.forEach(n => {
      keySet.add(n.key)
      keySet.add(n.value)
    })
    const swimlaneKeys = Array.from(keySet).sort()
    for (let i = 0; i < swimlaneKeys.length; i++) {
      await dbOperations.addSwimlane({
        key: swimlaneKeys[i],
        label: swimlaneKeys[i],
        order: i,
        collapsed: false,
      })
    }

    await loadData()
  }

  // 根据数据时间范围自动计算合适的 pixelsPerSecond
  if (nodes.value.length > 0) {
    const { min, max } = globalTimeRange.value
    const durationSeconds = (new Date(max).getTime() - new Date(min).getTime()) / 1000
    // 希望时间轴占据约 1000 像素
    const targetWidth = 1000
    const calculatedPPS = targetWidth / durationSeconds
    // 确保在配置范围内
    const clampedPPS = Math.max(
      canvasConfig.value.minPixelsPerSecond,
      Math.min(canvasConfig.value.maxPixelsPerSecond, calculatedPPS)
    )
    viewportState.value.pixelsPerSecond = clampedPPS

    // 同时更新时间范围以覆盖所有数据
    viewportState.value.timeRange = {
      start: min,
      end: max,
    }
  }

  isInitialized.value = true
})
</script>

<style scoped>
.home {
  background: #f5f7fa;
  height: 100vh;
}

.toolbar {
  flex-shrink: 0;
}

.canvas-area {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.node-detail {
  background: #fafafa;
}
</style>