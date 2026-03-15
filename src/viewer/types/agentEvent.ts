/**
 * Agent Event Types
 * Based on MQTT messages from mqtt-monitor.ts extension
 */

export type EventType =
  | 'session_start'
  | 'session_shutdown'
  | 'turn_start'
  | 'turn_end'
  | 'message'
  | 'tool';

export interface SessionStartEvent {
  evt: 'session_start';
}

export interface SessionShutdownEvent {
  evt: 'session_shutdown';
}

export interface TurnStartEvent {
  evt: 'turn_start';
  turnIndex: number;
}

export interface TurnEndEvent {
  evt: 'turn_end';
  usage: {
    input: number;
    output: number;
    total: number;
  };
  tools: number;
}

export interface MessageEvent {
  evt: 'message';
  user?: string;
  'assistant-think'?: string;
  assistant?: string;
}

export interface ToolEvent {
  evt: 'tool';
  tool: string;
  detail: string;
  err: boolean;
  result: string;
  resultLength: number;
}

export type AgentEvent =
  | SessionStartEvent
  | SessionShutdownEvent
  | TurnStartEvent
  | TurnEndEvent
  | MessageEvent
  | ToolEvent;

/**
 * Raw MQTT message with topic info
 */
export interface RawMQTTMessage {
  topic: string;
  message: AgentEvent;
  machineName: string;
  sessionId: string;
  timestamp: number;
}

/**
 * UI-friendly event structure
 */
export interface UIEvent {
  id: string;
  type: EventType;
  label: string;
  icon: string;
  color: string;
  timestamp: number;
  machineName?: string;
  sessionId?: string;
  raw: AgentEvent;
  // For message events, track the subtype
  messageSubtype?: MessageSubtype;
  // For message events, store the content
  messageContent?: string;
}

/**
 * Message subtype
 */
export type MessageSubtype = 'user' | 'assistant' | 'assistant-think';

/**
 * Event type configuration for UI
 */
export const EVENT_CONFIG: Record<
  EventType,
  { label: string; icon: string; color: string }
> = {
  session_start: { label: 'session_start', icon: '', color: '#22c55e' },
  session_shutdown: { label: 'session_end', icon: '', color: '#ef4444' },
  turn_start: { label: 'turn_start', icon: '🔵', color: '#3b82f6' },
  turn_end: { label: 'turn_end', icon: '🟣', color: '#8b5cf6' },
  message: { label: 'message', icon: '💬', color: '#f59e0b' },
  tool: { label: 'tool', icon: '🔧', color: '#06b6d4' },
};

/**
 * Message subtype configuration
 */
export const MESSAGE_SUBTYPE_CONFIG: Record<
  MessageSubtype,
  { label: string; icon: string; color: string }
> = {
  'user': { label: 'user', icon: '👨', color: '#3b82f6' }, // Blue
  'assistant': { label: 'assistant', icon: '🤖', color: '#10b981' }, // Green
  'assistant-think': { label: 'think', icon: '💭', color: '#f59e0b' }, // Orange
};
