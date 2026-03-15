# AgentMonitor从MQTT Broker获取事件和数据的注意事项


---

## 1. MQTT Broker 连接信息

ws://localhost:9001（WebSocket）


### 主题前缀格式

```
pi-coding-agent/{machine-name}/event/{session-id}
```

### 订阅主题

```bash
"pi-coding-agent/+/event/+"
```

上述指令可以通配所有的机器名称和事务编码。

## 2. 支持的事件类型 及 消息格式详解

所有消息均可通过匹配的主题获得 machineName 和 sessionId

### 1. session_start

会话开始事件。

```json
{
  "evt": "session_start"
}
```

### 2. session_shutdown

会话结束事件。

```json
{
  "evt": "session_shutdown"
}
```

### 3. turn_start

轮次开始事件。

```json
{
  "evt": "turn_start",
  "turnIndex": 0
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `turnIndex` | number | 轮次索引，从 0 开始 |

### 4. turn_end

轮次结束事件。

```json
{
  "evt": "turn_end",
  "usage": {
    "input": 4080,
    "output": 164,
    "total": 4244
  },
  "tools": 1
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `usage.input` | number | 输入 token 数量 |
| `usage.output` | number | 输出 token 数量 |
| `usage.total` | number | 总 token 数量 |
| `tools` | number | 本轮调用的工具数量 |

### 5. message (user)

用户消息事件（`message_start` 阶段）。

```json
{
  "evt": "message",
  "user": "请读取当前路径文件列表前10项，写入文件tmp.md..."
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `user` | string | 用户消息内容（已截断） |

### 6. message (assistant-think)

助手思考内容事件（`message_start` 或 `message_end` 阶段）。

```json
{
  "evt": "message",
  "assistant-think": "The user is asking me to: 1. List the first 10 fil..."
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `assistant-think` | string | 助手的 `<think>` 标签内容（已截断） |

### 7. message (assistant)

助手最终回复事件（`message_end` 阶段）。

```json
{
  "evt": "message",
  "assistant": "已完成： 1. **文件列表前10项**已写入 `/home/wsd1/worksho..."
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `assistant` | string | 助手消息内容（已截断，默认50字符） |

### 8. tool

工具执行结果事件。

```json
{
  "evt": "tool",
  "tool": "bash",
  "detail": "bash: ls -1 /home/wsd1/workshop/pi-mono | head -10",
  "err": false,
  "result": "2026-03-10T12-11-18-639Z_8c272fde-b5bf-4572-b681-5...",
  "resultLength": 268
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `tool` | string | 工具名称（如 `bash`, `read`, `write`, `edit`, `grep` 等） |
| `detail` | string | 简化的调用信息，格式为 `tool "path"` 或 `bash: command` |
| `err` | boolean | 是否执行出错 |
| `result` | string | 工具返回结果（已截断，默认50字符） |
| `resultLength` | number | 原始结果长度 |

---





