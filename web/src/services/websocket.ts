import React from 'react';
import { io, Socket } from 'socket.io-client';
import { WebSocketEvents } from '../types';

export class WebSocketService {
  private socket: Socket | null = null;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second

  private eventCallbacks: Map<keyof WebSocketEvents, Set<Function>> = new Map();

  constructor(private url: string = process.env.REACT_APP_WS_URL || 'http://localhost:5000') {
    this.initializeEventCallbacks();
  }

  private initializeEventCallbacks() {
    // Initialize callback sets for each event type
    const eventTypes: (keyof WebSocketEvents)[] = [
      'campaign-started',
      'campaign-update',
      'campaign-progress', 
      'campaign-completed',
      'campaign-error'
    ];

    eventTypes.forEach(eventType => {
      this.eventCallbacks.set(eventType, new Set());
    });
  }

  // Connection Management
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      // Prevent multiple connection attempts
      if (this.connectionState === 'connecting') {
        resolve();
        return;
      }

      this.connectionState = 'connecting';
      console.log('🔌 Connecting to WebSocket...');

      // Disconnect any existing socket first
      if (this.socket) {
        this.socket.disconnect();
      }

      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        retries: 3,
        forceNew: true, // Prevent socket reuse
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected');
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.reconnectInterval = 1000;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.warn('❌ WebSocket disconnected:', reason);
        this.connectionState = 'disconnected';
        
        // Attempt to reconnect if disconnection wasn't intentional
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          return;
        }
        
        this.attemptReconnect();
      });

      this.socket.on('connect_error', (error) => {
        console.error('🚫 WebSocket connection error:', error);
        this.connectionState = 'disconnected';
        reject(error);
        this.attemptReconnect();
      });

      // Set up event listeners
      this.setupEventListeners();
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectInterval);

    // Exponential backoff with jitter
    this.reconnectInterval = Math.min(
      this.reconnectInterval * 2 + Math.random() * 1000,
      30000
    );
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.connectionState = 'disconnected';
    }
  }

  // Event Management
  private setupEventListeners() {
    if (!this.socket) return;

    // Campaign Events
    this.socket.on('campaign-started', (data: WebSocketEvents['campaign-started']) => {
      console.log('📢 Campaign started:', data.id);
      this.notifyCallbacks('campaign-started', data);
    });

    this.socket.on('campaign-update', (data: WebSocketEvents['campaign-update']) => {
      console.log('🔄 Campaign update:', data.campaignId);
      this.notifyCallbacks('campaign-update', data);
    });

    this.socket.on('campaign-progress', (data: WebSocketEvents['campaign-progress']) => {
      console.log('📊 Campaign progress:', data.campaignId, data.progress);
      this.notifyCallbacks('campaign-progress', data);
    });

    this.socket.on('campaign-completed', (data: WebSocketEvents['campaign-completed']) => {
      console.log('✅ Campaign completed:', data.id);
      this.notifyCallbacks('campaign-completed', data);
    });

    this.socket.on('campaign-error', (data: WebSocketEvents['campaign-error']) => {
      console.error('❌ Campaign error:', data.campaignId, data.error);
      this.notifyCallbacks('campaign-error', data);
    });
  }

  private notifyCallbacks<T extends keyof WebSocketEvents>(
    eventType: T,
    data: WebSocketEvents[T]
  ) {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${eventType} callback:`, error);
        }
      });
    }
  }

  // Public API for subscribing to events
  on<T extends keyof WebSocketEvents>(
    eventType: T,
    callback: (data: WebSocketEvents[T]) => void
  ): () => void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      callbacks.add(callback);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  // Campaign-specific methods
  joinCampaign(campaignId: string) {
    if (this.socket?.connected) {
      console.log('🎯 Joining campaign room:', campaignId);
      this.socket.emit('join-campaign', campaignId);
    } else {
      console.warn('Cannot join campaign: WebSocket not connected');
    }
  }

  leaveCampaign(campaignId: string) {
    if (this.socket?.connected) {
      console.log('🚪 Leaving campaign room:', campaignId);
      this.socket.emit('leave-campaign', campaignId);
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.socket?.connected === true;
  }

  getConnectionState(): string {
    return this.connectionState;
  }

  // Send custom events (if needed)
  emit(eventName: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`Cannot emit ${eventName}: WebSocket not connected`);
    }
  }
}

// Singleton instance with proper cleanup
let wsService: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!wsService) {
    wsService = new WebSocketService();
    
    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (wsService) {
          wsService.disconnect();
          wsService = null;
        }
      });
    }
  }
  return wsService;
};

// React Hook for WebSocket
export const useWebSocket = () => {
  const ws = getWebSocketService();

  // Use useCallback to prevent new function instances on every render
  const connect = React.useCallback(() => ws.connect(), [ws]);
  const disconnect = React.useCallback(() => ws.disconnect(), [ws]);
  const isConnected = React.useCallback(() => ws.isConnected(), [ws]);
  const joinCampaign = React.useCallback((campaignId: string) => ws.joinCampaign(campaignId), [ws]);
  const leaveCampaign = React.useCallback((campaignId: string) => ws.leaveCampaign(campaignId), [ws]);

  const subscribe = React.useCallback(<T extends keyof WebSocketEvents>(
    eventType: T,
    callback: (data: WebSocketEvents[T]) => void
  ) => ws.on(eventType, callback), [ws]);

  return {
    connect,
    disconnect,
    isConnected,
    joinCampaign,
    leaveCampaign,
    subscribe,
    connectionState: ws.getConnectionState(),
  };
};

export default WebSocketService; 