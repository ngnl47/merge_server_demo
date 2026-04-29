<template>
  <div class="canvas-container flex flex-col h-full">
    <!-- 时间轴标尺 -->
    <TimelineRuler
      :min-time="globalMinTime"
      :max-time="globalMaxTime"
      :pixels-per-second="pixelsPerSecond"
      :header-width="headerWidth"
    />
    <div class="flex flex-1 overflow-hidden">
      <!-- 泳道标签 -->
      <SwimlaneLabel
        :swimlane-keys="swimlaneKeys"
        :swimlanes="swimlanes"
        :config="canvasConfig"
        @toggle-collapse="$emit('toggle-collapse', $event)"
      />
      <!-- X6 画布 -->
      <GraphCanvas
        ref="graphCanvasRef"
        :nodes="nodes"
        :swimlanes="swimlanes"
        :global-min-time="globalMinTime"
        :pixels-per-second="pixelsPerSecond"
        :config="canvasConfig"
        :current-time="currentTime"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MappingNode, Swimlane, CanvasConfig } from '@/types/mapping'
import TimelineRuler from './TimelineRuler.vue'
import SwimlaneLabel from './SwimlaneLabel.vue'
import GraphCanvas from './GraphCanvas.vue'

const props = defineProps<{
  nodes: MappingNode[]
  swimlanes: Swimlane[]
  globalMinTime: string
  globalMaxTime: string
  pixelsPerSecond: number
  canvasConfig: CanvasConfig
  currentTime: string | null
}>()

defineEmits<{
  'toggle-collapse': [key: string]
}>()

const swimlaneKeys = computed(() => {
  const keySet = new Set<string>()
  props.nodes.forEach(n => {
    keySet.add(n.key)
    keySet.add(n.value)
  })
  return Array.from(keySet).sort()
})

const headerWidth = computed(() => props.canvasConfig.headerWidth)
</script>

<style scoped>
.canvas-container {
  background: #f5f7fa;
}
</style>