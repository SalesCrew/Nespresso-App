'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface MessageNotification {
  id: string;
  messageId: string;
  conversationId: string;
  title: string;
  subtitle?: string;
  preview: string;
  avatarUrl?: string | null;
  timestamp: Date;
  sticky?: boolean;
  isGroup?: boolean;
}

interface NotificationCenterContextType {
  notifications: MessageNotification[];
  push: (notification: MessageNotification) => void;
  remove: (id: string) => void;
  pin: (id: string) => void;
  unpin: (id: string) => void;
}

const NotificationCenterContext = createContext<NotificationCenterContextType | undefined>(undefined);

const AUTO_DISMISS_MS = 7000;

export function NotificationCenterProvider({ children, maxVisible = 3 }: { children: React.ReactNode; maxVisible?: number }) {
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const remove = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    // Clear timer if exists
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const pin = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, sticky: true } : n)
    );
    
    // Cancel auto-dismiss timer for pinned notification
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const unpin = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, sticky: false } : n)
    );
    
    // Restart auto-dismiss timer
    const timer = setTimeout(() => {
      remove(id);
    }, AUTO_DISMISS_MS);
    timersRef.current.set(id, timer);
  }, [remove]);

  const push = useCallback((notification: MessageNotification) => {
    setNotifications(prev => {
      // Deduplicate by messageId
      if (prev.some(n => n.messageId === notification.messageId)) {
        return prev;
      }

      let updated = [notification, ...prev];

      // Keep only maxVisible, but prefer removing non-sticky toasts
      if (updated.length > maxVisible) {
        // Find first non-sticky toast to replace
        const nonStickyIndex = updated.slice(maxVisible).findIndex(n => !n.sticky);
        if (nonStickyIndex >= 0) {
          const indexToRemove = maxVisible + nonStickyIndex;
          const removed = updated[indexToRemove];
          const timer = timersRef.current.get(removed.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(removed.id);
          }
          updated.splice(indexToRemove, 1);
        } else {
          // All sticky, remove oldest
          const removed = updated.pop();
          if (removed) {
            const timer = timersRef.current.get(removed.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(removed.id);
            }
          }
        }
      }

      return updated;
    });

    // Set auto-dismiss timer (unless already sticky)
    if (!notification.sticky) {
      const timer = setTimeout(() => {
        remove(notification.id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(notification.id, timer);
    }
  }, [remove]);

  return (
    <NotificationCenterContext.Provider value={{ notifications, push, remove, pin, unpin }}>
      {children}
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error('useNotificationCenter must be used within NotificationCenterProvider');
  }
  return context;
}

