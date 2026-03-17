# Agent Monitor 项目设计报告

## 项目概述

Agent Monitor 是一个实时可视化监控工具，用于通过 MQTT 协议展示 Pi Coding Agent 的事件流。项目采用 Next.js + React + TypeScript 技术栈，实现了卡片式的时间线界面，能够实时渲染 Agent 的各种事件。

**核心功能**：
- 实时接收并显示 MQTT 事件流
- 区分不同类型的事件（session、turn、message、tool）
- 支持暗色/亮色主题切换
- 手动连接/断开 MQTT 服务器
- 事件时间线展示与交互

## 系统架构

### 1. 整体架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Pi Agent      │────│   MQTT Broker   │────│   Agent Monitor │
│   + mqtt-monitor│    │   (ws:9001)     │    │   (Next.js App) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                      ┌───────┴───────┐
                      │  WebSocket    │
                      │   Connection  │
                      └───────────────┘
```

### 2. 项目目录结构

```
agent-monitor/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # 根布局（主题字体）
│   │   └── page.tsx           # 主页面（控制面板）
│   │
│   └── viewer/                # 核心监控组件库
│       ├── index.ts           # 组件导出入口
│       ├── types/             # 类型定义
│       │   └── agentEvent.ts  # 事件类型定义
│       ├── store/             # 状态管理
│       │   ├── eventStore.ts  # 事件状态存储
│       │   └── themeStore.ts  # 主题状态存储
│       ├── mqtt/              # MQTT 客户端
│       │   └── mqttClient.ts  # MQTT 连接管理
│       └── components/        # UI 组件
│           ├── AgentEventCard.tsx  # 主卡片组件
│           ├── EventTimeline.tsx   # 时间线容器
│           └── EventNode.tsx       # 事件节点
├── public/                    # 静态资源
└── package.json              # 项目依赖
```

## 3. 核心组件关系

### 数据流
```
MQTT Client → Event Store → UI Components
    ↓              ↓             ↓
连接管理      状态更新      渲染展示
```

### 组件层级
```
App (page.tsx)
├── Header (主题切换 + 标题)
├── Control Panel (连接控制 + 状态栏)
└── AgentEventCard (主卡片)
    ├── Head (机器信息 + 用户消息 + Turn状态)
    ├── Body (EventTimeline)
    │   └── EventNode × N (事件节点)
    └── Foot (Turn信息 + Token统计 + 连接状态)
```

## 4. 数据管理

### 4.1 事件类型系统 (`src/viewer/types/agentEvent.ts`)

**核心类型**：
```typescript
// 基础事件类型
type EventType = 'session_start' | 'session_shutdown' | 'turn_start' | 'turn_end' | 'message' | 'tool';

// 消息子类型
type MessageSubtype = 'user' | 'assistant' | 'assistant-think';

// 原始事件接口
interface AgentEvent = SessionStartEvent | SessionShutdownEvent | TurnStartEvent | TurnEndEvent | MessageEvent | ToolEvent;

// UI 事件接口
interface UIEvent {
  id: string;           // 唯一标识
  type: EventType;      // 事件类型
  label: string;        // 显示标签
  icon: string;         // 显示图标
  color: string;        // 主题颜色
  timestamp: number;    // 时间戳
  machineName?: string; // 机器名称
  sessionId?: string;   // 会话ID
  raw: AgentEvent;      // 原始事件
  messageSubtype?: MessageSubtype;  // 消息子类型
  messageContent?: string;          // 消息内容
}
```

**事件配置映射**：
```typescript
const EVENT_CONFIG: Record<EventType, { label: string; icon: string; color: string }> = {
  session_start: { label: 'session_start', icon: '🟢', color: '#22c55e' },
  session_shutdown: { label: 'session_shutdown', icon: '🔴', color: '#ef4444' },
  turn_start: { label: 'turn_start', icon: '🔵', color: '#3b82f6' },
  turn_end: { label: 'turn_end', icon: '🟣', color: '#8b5cf6' },
  message: { label: 'message', icon: '💬', color: '#f59e0b' },
  tool: { label: 'tool', icon: '🔧', color: '#06b6d4' },
};

const MESSAGE_SUBTYPE_CONFIG: Record<MessageSubtype, { label: string; icon: string; color: string }> = {
  'user': { label: 'user', icon: '👤', color: '#3b82f6' },
  'assistant': { label: 'assistant', icon: '🤖', color: '#10b981' },
  'assistant-think': { label: 'think', icon: '💭', color: '#f59e0b' },
};
```

### 4.2 事件存储 (`src/viewer/store/eventStore.ts`)

**状态接口**：
```typescript
interface EventStore {
  // 原始事件
  rawEvents: RawMQTTMessage[];
  events: UIEvent[];
  
  // 连接状态
  isConnected: boolean;
  
  // Turn 状态
  isTurnActive: boolean;
  currentTurnIndex: number;
  currentInputTokens: number;
  currentOutputTokens: number;
  currentTotalTokens: number;
  currentTools: number;
  
  // 显示信息
  lastUserMessage: string;
  currentMachineName: string;
  currentSessionId: string;
  
  // 操作方法
  push: (raw: RawMQTTMessage) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}
