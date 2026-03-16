'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UIEvent, ToolEvent, MessageEvent } from '../types/agentEvent';
import { useThemeStore } from '../store/themeStore';

interface EventNodeProps {
  event: UIEvent;
}

type ToolDetails = {
  detail: string;
  result: string;
  err: boolean;
  tool: string;
} | null;

type MessageDetails = {
  user?: string;
  'assistant-think'?: string;
  assistant?: string;
} | null;

export function EventNode({ event }: EventNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useThemeStore();

  // For message events, always show content inline
  // For tool events, show details on click
  const hasDetails = event.type === 'tool';
  
  // For message events with content, we show it inline
  const hasMessageContent = event.type === 'message' && event.messageContent;
  
  const handleClick = () => {
    if (hasDetails) {
      setExpanded(!expanded);
    }
  };

  // Get additional info based on event type
  const getDetailContent = (): ToolDetails | MessageDetails => {
    if (event.type === 'tool') {
      const toolEvent = event.raw as ToolEvent;
      return {
        detail: toolEvent.detail,
        result: toolEvent.result,
        err: toolEvent.err,
        tool: toolEvent.tool,
      };
    }
    if (event.type === 'message') {
      const msgEvent = event.raw as MessageEvent;
      return {
        user: msgEvent.user,
        'assistant-think': msgEvent['assistant-think'],
        assistant: msgEvent.assistant,
      };
    }
    return null;
  };

  const details = getDetailContent();
  const isToolDetails = details !== null && 'tool' in details;
  const isMessageDetails = details !== null && 'user' in details;

  return (
    <div className="relative flex items-center gap-3">
      {/* Timeline line - continuous from top to bottom */}
      <div
        className="absolute left-[4px] top-0 bottom-0 w-0.5 bg-gray-600"
      />

      {/* Dot */}
      <div
        className="relative z-10 w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: event.color }}
      />

      {/* Content */}
      <div className="flex-1 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            flex items-start gap-2 p-1 rounded transition-colors duration-150
            ${hasDetails ? 'cursor-pointer' : ''}
            ${theme === 'dark' ? 'hover:bg-[#101010]' : 'hover:bg-gray-100'}
          `}
          onClick={handleClick}
        >
          <span className="text-lg mt-0.5">{event.icon}</span>
          <div className="flex-1">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span 
                    className="font-medium text-sm"
                    style={{ color: event.color }}
                  >
                    {event.label}
                  </span>
                  
                  {/* Show tool name for tool events */}
                  {isToolDetails && (
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      ({details.tool})
                    </span>
                  )}

                  {/* Expand indicator for tool events */}
                  {hasDetails && (
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {expanded ? '▼' : '▶'}
                    </span>
                  )}
                </div>
                
                {/* Show detail content for tool events (on second line) */}
                {isToolDetails && details.detail && (
                  <div className={`mt-1 text-xs font-mono ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    {details.detail}
                  </div>
                )}
              </div>
            </div>
            
            {/* Show message content inline for message events */}
            {hasMessageContent && event.messageContent && (
              <div className={`mt-1 text-xs whitespace-pre-line ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {event.messageContent}
              </div>
            )}
          </div>
        </motion.div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && details && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 ml-6 text-xs"
            >
              {/* Tool result (detail is already shown inline) */}
              {isToolDetails && (
                <div className="mt-2">
                  <div className={`font-mono p-2 rounded text-sm ${
                    details.err 
                      ? (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600')
                      : (theme === 'dark' ? 'bg-[#2a2a2a] text-gray-300' : 'bg-gray-50 text-gray-700')
                  }`}>
                    {details.result || '(empty result)'}
                  </div>
                </div>
              )}

              {/* Message details */}
              {isMessageDetails && (
                <div className="space-y-2">
                  {details.user && (
                    <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                      <span className={`font-medium ${
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      }`}>user:</span>{' '}
                      {details.user}
                    </div>
                  )}
                  {details['assistant-think'] && (
                    <div className={`italic border-l-2 pl-2 ${
                      theme === 'dark' 
                        ? 'text-gray-400 border-yellow-500' 
                        : 'text-gray-500 border-yellow-400'
                    }`}>
                      <span className="font-medium">think:</span>{' '}
                      {details['assistant-think']}
                    </div>
                  )}
                  {details.assistant && (
                    <div className={theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}>
                      <span className={`font-medium ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`}>assistant:</span>{' '}
                      {details.assistant}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
