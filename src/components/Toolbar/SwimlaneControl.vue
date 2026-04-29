<template>
  <div class="swimlane-control flex items-center gap-2">
    <span class="text-sm text-gray-600">泳道:</span>
    <el-button size="small" @click="$emit('expand-all')">全部展开</el-button>
    <el-button size="small" @click="$emit('collapse-all')">全部折叠</el-button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  'expand-all': []
  'collapse-all': []
}>()
</script>