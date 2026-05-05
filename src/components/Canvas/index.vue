<template>
  <div class="canvas-container flex flex-col flex-1 overflow-hidden">
    <!-- X6 画布（包含时间刻度） -->
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'
import GraphCanvas from './GraphCanvas.vue'

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

const graphCanvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null)

// 暴露方法给父组件
function centerOnSwimlane(key: string) {
  graphCanvasRef.value?.centerOnSwimlane(key)
}

function centerOnTime(time: string) {
  graphCanvasRef.value?.centerOnTime(time)
}

defineExpose({
  centerOnSwimlane,
  centerOnTime,
})
</script>

<style scoped>
.canvas-container {
  background: #f5f7fa;
}
</style>