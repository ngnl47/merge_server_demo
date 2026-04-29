<template>
  <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" size="small">
    <el-form-item label="服务器" prop="key">
      <el-input v-model="form.key" placeholder="如: 1服" />
    </el-form-item>
    <el-form-item label="目标服" prop="value">
      <el-input v-model="form.value" placeholder="指向的服务器" />
    </el-form-item>
    <el-form-item label="开始时间" prop="startTime">
      <el-date-picker
        v-model="form.startTime"
        type="datetime"
        placeholder="选择开始时间"
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DDTHH:mm:ss"
      />
    </el-form-item>
    <el-form-item label="结束时间" prop="endTime">
      <el-date-picker
        v-model="form.endTime"
        type="datetime"
        placeholder="留空表示至今"
        format="YYYY-MM-DD HH:mm:ss"
        value-format="YYYY-MM-DDTHH:mm:ss"
        clearable
      />
    </el-form-item>
    <el-form-item>
      <el-button type="primary" @click="handleSubmit">添加</el-button>
      <el-button @click="handleReset">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { MappingNode } from '@/types/mapping'

const emit = defineEmits<{
  submit: [node: MappingNode]
}>()

const formRef = ref<FormInstance>()

const form = reactive({
  key: '',
  value: '',
  startTime: '',
  endTime: '' as string | null,
})

const rules: FormRules = {
  key: [{ required: true, message: '请输入服务器', trigger: 'blur' }],
  value: [{ required: true, message: '请输入目标服', trigger: 'blur' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  const node: MappingNode = {
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key: form.key,
    value: form.value,
    startTime: new Date(form.startTime).toISOString(),
    endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
  }

  emit('submit', node)
  handleReset()
}

function handleReset() {
  formRef.value?.resetFields()
  form.endTime = null
}
</script>