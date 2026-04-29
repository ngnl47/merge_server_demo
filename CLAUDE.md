# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

合服时间轴可视化系统 - 基于 AntV X6 的游戏服务器合并管理可视化工具。

## Commands

```bash
# 开发
npm run dev

# 构建
npm run build

# 类型检查
npm run build:check

# 预览构建结果
npm run preview
```

## Architecture

```
src/
├── components/       # Vue 组件
│   ├── Canvas/       # X6 画布相关
│   ├── DataPanel/    # 数据录入面板
│   ├── TimelineSlider/ # 时间滑块
│   └── Toolbar/      # 工具栏
├── stores/           # Pinia 状态管理
├── utils/            # 工具函数
│   ├── db.ts         # IndexedDB 封装
│   ├── timeAxis.ts   # 时间-坐标转换
│   └── connectionEngine.ts # 连线计算
├── types/            # TypeScript 类型定义
├── views/            # 页面组件
└── data/             # 种子数据
```

## Key Concepts

- **泳道 (Swimlane)**: 每个游戏服务器对应一个泳道
- **节点 (Node)**: 服务器在某个时间段的状态，value === key 表示独立运行
- **演进线**: 同一泳道内相邻时间段的连线
- **汇入线**: 跨泳道的合并关系连线（value !== key 时）
- **链式合服**: 支持级联合并，如 3服→2服→1服