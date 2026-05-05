<template>
  <div class="canvas-container flex flex-col flex-1 overflow-hidden">
    <el-tabs v-model="activeTab" class="canvas-tabs">
      <el-tab-pane label="Git风格" name="git">
        <GitGraphCanvas
          ref="gitGraphCanvasRef"
          :nodes="nodes"
          :swimlanes="swimlanes"
          :global-min-time="globalMinTime"
          :global-max-time="globalMaxTime"
          :pixels-per-second="pixelsPerSecond"
          :config="canvasConfig"
          :highlighted-swimlane="highlightedSwimlane"
          @node-click="$emit('node-click', $event)"
        />
      </el-tab-pane>
      <el-tab-pane label="泳道图" name="swimlane">
        <GraphCanvas
          ref="graphCanvasRef"
          :nodes="nodes"
          :swimlanes="swimlanes"
          :global-min-time="globalMinTime"
          :global-max-time="globalMaxTime"
          :pixels-per-second="pixelsPerSecond"
          :config="canvasConfig"
          :highlighted-swimlane="highlightedSwimlane"
          @node-click="$emit('node-click', $event)"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'
import GraphCanvas from './GraphCanvas.vue'
import GitGraphCanvas from './GitGraphCanvas.vue'

const props = defineProps<{
  nodes: MappingNode[]
  swimlanes: Swimlane[]
  globalMinTime: string
  globalMaxTime: string
  pixelsPerSecond: number
  canvasConfig: CanvasConfig
  highlightedSwimlane: string | null
}>()

defineEmits<{
  'node-click': [node: MappingNode]
}>()

const activeTab = ref('git')
const graphCanvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null)
const gitGraphCanvasRef = ref<InstanceType<typeof GitGraphCanvas> | null>(null)

// Tab 切换时触发 resize
watch(activeTab, async (newTab) => {
  await nextTick()
  // 等待 Tab 动画完成后触发 resize
  setTimeout(() => {
    if (newTab === 'swimlane') {
      // 泳道图 Tab 激活时，强制重新初始化尺寸
      graphCanvasRef.value?.forceResize()
    }
  }, 50)
})

// 暴露方法给父组件
function centerOnSwimlane(key: string) {
  if (activeTab.value === 'git') {
    gitGraphCanvasRef.value?.centerOnSwimlane(key)
  } else {
    graphCanvasRef.value?.centerOnSwimlane(key)
  }
}

function centerOnTime(time: string) {
  if (activeTab.value === 'git') {
    gitGraphCanvasRef.value?.centerOnTime(time)
  } else {
    graphCanvasRef.value?.centerOnTime(time)
  }
}

defineExpose({
  centerOnSwimlane,
  centerOnTime,
})
</script>

<style scoped>
.canvas-container {
  background: #f5f7fa;
  height: 100%;
}

.canvas-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__header) {
  margin-bottom: 0;
  background: #fff;
  flex-shrink: 0;
}

:deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

:deep(.el-tab-pane) {
  height: 100%;
  padding: 0;
}

:deep(.graph-canvas),
:deep(.git-graph-canvas) {
  height: 100%;
}
</style>