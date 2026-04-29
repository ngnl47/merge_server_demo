import dayjs from 'dayjs'
import type { MappingNode, CanvasConfig, NodeRenderData } from '@/types/mapping'

/**
 * 时间转 X 坐标
 */
export function timeToX(
  time: string,
  globalMinTime: string,
  pixelsPerSecond: number,
  headerWidth: number
): number {
  const timeMs = new Date(time).getTime()
  const minTimeMs = new Date(globalMinTime).getTime()
  const diffSeconds = (timeMs - minTimeMs) / 1000
  return headerWidth + diffSeconds * pixelsPerSecond
}

/**
 * X 坐标转时间
 */
export function xToTime(
  x: number,
  globalMinTime: string,
  pixelsPerSecond: number,
  headerWidth: number
): string {
  const minTimeMs = new Date(globalMinTime).getTime()
  const diffSeconds = (x - headerWidth) / pixelsPerSecond
  return new Date(minTimeMs + diffSeconds * 1000).toISOString()
}

/**
 * 泳道索引转 Y 坐标
 */
export function swimlaneIndexToY(
  index: number,
  swimlaneKeys: string[],
  swimlanes: { key: string; collapsed: boolean }[],
  config: CanvasConfig
): number {
  let y = config.timeAxisHeight
  for (let i = 0; i < index; i++) {
    const key = swimlaneKeys[i]
    const swimlane = swimlanes.find(s => s.key === key)
    const height = swimlane?.collapsed ? config.collapsedSwimlaneHeight : config.swimlaneHeight
    y += height
  }
  return y
}

/**
 * 获取泳道高度
 */
export function getSwimlaneHeight(
  key: string,
  swimlanes: { key: string; collapsed: boolean }[],
  config: CanvasConfig
): number {
  const swimlane = swimlanes.find(s => s.key === key)
  return swimlane?.collapsed ? config.collapsedSwimlaneHeight : config.swimlaneHeight
}

/**
 * 计算节点渲染数据
 */
export function calculateNodeRenderData(
  node: MappingNode,
  swimlaneIndex: number,
  swimlaneKeys: string[],
  swimlanes: { key: string; collapsed: boolean }[],
  globalMinTime: string,
  pixelsPerSecond: number,
  config: CanvasConfig
): NodeRenderData {
  const x = timeToX(node.startTime, globalMinTime, pixelsPerSecond, config.headerWidth)
  const y = swimlaneIndexToY(swimlaneIndex, swimlaneKeys, swimlanes, config)
  const height = getSwimlaneHeight(node.key, swimlanes, config)

  // 计算宽度
  const startTimeMs = new Date(node.startTime).getTime()
  const endTimeMs = node.endTime ? new Date(node.endTime).getTime() : Date.now()
  const durationSeconds = (endTimeMs - startTimeMs) / 1000
  const width = Math.max(20, durationSeconds * pixelsPerSecond) // 最小宽度 20px

  return {
    node,
    x,
    y,
    width,
    height,
    swimlaneKey: node.key,
  }
}

/**
 * 批量计算节点渲染数据
 */
export function calculateAllNodeRenderData(
  nodes: MappingNode[],
  swimlanes: { key: string; collapsed: boolean }[],
  globalMinTime: string,
  pixelsPerSecond: number,
  config: CanvasConfig
): NodeRenderData[] {
  // 构建泳道 Key 列表（包括所有 key 和 value）
  const keySet = new Set<string>()
  nodes.forEach(n => {
    keySet.add(n.key)
    keySet.add(n.value)
  })
  const swimlaneKeys = Array.from(keySet).sort()

  return nodes.map(node => {
    const index = swimlaneKeys.indexOf(node.key)
    return calculateNodeRenderData(
      node,
      index,
      swimlaneKeys,
      swimlanes,
      globalMinTime,
      pixelsPerSecond,
      config
    )
  })
}

/**
 * 计算画布总宽度
 */
export function calculateCanvasWidth(
  globalMinTime: string,
  globalMaxTime: string,
  pixelsPerSecond: number,
  headerWidth: number
): number {
  const minMs = new Date(globalMinTime).getTime()
  const maxMs = new Date(globalMaxTime).getTime()
  const durationSeconds = (maxMs - minMs) / 1000
  return headerWidth + durationSeconds * pixelsPerSecond + 100
}

/**
 * 格式化时间显示
 */
export function formatTimeRange(startTime: string, endTime: string | null): string {
  const start = dayjs(startTime).format('YYYY-MM-DD')
  const end = endTime ? dayjs(endTime).format('YYYY-MM-DD') : '至今'
  return `${start} ~ ${end}`
}