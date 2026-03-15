'use client';

import { useEffect, useRef, useState } from 'react';
import { useEventStore } from '../store/eventStore';
import { useThemeStore } from '../store/themeStore';
import { EventNode } from './EventNode';

export function EventTimeline() {
  const events = useEventStore((state) => state.events);
  const { theme } = useThemeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevEventsLengthRef = useRef(events.length);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && containerRef.current && events.length > prevEventsLengthRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    prevEventsLengthRef.current = events.length;
  }, [events.length, autoScroll]);

  // Handle scroll to detect if user is scrolling manually
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    
    setAutoScroll(isAtBottom);
  };

  // Reverse events to show newest at bottom
  const reversedEvents = [...events].reverse();

  if (events.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-sm ${
        theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
      }`}>
        Waiting for events...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-2 py-3"
      style={{ maxHeight: '400px' }}
    >
      {reversedEvents.map((event, index) => (
        <EventNode
          key={event.id}
          event={event}
          isLast={index === reversedEvents.length - 1}
        />
      ))}
    </div>
  );
}
