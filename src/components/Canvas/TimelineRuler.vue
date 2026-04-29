<template>
  <div class="timeline-ruler flex" :style="{ marginLeft: `${headerWidth}px` }">
    <div
      v-for="tick in ticks"
      :key="tick.time"
      class="tick flex flex-col items-center"
      :style="{ position: 'absolute', left: `${tick.x}px` }"
    >
      <span class="text-xs text-gray-500">{{ tick.label }}</span>
      <div class="w-px h-2 bg-gray-300"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps<{
  minTime: string
  maxTime: string
  pixelsPerSecond: number
  headerWidth: number
}>()

interface Tick {
  time: string
  x: number
  label: string
}

const ticks = computed<Tick[]>(() => {
  const start = dayjs(props.minTime)
  const end = dayjs(props.maxTime)
  const result: Tick[] = []

  const durationDays = end.diff(start, 'day')
  let intervalDays = 1
  if (durationDays > 365) intervalDays = 30
  else if (durationDays > 90) intervalDays = 7
  else if (durationDays > 30) intervalDays = 3

  let current = start.startOf('day')
  while (current.isBefore(end)) {
    const x = props.headerWidth + (current.diff(props.minTime, 'second') * props.pixelsPerSecond)
    result.push({
      time: current.toISOString(),
      x,
      label: current.format('MM-DD'),
    })
    current = current.add(intervalDays, 'day')
  }

  return result
})
</script>

<style scoped>
.timeline-ruler {
  position: relative;
  height: 40px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}
</style>