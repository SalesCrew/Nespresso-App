"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initializeSocket = async () => {
      const supabase = createSupabaseBrowserClient();
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('[Socket.IO] Session check:', {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        tokenPreview: session?.access_token?.substring(0, 20)
      });
      
      if (!session?.access_token) {
        console.log('No session token available for Socket.IO connection');
        return;
      }

      // Create Socket.IO connection
      // Check for environment variable, fallback to production URL
      const rawUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                     (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                       ? 'http://localhost:3000' 
                       : 'https://salescrew-app-production.up.railway.app');
      
      console.log('[Socket.IO] Using URL:', rawUrl);
      
      if (!rawUrl) {
        console.error('[Socket.IO] NEXT_PUBLIC_SOCKET_URL is not defined! Socket will not initialize.');
        setIsConnected(false);
        setSocket(null);
        return;
      }
      const socketUrl = rawUrl.replace(/\/$/, '');
      
      const socketInstance = io(socketUrl, {
        auth: {
          token: session.access_token,
        },
        autoConnect: true,
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        withCredentials: true, // Include credentials for CORS
      });

      socketInstance.on('connect', () => {
        console.log('Socket.IO connected');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        console.error('This is likely a CORS issue. Check Railway ALLOWED_ORIGIN env var.');
        console.error('It should be set to: https://test-nespresso-seven.vercel.app or *');
        setIsConnected(false);
      });

      setSocket(socketInstance);

      // Cleanup on unmount
      return () => {
        socketInstance.disconnect();
      };
    };

    initializeSocket();
  }, []);

  // Listen for auth state changes and reconnect if needed
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Disconnect and reconnect with new token
        if (socket) {
          socket.disconnect();
        }
        
        if (session?.access_token && event === 'TOKEN_REFRESHED') {
          const rawUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                         (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
                           ? 'http://localhost:3000' 
                           : 'https://salescrew-app-production.up.railway.app');
          if (!rawUrl) return;
          const socketUrl = rawUrl.replace(/\/$/, '');
          const newSocket = io(socketUrl, {
            auth: {
              token: session.access_token,
            },
            transports: ['websocket', 'polling'],
            withCredentials: true,
          });

          newSocket.on('connect', () => {
            console.log('Socket.IO reconnected with new token');
            setIsConnected(true);
          });

          newSocket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            setIsConnected(false);
          });

          setSocket(newSocket);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

