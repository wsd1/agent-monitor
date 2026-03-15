import { create } from 'zustand';
import { 
  AgentEvent, 
  RawMQTTMessage, 
  UIEvent, 
  EVENT_CONFIG, 
  MessageEvent,
  MessageSubtype,
  MESSAGE_SUBTYPE_CONFIG 
} from '../types/agentEvent';

const MAX_EVENTS = 200;

interface EventStore {
  // Raw events from MQTT
  rawEvents: RawMQTTMessage[];
  
  // UI-friendly events
  events: UIEvent[];
  
  // Connection status
  isConnected: boolean;
  
  // Turn status (for head animation)
  isTurnActive: boolean;
  
  // Current turn information
  currentTurnIndex: number;
  currentInputTokens: number;
  currentOutputTokens: number;
  currentTotalTokens: number;
  currentTools: number;
  
  // Last user message (for head)
  lastUserMessage: string;
  
  // Current machine name and session ID (from latest event)
  currentMachineName: string;
  currentSessionId: string;
  
  // Actions
  push: (raw: RawMQTTMessage) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 11);

// Convert raw MQTT message to one or more UI events
// Returns an array because a single message event might contain multiple parts (think + assistant)
const toUIEvents = (raw: RawMQTTMessage): UIEvent[] => {
  const { message, machineName, sessionId, timestamp } = raw;
  const type = message.evt as AgentEvent['evt'];
  
  // For non-message events, return a single event
  if (type !== 'message') {
    const config = EVENT_CONFIG[type] || { label: type, icon: '❓', color: '#6b7280' };
    
    return [{
      id: generateId(),
      type,
      label: config.label,
      icon: config.icon,
      color: config.color,
      timestamp,
      machineName,
      sessionId,
      raw: message,
    }];
  }
  
  // For message events, we might need to split into multiple events
  const msgEvent = message as MessageEvent;
  const events: UIEvent[] = [];
  
  // Handle user messages
  if (msgEvent.user) {
    events.push({
      id: generateId(),
      type: 'message',
      label: 'user',
      icon: MESSAGE_SUBTYPE_CONFIG.user.icon,
      color: MESSAGE_SUBTYPE_CONFIG.user.color,
      timestamp,
      machineName,
      sessionId,
      raw: { ...message }, // Clone the raw message
      messageSubtype: 'user',
      messageContent: msgEvent.user,
    });
  }
  
  // Handle assistant-think (think comes first)
  if (msgEvent['assistant-think']) {
    events.push({
      id: generateId(),
      type: 'message',
      label: 'think',
      icon: MESSAGE_SUBTYPE_CONFIG['assistant-think'].icon,
      color: MESSAGE_SUBTYPE_CONFIG['assistant-think'].color,
      timestamp: timestamp + 1, // Slightly later timestamp to maintain order
      machineName,
      sessionId,
      raw: { ...message }, // Clone the raw message
      messageSubtype: 'assistant-think',
      messageContent: msgEvent['assistant-think'],
    });
  }
  
  // Handle assistant messages
  if (msgEvent.assistant) {
    events.push({
      id: generateId(),
      type: 'message',
      label: 'assistant',
      icon: MESSAGE_SUBTYPE_CONFIG.assistant.icon,
      color: MESSAGE_SUBTYPE_CONFIG.assistant.color,
      timestamp: timestamp + 2, // Slightly later timestamp to maintain order
      machineName,
      sessionId,
      raw: { ...message }, // Clone the raw message
      messageSubtype: 'assistant',
      messageContent: msgEvent.assistant,
    });
  }
  
  // If no message content was found (shouldn't happen), return a generic message event
  if (events.length === 0) {
    const config = EVENT_CONFIG.message;
    events.push({
      id: generateId(),
      type: 'message',
      label: config.label,
      icon: config.icon,
      color: config.color,
      timestamp,
      machineName,
      sessionId,
      raw: message,
    });
  }
  
  return events;
};

export const useEventStore = create<EventStore>((set) => ({
  rawEvents: [],
  events: [],
  isConnected: false,
  isTurnActive: false,
  currentTurnIndex: 0,
  currentInputTokens: 0,
  currentOutputTokens: 0,
  currentTotalTokens: 0,
  currentTools: 0,
  lastUserMessage: '',
  currentMachineName: 'unknown',
  currentSessionId: 'unknown',

  push: (raw) =>
    set((state) => {
      // Convert raw message to UI events (might be multiple for message events)
      const uiEvents = toUIEvents(raw);
      
      // Update lastUserMessage if this is a user message
      let lastUserMessage = state.lastUserMessage;
      if (raw.message.evt === 'message' && 'user' in raw.message) {
        lastUserMessage = raw.message.user || '';
      }

      // Update current machine name and session ID
      const currentMachineName = raw.machineName;
      const currentSessionId = raw.sessionId;

      // Update turn status and information
      let isTurnActive = state.isTurnActive;
      let currentTurnIndex = state.currentTurnIndex;
      let currentInputTokens = state.currentInputTokens;
      let currentOutputTokens = state.currentOutputTokens;
      let currentTotalTokens = state.currentTotalTokens;
      let currentTools = state.currentTools;
      
      if (raw.message.evt === 'turn_start') {
        isTurnActive = true;
        // Type-safe way to get turnIndex
        const turnStartEvent = raw.message as { evt: 'turn_start'; turnIndex: number };
        currentTurnIndex = turnStartEvent.turnIndex;
        // Reset token stats at start of new turn
        currentInputTokens = 0;
        currentOutputTokens = 0;
        currentTotalTokens = 0;
        currentTools = 0;
      } else if (raw.message.evt === 'turn_end') {
        isTurnActive = false;
        // Update token stats from turn_end event
        const turnEndEvent = raw.message as { 
          evt: 'turn_end'; 
          usage: { input: number; output: number; total: number };
          tools: number;
        };
        currentInputTokens = turnEndEvent.usage.input;
        currentOutputTokens = turnEndEvent.usage.output;
        currentTotalTokens = turnEndEvent.usage.total;
        currentTools = turnEndEvent.tools;
      }

      // Filter out turn_start and turn_end from timeline events
      const shouldShowInTimeline = 
        raw.message.evt !== 'turn_start' && 
        raw.message.evt !== 'turn_end';

      // Add all UI events to the timeline (if not filtered)
      const newEvents = shouldShowInTimeline 
        ? [...state.events, ...uiEvents].slice(-MAX_EVENTS)
        : state.events;

      return {
        rawEvents: [...state.rawEvents, raw].slice(-MAX_EVENTS),
        events: newEvents,
        isTurnActive,
        currentTurnIndex,
        currentInputTokens,
        currentOutputTokens,
        currentTotalTokens,
        currentTools,
        lastUserMessage,
        currentMachineName,
        currentSessionId,
      };
    }),

  setConnected: (connected) => set({ isConnected: connected }),

  reset: () =>
    set({
      rawEvents: [],
      events: [],
      isConnected: false,
      isTurnActive: false,
      currentTurnIndex: 0,
      currentInputTokens: 0,
      currentOutputTokens: 0,
      currentTotalTokens: 0,
      currentTools: 0,
      lastUserMessage: '',
      currentMachineName: 'unknown',
      currentSessionId: 'unknown',
    }),
}));
