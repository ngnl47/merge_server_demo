import type { MappingNode, ConnectionRenderData, ConnectionType, CanvasConfig } from '@/types/mapping'
import { timeToX, swimlaneIndexToY, getSwimlaneHeight } from './timeAxis'

/**
 * 连线数据结构（内部使用）
 */
interface Connection {
  id: string
  type: ConnectionType
  sourceNodeId: string
  targetNodeId: string
}

/**
 * 计算演进线（同一泳道内的连续节点）
 */
function calculateEvolutionConnections(nodes: MappingNode[]): Connection[] {
  const connections: Connection[] = []

  // 按 key 分组
  const nodesByKey = new Map<string, MappingNode[]>()
  nodes.forEach(node => {
    const list = nodesByKey.get(node.key) || []
    list.push(node)
    nodesByKey.set(node.key, list)
  })

  // 每个泳道内按时间排序
  nodesByKey.forEach((swimlaneNodes) => {
    const sorted = [...swimlaneNodes].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    // 相邻节点连成演进线
    for (let i = 0; i < sorted.length - 1; i++) {
      const source = sorted[i]
      const target = sorted[i + 1]
      connections.push({
        id: `evo-${source.id}-${target.id}`,
        type: 'evolution',
        sourceNodeId: source.id,
        targetNodeId: target.id,
      })
    }
  })

  return connections
}

/**
 * 计算汇入线（跨泳道的合并关系）
 * 当 node.value !== node.key 时，表示该服务器合入目标服务器
 */
function calculateMergeConnections(nodes: MappingNode[]): Connection[] {
  const connections: Connection[] = []

  nodes.forEach(node => {
    // 只有当 value !== key 时才需要汇入线
    if (node.value === node.key) return

    // 找到目标泳道中对应时间的节点（被合入的服务器）
    const targetNodes = nodes.filter(n =>
      n.key === node.value &&
      new Date(n.startTime).getTime() <= new Date(node.startTime).getTime() &&
      (n.endTime === null || new Date(n.endTime!).getTime() > new Date(node.startTime).getTime())
    )

    if (targetNodes.length > 0) {
      // 选择时间最近的节点
      const target = targetNodes.reduce((closest, n) => {
        const nTime = new Date(n.startTime).getTime()
        const closestTime = new Date(closest.startTime).getTime()
        return nTime > closestTime ? n : closest
      })

      // source 是发起合入的节点（当前节点），target 是被合入的目标泳道节点
      connections.push({
        id: `merge-${node.id}-${target.id}`,
        type: 'merge',
        sourceNodeId: node.id,      // 发起合入的节点
        targetNodeId: target.id,    // 目标泳道中的节点
      })
    }
  })

  return connections
}

/**
 * 计算所有连线
 */
export function calculateAllConnections(nodes: MappingNode[]): Connection[] {
  return [
    ...calculateEvolutionConnections(nodes),
    ...calculateMergeConnections(nodes),
  ]
}

/**
 * 计算演进线渲染数据
 */
function calculateEvolutionRenderData(
  connection: Connection,
  sourceNode: MappingNode,
  targetNode: MappingNode,
  sourceSwimlaneIndex: number,
  targetSwimlaneIndex: number,
  swimlaneKeys: string[],
  swimlanes: { key: string; collapsed: boolean }[],
  globalMinTime: string,
  pixelsPerSecond: number,
  config: CanvasConfig
): ConnectionRenderData {
  // 演进线：从源节点右边缘到目标节点左边缘
  const sourceEndTime = sourceNode.endTime || new Date().toISOString()
  const sourceX = timeToX(sourceEndTime, globalMinTime, pixelsPerSecond, config.headerWidth)
  const sourceY = swimlaneIndexToY(sourceSwimlaneIndex, swimlaneKeys, swimlanes, config)
    + config.swimlaneHeight / 2

  const targetX = timeToX(targetNode.startTime, globalMinTime, pixelsPerSecond, config.headerWidth)
  const targetY = swimlaneIndexToY(targetSwimlaneIndex, swimlaneKeys, swimlanes, config)
    + config.swimlaneHeight / 2

  return {
    id: connection.id,
    type: connection.type,
    sourceX,
    sourceY,
    targetX,
    targetY,
  }
}

/**
 * 计算汇入线渲染数据
 */
function calculateMergeRenderData(
  connection: Connection,
  sourceNode: MappingNode,
  targetNode: MappingNode,
  sourceSwimlaneIndex: number,
  targetSwimlaneIndex: number,
  swimlaneKeys: string[],
  swimlanes: { key: string; collapsed: boolean }[],
  globalMinTime: string,
  pixelsPerSecond: number,
  config: CanvasConfig
): ConnectionRenderData {
  // 汇入线：从发起合入节点（sourceNode）左边缘，向下（或向上）连到目标泳道节点（targetNode）
  // sourceNode 是当前节点（发起合入），targetNode 是目标泳道中的节点

  const sourceX = timeToX(sourceNode.startTime, globalMinTime, pixelsPerSecond, config.headerWidth)
  const sourceY = swimlaneIndexToY(sourceSwimlaneIndex, swimlaneKeys, swimlanes, config)
    + config.swimlaneHeight / 2

  // 目标点：目标泳道节点中点偏左一点（便于视觉识别）
  const targetX = timeToX(sourceNode.startTime, globalMinTime, pixelsPerSecond, config.headerWidth)
  const targetY = swimlaneIndexToY(targetSwimlaneIndex, swimlaneKeys, swimlanes, config)
    + config.swimlaneHeight / 2

  return {
    id: connection.id,
    type: connection.type,
    sourceX,
    sourceY,
    targetX,
    targetY,
  }
}

/**
 * 批量计算连线渲染数据
 */
export function calculateAllConnectionRenderData(
  nodes: MappingNode[],
  swimlanes: { key: string; collapsed: boolean }[],
  globalMinTime: string,
  pixelsPerSecond: number,
  config: CanvasConfig
): ConnectionRenderData[] {
  // 构建泳道 Key 列表
  const keySet = new Set<string>()
  nodes.forEach(n => {
    keySet.add(n.key)
    keySet.add(n.value)
  })
  const swimlaneKeys = Array.from(keySet).sort()

  // 节点 ID 映射
  const nodeMap = new Map<string, MappingNode>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  // 计算所有连线
  const connections = calculateAllConnections(nodes)

  return connections.map(conn => {
    const sourceNode = nodeMap.get(conn.sourceNodeId)!
    const targetNode = nodeMap.get(conn.targetNodeId)!
    const sourceIndex = swimlaneKeys.indexOf(sourceNode.key)
    const targetIndex = swimlaneKeys.indexOf(targetNode.key)

    if (conn.type === 'merge') {
      return calculateMergeRenderData(
        conn,
        sourceNode,
        targetNode,
        sourceIndex,
        targetIndex,
        swimlaneKeys,
        swimlanes,
        globalMinTime,
        pixelsPerSecond,
        config
      )
    } else {
      return calculateEvolutionRenderData(
        conn,
        sourceNode,
        targetNode,
        sourceIndex,
        targetIndex,
        swimlaneKeys,
        swimlanes,
        globalMinTime,
        pixelsPerSecond,
        config
      )
    }
  })
}

export type { Connection }