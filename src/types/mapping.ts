/**
 * 映射节点 - 表示一个服务器在某个时间段的状态
 */
export interface MappingNode {
  id: string
  key: string          // 泳道标识（服务器ID，如 "1服"）
  value: string        // 目标服务器ID（当 value === key 时表示独立运行）
  startTime: string    // ISO 时间字符串
  endTime: string | null  // null 表示"至今"
}

/**
 * 连线类型
 */
export type ConnectionType = 'evolution' | 'merge'

/**
 * 泳道数据
 */
export interface Swimlane {
  key: string
  label: string
  collapsed: boolean
  order: number
}

/**
 * 时间范围
 */
export interface TimeRange {
  start: string
  end: string
}

/**
 * 视口状态
 */
export interface ViewportState {
  timeRange: TimeRange
  currentTime: string | null
  pixelsPerSecond: number
}

/**
 * 画布配置
 */
export interface CanvasConfig {
  swimlaneHeight: number
  collapsedSwimlaneHeight: number
  headerWidth: number
  timeAxisHeight: number
  minPixelsPerSecond: number
  maxPixelsPerSecond: number
}

/**
 * 节点渲染数据
 */
export interface NodeRenderData {
  node: MappingNode
  x: number
  y: number
  width: number
  height: number
  swimlaneKey: string
}

/**
 * 连线渲染数据
 */
export interface ConnectionRenderData {
  id: string
  type: ConnectionType
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}