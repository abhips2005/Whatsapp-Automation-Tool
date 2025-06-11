import React, { useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useWebSocket } from './services/websocket';
import { useAppActions } from './store';
import { ApiService } from './services/api';

// Import modular components
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import './index.css';

// Create a query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Main App Component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <AppContent />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

// App Content with initialization logic
function AppContent() {
  const { connect, isConnected } = useWebSocket();
  const { setWebsocketConnected } = useAppActions();

  const initializeApp = useCallback(async () => {
    try {
      // Check API health
      const health = await ApiService.healthCheck();
      console.log('✅ API Health:', health);
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
    }
  }, []);

  const connectWebSocket = useCallback(async () => {
    try {
      await connect();
      setWebsocketConnected(true);
      console.log('✅ WebSocket connected');
    } catch (error) {
      console.error('❌ WebSocket connection failed:', error);
      setWebsocketConnected(false);
    }
  }, [connect, setWebsocketConnected]);

  useEffect(() => {
    initializeApp();
    connectWebSocket();
  }, [initializeApp, connectWebSocket]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isConnected={isConnected()} />
      <main>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