```

**关键机制**：
1. **事件转换**：`toUIEvents()` 函数将原始 MQTT 消息转换为 UI 事件
   - 普通事件：1:1 转换
   - Message 事件：可能拆分为多个 UI 事件（user/think/assistant）
2. **事件过滤**：`turn_start` 和 `turn_end` 事件不显示在时间线中
3. **数量限制**：最多保留 200 个事件，防止内存泄漏
4. **状态更新**：根据事件类型更新相关状态

### 4.3 主题存储 (`src/viewer/store/themeStore.ts`)

**状态接口**：
```typescript
interface ThemeStore {
  theme: 'light' | 'dark';  // 当前主题
  toggleTheme: () => void;   // 切换主题
  setTheme: (theme: 'light' | 'dark') => void;  // 设置主题
}
```

**特性**：
- 使用 `zustand/persist` 持久化存储到 localStorage
- 默认主题为暗色 (`dark`)
- 支持主题切换动画

### 4.4 MQTT 客户端 (`src/viewer/mqtt/mqttClient.ts`)

**核心类**：
```typescript
class MQTTClient {
  private client: mqtt.MqttClient | null = null;
  private currentUrl: string = 'ws://localhost:9001';
  
  // 连接管理
  connect(url?: string): void;
  disconnect(): void;
  
  // 主题解析
  private parseTopic(topic: string, message: AgentEvent): RawMQTTMessage;
}
```

**关键机制**：
1. **主题订阅**：`pi-coding-agent/+/event/+`（通配所有机器和会话）
2. **主题解析**：`pi-coding-agent/{machine-name}/event/{session-id}`
3. **连接管理**：支持动态 URL，手动连接/断开
4. **错误处理**：自动重连机制（指数退避）

## 5. UI 组件设计

### 5.1 AgentEventCard (`src/viewer/components/AgentEventCard.tsx`)

**结构**：
- **Head**：机器信息 + 用户最后消息 + Turn 状态指示器
- **Body**：EventTimeline（可折叠）
- **Foot**：Turn 信息 + Token 统计 + 连接状态

**关键特性**：
- Turn 激活时显示动画（蓝色脉冲 + 呼吸效果）
- 显示当前 Turn 编号和 token 用量
- 支持卡片折叠/展开

### 5.2 EventTimeline (`src/viewer/components/EventTimeline.tsx`)

**关键机制**：
1. **反向显示**：新事件在底部，使用 `flex-direction: column-reverse`
2. **自动滚动**：检测用户是否手动滚动，智能决定是否自动滚到底部
3. **事件限制**：最多显示 200 个事件

### 5.3 EventNode (`src/viewer/components/EventNode.tsx`)

**事件类型处理**：
1. **Message 事件**：
   - 直接显示内容（不折叠）
   - 分三种子类型：user（👤）、think（💭）、assistant（🤖）
   - 颜色区分：蓝色（user）、橙色（think）、绿色（assistant）

2. **Tool 事件**：
   - 第一行：`tool (工具名)` + 展开指示器
   - 第二行：`detail` 字段内容
   - 折叠内容：`result` 字段（错误时红色背景）

3. **其他事件**：
   - Session 事件：🟢 session_start / 🔴 session_shutdown
   - Turn 事件：不显示在时间线中

## 6. 关键变量与配置

### 6.1 环境配置
```typescript
// MQTT 配置
const DEFAULT_MQTT_BROKER_URL = 'ws://localhost:9001';
const TOPIC_PREFIX = 'pi-coding-agent';
const TOPIC_PATTERN = `${TOPIC_PREFIX}/+/event/+`;

// 事件限制
const MAX_EVENTS = 200;

// 重连配置
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
```

### 6.2 样式配置
- **颜色系统**：基于 Tailwind CSS，支持主题切换
- **动画**：使用 Framer Motion 实现平滑过渡
- **响应式**：卡片最大宽度 `max-w-md`

## 7. 关键机制详解

### 7.1 事件拆分机制
当 Message 事件同时包含 `assistant-think` 和 `assistant` 字段时，会拆分为两个独立的 UI 事件：
1. `assistant-think` 事件（优先显示）
2. `assistant` 事件（稍后显示）

**实现**：`toUIEvents()` 函数中为不同部分创建独立事件，通过时间戳微调确保显示顺序。

### 7.2 主题系统
所有组件都通过 `useThemeStore()` 获取当前主题，动态应用样式类：
```tsx
className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
```

### 7.3 连接状态管理
- **手动连接**：用户输入 URL 后点击连接按钮
- **状态同步**：MQTT 连接状态实时同步到 UI
- **错误恢复**：连接失败时提供重试机制

### 7.4 时间线滚动逻辑
```typescript
// 检测是否在底部
const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
// 用户滚动时暂停自动滚动
setAutoScroll(isAtBottom);
```

## 8. 有待优化的细节


## 9. 已知问题与限制

### 9.1 技术限制


### 9.2 功能限制
1. **单会话**：目前只处理一个会话的事件流
2. **无历史记录**：刷新页面后事件丢失（可考虑添加 localStorage 缓存）
3. **有限的事件类型**：只支持文档中定义的 6 种事件类型

### 9.3 性能考虑
1. **大结果处理**：Tool 事件的 result 字段可能很大，影响渲染性能
2. **高频事件**：事件频率过高时可能导致 UI 卡顿
3. **内存使用**：长时间运行可能积累大量事件数据

## 10. 扩展建议


## 总结

Agent Monitor 项目实现了 Pi Coding Agent 事件流的实时可视化监控，具有清晰的架构设计和良好的用户体验。核心功能稳定，代码结构清晰，为后续扩展提供了良好的基础。

**项目优势**：
- 响应式设计，支持主题切换
- 实时事件流处理，低延迟
- 清晰的类型系统和状态管理
- 良好的错误处理和连接管理

**改进方向**：
- 性能优化（虚拟滚动、内存管理）
- 功能扩展（多会话、过滤、搜索）
- 用户体验提升（快捷键、通知、布局自定义）

该文档为接续项目的 AI 提供了全面的项目理解，包括架构设计、数据流、关键机制和优化建议。