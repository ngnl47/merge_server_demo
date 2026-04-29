<template>
  <div class="timeline-slider">
    <div class="slider-track" ref="trackRef" @click="handleTrackClick">
      <div
        class="slider-thumb"
        :style="{ left: `${thumbPosition}px` }"
        @mousedown="handleMouseDown"
      ></div>
      <div
        v-if="currentTime"
        class="time-indicator"
        :style="{ left: `${thumbPosition}px` }"
      ></div>
    </div>
    <div class="time-display">
      <span>{{ formattedCurrentTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'

const props = defineProps<{
  minTime: string
  maxTime: string
  currentTime: string | null
  pixelsPerSecond: number
}>()

const emit = defineEmits<{
  'update:currentTime': [time: string | null]
}>()

const trackRef = ref<HTMLDivElement>()
const isDragging = ref(false)
const trackWidth = ref(0)

const minTimeMs = computed(() => new Date(props.minTime).getTime())
const maxTimeMs = computed(() => new Date(props.maxTime).getTime())
const durationMs = computed(() => maxTimeMs.value - minTimeMs.value)

const thumbPosition = computed(() => {
  if (!props.currentTime) return 0
  const currentMs = new Date(props.currentTime).getTime()
  const ratio = (currentMs - minTimeMs.value) / durationMs.value
  return Math.max(0, Math.min(1, ratio)) * trackWidth.value
})

const formattedCurrentTime = computed(() => {
  if (!props.currentTime) return '拖动选择时间点'
  return dayjs(props.currentTime).format('YYYY-MM-DD HH:mm:ss')
})

function positionToTime(x: number): string {
  const ratio = x / trackWidth.value
  const timeMs = minTimeMs.value + ratio * durationMs.value
  return new Date(timeMs).toISOString()
}

function handleTrackClick(e: MouseEvent) {
  if (!trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const time = positionToTime(x)
  emit('update:currentTime', time)
}

function handleMouseDown(e: MouseEvent) {
  isDragging.value = true
  e.preventDefault()
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value || !trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const x = Math.max(0, Math.min(trackWidth.value, e.clientX - rect.left))
  const time = positionToTime(x)
  emit('update:currentTime', time)
}

function handleMouseUp() {
  isDragging.value = false
}

onMounted(() => {
  if (trackRef.value) {
    trackWidth.value = trackRef.value.clientWidth
  }
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
.timeline-slider {
  padding: 8px 16px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.slider-track {
  position: relative;
  height: 20px;
  background: #f5f7fa;
  border-radius: 4px;
  cursor: pointer;
}

.slider-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: #409eff;
  border-radius: 50%;
  cursor: grab;
  z-index: 2;
}

.slider-thumb:active {
  cursor: grabbing;
}

.time-indicator {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #409eff;
  transform: translateX(-50%);
  z-index: 1;
}

.time-display {
  margin-top: 8px;
  text-align: center;
  font-size: 14px;
  color: #606266;
}
</style>