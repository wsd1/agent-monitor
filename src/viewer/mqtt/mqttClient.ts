import mqtt from 'mqtt';
import { useRef } from 'react';
import { useEventStore } from '../store/eventStore';
import { AgentEvent, RawMQTTMessage } from '../types/agentEvent';

const DEFAULT_MQTT_BROKER_URL = 'ws://localhost:9001';
const TOPIC_PREFIX = 'pi-coding-agent';
const TOPIC_PATTERN = `${TOPIC_PREFIX}/+/event/+`;

// Reconnection settings
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_INCREMENT = 2000; // Increase delay each time

class MQTTClient {
  private client: mqtt.MqttClient | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect = false;
  private reconnectAttempts = 0;
  private currentReconnectDelay = RECONNECT_DELAY;
  private isConnecting = false;
  private connectionCount = 0; // Track how many times we've tried to connect
  private currentUrl: string = DEFAULT_MQTT_BROKER_URL;

  connect(url?: string) {
    this.connectionCount++;
    
    // Update URL if provided
    if (url && url !== this.currentUrl) {
      console.log(`[MQTT] Updating URL from ${this.currentUrl} to ${url}`);
      this.currentUrl = url;
      
      // If already connected to a different URL, disconnect first
      if (this.client?.connected) {
        this.disconnect();
      }
    }
    
    console.log(`[MQTT] Connect called (count: ${this.connectionCount}, url: ${this.currentUrl})`);
    
    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log('[MQTT] Connection in progress, skip...');
      return;
    }

    // If already connected, do nothing
    if (this.client?.connected) {
      console.log('[MQTT] Already connected, skipping...');
      return;
    }

    // If manually disconnected, allow reconnect
    if (this.isManualDisconnect) {
      console.log('[MQTT] Was manually disconnected, resetting flag...');
      this.isManualDisconnect = false;
    }

    this.isConnecting = true;
    console.log('[MQTT] Connecting to', this.currentUrl);

    try {
      this.client = mqtt.connect(this.currentUrl, {
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 0, // Disable auto reconnect, we handle it manually
      });

      this.client.on('connect', () => {
        console.log('[MQTT] Connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.currentReconnectDelay = RECONNECT_DELAY;
        useEventStore.getState().setConnected(true);

        // Subscribe to all agent events
        this.client?.subscribe(TOPIC_PATTERN, (err) => {
          if (err) {
            console.error('[MQTT] Subscribe error:', err);
          } else {
            console.log('[MQTT] Subscribed to:', TOPIC_PATTERN);
          }
        });
      });

      this.client.on('message', (topic, payload) => {
        try {
          const message = JSON.parse(payload.toString()) as AgentEvent;
          const raw = this.parseTopic(topic, message);
          useEventStore.getState().push(raw);
        } catch (error) {
          console.error('[MQTT] Parse error:', error);
        }
      });

      this.client.on('error', (error) => {
        console.error('[MQTT] Error:', error);
        this.isConnecting = false;
      });

      this.client.on('close', () => {
        console.log('[MQTT] Disconnected');
        useEventStore.getState().setConnected(false);
        this.isConnecting = false;

        // Auto reconnect if not manual disconnect
        if (!this.isManualDisconnect) {
          this.scheduleReconnect();
        }
      });

      this.client.on('offline', () => {
        console.log('[MQTT] Offline');
        useEventStore.getState().setConnected(false);
      });

    } catch (error) {
      console.error('[MQTT] Connection failed:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect() {
    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check max attempts
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[MQTT] Max reconnect attempts reached, stopping...');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.currentReconnectDelay;
    
    // Increment delay for next attempt (exponential backoff)
    this.currentReconnectDelay += RECONNECT_DELAY_INCREMENT;

    console.log(`[MQTT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    // Only disconnect if we're actually connected
    if (!this.client || !this.client.connected) {
      console.log('[MQTT] Not connected, skipping disconnect');
      return;
    }

    console.log('[MQTT] Manual disconnect');
    this.isManualDisconnect = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      this.client.end();
      this.client = null;
    }
    
    useEventStore.getState().setConnected(false);
    this.reconnectAttempts = 0;
    this.currentReconnectDelay = RECONNECT_DELAY;
  }



  /**
   * Parse topic: pi-coding-agent/{machine-name}/event/{session-id}
   */
  private parseTopic(topic: string, message: AgentEvent): RawMQTTMessage {
    const parts = topic.split('/');
    
    // Expected: pi-coding-agent/{machine-name}/event/{session-id}
    // parts[0] = "pi-coding-agent"
    // parts[1] = "{machine-name}"
    // parts[2] = "event"
    // parts[3] = "{session-id}"
    const machineName = parts[1] || 'unknown';
    const sessionId = parts[3] || 'unknown';

    return {
      topic,
      message,
      machineName,
      sessionId,
      timestamp: Date.now(),
    };
  }
}

// Singleton instance
export const mqttClient = new MQTTClient();

// React hook for MQTT connection
export function useMQTT() {
  // Return stable references to prevent useEffect re-runs
  const connectRef = useRef((url?: string) => mqttClient.connect(url));
  const disconnectRef = useRef(() => mqttClient.disconnect());

  return {
    connect: connectRef.current,
    disconnect: disconnectRef.current,
  };
}
