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