<template>
  <el-tabs v-model="activeTab" class="data-panel">
    <el-tab-pane label="表单录入" name="form">
      <FormInput @submit="handleSubmit" />
    </el-tab-pane>
    <el-tab-pane label="JSON编辑" name="json">
      <JsonEditor :nodes="nodes" @change="handleJsonChange" />
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { MappingNode } from '@/types/mapping'
import FormInput from './FormInput.vue'
import JsonEditor from './JsonEditor.vue'

defineProps<{
  nodes: MappingNode[]
}>()

const emit = defineEmits<{
  add: [node: MappingNode]
  change: [nodes: MappingNode[]]
}>()

const activeTab = ref('form')

function handleSubmit(node: MappingNode) {
  emit('add', node)
}

function handleJsonChange(nodes: MappingNode[]) {
  emit('change', nodes)
}
</script>

<style scoped>
.data-panel {
  height: 100%;
  padding: 16px;
}

:deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow: auto;
}

:deep(.el-tab-pane) {
  height: 100%;
}
</style>