import { useEffect, useRef, useState } from 'react';
import { WS_BASE_URL } from '../api/config';
import { useStore } from '../store/useStore';
import { WebSocketMessage } from '../types';

export const useAnalysisWebSocket = (fileId: string | null) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'running' | 'complete' | 'error' | 'disconnected'>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const {
    addSampleLog,
    updateSampleProgress,
    setSampleAnalysisResult,
    addSampleVerificationUpdate,
    updateSampleStatus,
    getSample
  } = useStore();

  const sample = fileId ? getSample(fileId) : undefined;

  useEffect(() => {
    if (!fileId) return;

    // If already complete, don't reconnect unless we want to? 
    // The backend might close the socket after completion.
    if (sample?.status === 'complete') {
        setConnectionStatus('complete');
        return;
    }

    const connect = () => {
      setConnectionStatus('connecting');
      const ws = new WebSocket(`${WS_BASE_URL}/ws/${fileId}`);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket Connected');
        setConnectionStatus('running');
        updateSampleStatus(fileId, 'processing');
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          
          switch (data.type) {
            case 'log':
              if (data.message) addSampleLog(fileId, data.message);
              break;
            case 'progress':
              if (data.step && data.status) {
                updateSampleProgress(fileId, { step: data.step, status: data.status });
              }
              break;
            case 'clustering_result':
              if (data.data) {
                setSampleAnalysisResult(fileId, data.data);
              }
              break;
            case 'verification_update':
              if (data.data) {
                addSampleVerificationUpdate(fileId, data.data);
              }
              break;
            case 'complete':
              updateSampleStatus(fileId, 'complete');
              setConnectionStatus('complete');
              break;
            case 'error':
              setErrorMessage(data.message);
              updateSampleStatus(fileId, 'error');
              setConnectionStatus('error');
              break;
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setConnectionStatus('error');
        setErrorMessage('Connection error');
      };

      ws.onclose = (e) => {
        console.log('WebSocket closed:', e.code, e.reason);
        if (connectionStatus !== 'complete' && connectionStatus !== 'error') {
             // If closed unexpectedly
             // setConnectionStatus('disconnected');
        }
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [fileId]);

  return {
    logs: sample?.logs || [],
    progress: sample?.progress || [],
    clusteringResult: sample?.latestAnalysis || null,
    verificationUpdates: sample?.verificationUpdates || [],
    status: connectionStatus,
    errorMessage,
    sampleStatus: sample?.status
  };
};
