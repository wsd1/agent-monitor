'use client';

import { useState } from 'react';
import { AgentEventCard, useMQTT, useEventStore } from '@/viewer';
import { useThemeStore } from '@/viewer/store/themeStore';

export default function Home() {
  const { connect, disconnect } = useMQTT();
  const isConnected = useEventStore((state) => state.isConnected);
  
  // Theme
  const { theme, toggleTheme } = useThemeStore();
  
  // URL input state
  const [url, setUrl] = useState('ws://localhost:9001');
  const [isConnecting, setIsConnecting] = useState(false);

  return (
    <div className={`min-h-screen p-8 transition-colors duration-200 ${
      theme === 'dark' ? 'bg-black text-gray-100' : 'bg-gray-100 text-gray-800'
    }`}>
      <div className="max-w-4xl mx-auto">
        {/* Header with theme toggle */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agent Event Monitor</h1>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Real-time visualization of pi-coding-agent events via MQTT
            </p>
          </div>
          
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              theme === 'dark' 
                ? 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-200' 
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            }`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? (
              <>
                <span className="text-lg">🌙</span>
                <span className="text-sm">Dark</span>
              </>
            ) : (
              <>
                <span className="text-lg">☀️</span>
                <span className="text-sm">Light</span>
              </>
            )}
          </button>
        </div>

        {/* Status Bar */}
        <div className={`rounded-lg shadow p-4 mb-6 flex items-center justify-between transition-colors ${
          theme === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'
                }`}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* URL input and connect/disconnect button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="ws://localhost:9001"
                className={`px-3 py-1 text-sm rounded transition-colors w-48 ${
                  theme === 'dark'
                    ? 'bg-[#2a2a2a] border border-[#3a3a3a] text-gray-200 placeholder-gray-500'
                    : 'bg-white border border-gray-300 text-gray-700 placeholder-gray-400'
                }`}
                disabled={isConnecting || isConnected}
              />
              <button
                onClick={() => {
                  if (isConnected) {
                    disconnect();
                  } else {
                    setIsConnecting(true);
                    connect(url);
                    // Reset connecting state after a short delay
                    setTimeout(() => setIsConnecting(false), 1000);
                  }
                }}
                disabled={isConnecting}
                className={`px-3 py-1 text-sm rounded transition-colors min-w-20 ${
                  isConnecting
                    ? (theme === 'dark' ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-300 text-gray-500')
                    : isConnected
                    ? (theme === 'dark' ? 'bg-red-900 hover:bg-red-800 text-red-200' : 'bg-red-100 hover:bg-red-200 text-red-700')
                    : (theme === 'dark' ? 'bg-green-900 hover:bg-green-800 text-green-200' : 'bg-green-100 hover:bg-green-200 text-green-700')
                }`}
              >
                {isConnecting ? '连接中...' : (isConnected ? '断开' : '连接')}
              </button>
            </div>
          </div>
        </div>

        {/* Card Slots - Currently showing 1 card */}
        <div className="grid grid-cols-1 gap-6">
          <AgentEventCard />
        </div>

        {/* Info */}
        <div className={`mt-8 text-xs text-center ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <p>
            Subscribe topic: pi-coding-agent/+/event/+
          </p>
          <p className="mt-1">
            Connect to ws://localhost:9001
          </p>
        </div>
      </div>
    </div>
  );
}
