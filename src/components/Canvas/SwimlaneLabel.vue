<template>
  <div class="swimlane-labels flex flex-col bg-white border-r border-gray-200">
    <div
      v-for="key in swimlaneKeys"
      :key="key"
      class="swimlane-label flex items-center px-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
      :style="{ height: `${getHeight(key)}px` }"
      @click="$emit('toggle-collapse', key)"
    >
      <el-icon class="mr-1 text-gray-400">
        <ArrowRight v-if="isCollapsed(key)" />
        <ArrowDown v-else />
      </el-icon>
      <span class="text-sm font-medium">{{ key }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import type { Swimlane, CanvasConfig } from '@/types/mapping'

const props = defineProps<{
  swimlaneKeys: string[]
  swimlanes: Swimlane[]
  config: CanvasConfig
}>()

defineEmits<{
  'toggle-collapse': [key: string]
}>()

function isCollapsed(key: string): boolean {
  const swimlane = props.swimlanes.find(s => s.key === key)
  return swimlane?.collapsed ?? false
}

function getHeight(key: string): number {
  return isCollapsed(key) ? props.config.collapsedSwimlaneHeight : props.config.swimlaneHeight
}
</script>

<style scoped>
.swimlane-labels {
  width: 120px;
  flex-shrink: 0;
}
</style>