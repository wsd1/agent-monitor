'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEventStore } from '../store/eventStore';
import { useThemeStore } from '../store/themeStore';
import { EventTimeline } from './EventTimeline';

interface AgentEventCardProps {
  // Future: support multiple sessions
  sessionId?: string;
}

export function AgentEventCard({ sessionId: _sessionId }: AgentEventCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  
  const {
    isConnected,
    isTurnActive,
    currentTurnIndex,
    currentInputTokens,
    currentOutputTokens,
    currentTotalTokens,
    currentTools,
    lastUserMessage,
    currentMachineName,
    currentSessionId,
  } = useEventStore();
  
  const { theme } = useThemeStore();

  // Format tokens for display
  const formatTokens = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div className={`w-full max-w-md rounded-lg shadow-lg overflow-hidden transition-colors ${
      theme === 'dark' 
        ? 'bg-[#1a1a1a] border border-[#2a2a2a]' 
        : 'bg-white border border-gray-200'
    }`}>
      {/* Head */}
      <div
        className={`px-4 py-3 cursor-pointer transition-colors ${
          theme === 'dark'
            ? 'bg-black border-b border-[#2a2a2a]'
            : 'bg-gray-50 border-b border-gray-200'
        }`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Machine and session info */}
            <div className="flex items-center gap-2 mb-1">
              {/* Connection and turn status indicator */}
              <div className="relative">
                {/* Outer ring for turn animation */}
                {isTurnActive && (
                  <div className="absolute -inset-1">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-400 animate-ping"></div>
                  </div>
                )}
                
                {/* Main indicator */}
                <div
                  className={`relative w-2 h-2 rounded-full flex-shrink-0 ${
                    isConnected 
                      ? (isTurnActive ? 'bg-blue-500' : 'bg-green-500')
                      : 'bg-red-400'
                  } ${isTurnActive ? 'animate-pulse' : ''}`}
                />
              </div>
              
              <div className={`flex items-center gap-2 text-xs ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <span className="font-medium">{currentMachineName}</span>
                <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>/</span>
                <span className="font-mono">{currentSessionId}</span>
                
                {/* Turn indicator */}
                {isTurnActive && (
                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                    theme === 'dark'
                      ? 'bg-blue-900 text-blue-200'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    Turn #{currentTurnIndex + 1}
                  </span>
                )}
              </div>
            </div>
            
            {/* User message */}
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium truncate ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                {lastUserMessage || 'No user message yet'}
              </span>
            </div>
          </div>
          <span className={`text-xs ml-2 flex-shrink-0 mt-1 ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {collapsed ? '▶' : '▼'}
          </span>
        </div>
      </div>

      {/* Body - Timeline */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EventTimeline />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Foot - Turn information and token stats */}
      <div className={`px-4 py-2 border-t flex items-center justify-between text-xs transition-colors ${
        theme === 'dark'
          ? 'bg-black border-[#2a2a2a] text-gray-400'
          : 'bg-gray-50 border-gray-200 text-gray-500'
      }`}>
        <div className="flex items-center gap-4">
          {/* Turn information */}
          <span>
            <span className="font-medium">Turn:</span> #{currentTurnIndex + 1}
          </span>
          
          {/* Token stats (only show if we have data from turn_end) */}
          {(currentInputTokens > 0 || currentOutputTokens > 0) && (
            <>
              <span>
                <span className="font-medium">in:</span> {formatTokens(currentInputTokens)}
              </span>
              <span>
                <span className="font-medium">out:</span> {formatTokens(currentOutputTokens)}
              </span>
              <span>
                <span className="font-medium">total:</span> {formatTokens(currentTotalTokens)}
              </span>
              <span>
                <span className="font-medium">tools:</span> {currentTools}
              </span>
            </>
          )}
        </div>
        
        {/* Connection status */}
        <div className={`px-2 py-0.5 rounded text-xs ${
          isConnected 
            ? (theme === 'dark' ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700')
            : (theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700')
        }`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </div>
  );
}
