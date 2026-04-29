<template>
  <div class="time-filter flex items-center gap-2">
    <span class="text-sm text-gray-600">时间范围:</span>
    <el-date-picker
      v-model="timeRange"
      type="datetimerange"
      range-separator="至"
      start-placeholder="开始时间"
      end-placeholder="结束时间"
      format="YYYY-MM-DD HH:mm:ss"
      value-format="YYYY-MM-DDTHH:mm:ss"
      size="small"
      @change="handleChange"
    />
    <el-button size="small" @click="handleReset">重置</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TimeRange } from '@/types/mapping'

const props = defineProps<{
  timeRange: TimeRange
}>()

const emit = defineEmits<{
  change: [range: TimeRange]
  reset: []
}>()

const timeRange = ref<[string, string]>([
  props.timeRange.start,
  props.timeRange.end,
])

watch(() => props.timeRange, (newRange) => {
  timeRange.value = [newRange.start, newRange.end]
})

function handleChange(value: [string, string] | null) {
  if (value) {
    emit('change', {
      start: new Date(value[0]).toISOString(),
      end: new Date(value[1]).toISOString(),
    })
  }
}

function handleReset() {
  emit('reset')
}
</script>