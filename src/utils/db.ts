import Dexie, { type EntityTable } from 'dexie'
import type { MappingNode, Swimlane } from '@/types/mapping'

/**
 * 合服数据库
 */
class MergeServerDB extends Dexie {
  nodes!: EntityTable<MappingNode, 'id'>
  swimlanes!: EntityTable<Swimlane, 'key'>

  constructor() {
    super('MergeServerTimeline')

    this.version(1).stores({
      nodes: 'id, key, startTime, endTime, value',
      swimlanes: 'key, order',
    })
  }
}

export const db = new MergeServerDB()

/**
 * 数据库操作封装
 */
export const dbOperations = {
  // 节点操作
  async getAllNodes(): Promise<MappingNode[]> {
    return await db.nodes.toArray()
  },

  async getNodesByTimeRange(start: string, end: string): Promise<MappingNode[]> {
    const allNodes = await db.nodes.toArray()
    return allNodes.filter(node => {
      const nodeStart = new Date(node.startTime).getTime()
      const nodeEnd = node.endTime ? new Date(node.endTime).getTime() : Infinity
      const rangeStart = new Date(start).getTime()
      const rangeEnd = new Date(end).getTime()
      return nodeStart < rangeEnd && nodeEnd > rangeStart
    })
  },

  async getNodesByKey(key: string): Promise<MappingNode[]> {
    return await db.nodes.where('key').equals(key).toArray()
  },

  async addNode(node: MappingNode): Promise<string> {
    return await db.nodes.add(node)
  },

  async updateNode(id: string, changes: Partial<MappingNode>): Promise<number> {
    return await db.nodes.update(id, changes)
  },

  async deleteNode(id: string): Promise<void> {
    await db.nodes.delete(id)
  },

  async clearNodes(): Promise<void> {
    await db.nodes.clear()
  },

  async bulkAddNodes(nodes: MappingNode[]): Promise<void> {
    await db.nodes.bulkAdd(nodes)
  },

  // 泳道操作
  async getAllSwimlanes(): Promise<Swimlane[]> {
    return await db.swimlanes.orderBy('order').toArray()
  },

  async addSwimlane(swimlane: Swimlane): Promise<void> {
    await db.swimlanes.add(swimlane)
  },

  async updateSwimlane(key: string, changes: Partial<Swimlane>): Promise<number> {
    return await db.swimlanes.update(key, changes)
  },

  async deleteSwimlane(key: string): Promise<void> {
    await db.swimlanes.delete(key)
  },

  async clearSwimlanes(): Promise<void> {
    await db.swimlanes.clear()
  },

  // 获取所有唯一的泳道 Key（包括 key 和 value）
  async getUniqueKeys(): Promise<string[]> {
    const nodes = await db.nodes.toArray()
    const keys = new Set<string>()
    nodes.forEach(n => {
      keys.add(n.key)
      keys.add(n.value)
    })
    return Array.from(keys).sort()
  },

  // 清空所有数据
  async clearAll(): Promise<void> {
    await Promise.all([
      db.nodes.clear(),
      db.swimlanes.clear(),
    ])
  },

  // 导出数据
  async exportData(): Promise<{ nodes: MappingNode[]; swimlanes: Swimlane[] }> {
    const [nodes, swimlanes] = await Promise.all([
      db.nodes.toArray(),
      db.swimlanes.toArray(),
    ])
    return { nodes, swimlanes }
  },

  // 导入数据
  async importData(data: { nodes: MappingNode[]; swimlanes: Swimlane[] }): Promise<void> {
    await this.clearAll()
    await Promise.all([
      data.nodes.length > 0 ? db.nodes.bulkAdd(data.nodes) : Promise.resolve(),
      data.swimlanes.length > 0 ? db.swimlanes.bulkAdd(data.swimlanes) : Promise.resolve(),
    ])
  },
}

export default dbOperations