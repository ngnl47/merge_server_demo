<template>
  <div class="json-editor">
    <div class="toolbar mb-2">
      <el-button size="small" @click="handleFormat">格式化</el-button>
      <el-button size="small" type="primary" @click="handleApply">应用更改</el-button>
    </div>
    <textarea
      ref="textareaRef"
      class="editor-textarea w-full h-64 p-2 border border-gray-300 rounded font-mono text-sm"
      v-model="jsonText"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { MappingNode } from '@/types/mapping'

const props = defineProps<{
  nodes: MappingNode[]
}>()

const emit = defineEmits<{
  change: [nodes: MappingNode[]]
}>()

const textareaRef = ref<HTMLTextAreaElement>()
const jsonText = ref('')

watch(() => props.nodes, (newNodes) => {
  jsonText.value = JSON.stringify(newNodes, null, 2)
}, { immediate: true, deep: true })

function handleFormat() {
  try {
    const parsed = JSON.parse(jsonText.value)
    jsonText.value = JSON.stringify(parsed, null, 2)
  } catch {
    // 不格式化无效 JSON
  }
}

function handleApply() {
  try {
    const parsed = JSON.parse(jsonText.value)
    if (Array.isArray(parsed)) {
      emit('change', parsed as MappingNode[])
    }
  } catch {
    // 忽略无效 JSON
  }
}
</script>

<style scoped>
.json-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-textarea {
  flex: 1;
  resize: none;
}
</style>