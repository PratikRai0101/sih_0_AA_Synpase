'use client';
import { useState, useEffect, useRef, useCallback, JSX } from 'react';
import { Upload, FileText, Type } from 'lucide-react';
import LogDisplay from './LogDisplay'; 
import type { AnalysisLog } from '../types'; 
import { useAnalysis, type TaxaData } from '../context/AnalysisContext';

// --- Constants ---
const API_BASE_URL = 'http://localhost:8000'; 
const UPLOAD_ENDPOINT = `${API_BASE_URL}/upload`;
// FIX: Point to local proxy to avoid CORS
const TEXT_API_ENDPOINT = `${API_BASE_URL}/api/text-analysis`; 
const WS_BASE_URL = 'ws://localhost:8000';
const FILE_ID_KEY = 'edna_analysis_file_id';

interface UploadResponse {
    file_id: string;
    message: string;
}

export default function Analysis(): JSX.Element {
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [fileType, setFileType] = useState<'.fasta' | '.fastq'>('.fasta');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown');
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Get analysis context
  const { updateAnalysisData, addTaxaData, addRecentAnalysis } = useAnalysis();
  
  // Store verification updates to process when complete
  const verificationDataRef = useRef<Map<string, TaxaData>>(new Map());
  
  // Use refs for context functions to avoid re-renders
  const updateAnalysisDataRef = useRef(updateAnalysisData);
  const addTaxaDataRef = useRef(addTaxaData);
  const addRecentAnalysisRef = useRef(addRecentAnalysis);
  
  // Update refs when functions change
  useEffect(() => {
    updateAnalysisDataRef.current = updateAnalysisData;
    addTaxaDataRef.current = addTaxaData;
    addRecentAnalysisRef.current = addRecentAnalysis;
  }, [updateAnalysisData, addTaxaData, addRecentAnalysis]);

  const connectWebSocket = useCallback((fileId: string) => {
    if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
    }

    const wsUrl = `${WS_BASE_URL}/ws/${fileId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
        setLogs(prev => [...prev, { type: 'log', message: `Connected to log stream for ID: ${fileId}` }]);
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(line);
            
            // Convert server message format to client AnalysisLog format
            if (message.type === 'log') {
                setLogs(prev => [...prev, { type: 'log', message: message.message }]);
            } else if (message.type === 'progress') {
                setLogs(prev => [...prev, { 
                    type: 'progress', 
                    step: message.step, 
                    status: message.status 
                }]);
            } else if (message.type === 'clustering_result') {
                setLogs(prev => [...prev, { 
                    type: 'clustering_result', 
                    data: message.data 
                }]);
                
                // Update dashboard with clustering results
                updateAnalysisDataRef.current({
                    totalReads: message.data.total_reads,
                    totalClusters: message.data.total_clusters,
                });
                
            } else if (message.type === 'verification_update') {
                setLogs(prev => [...prev, { 
                    type: 'verification_update', 
                    data: message.data 
                }]);
                
                // Extract taxa information from description
                // Format: "Genus (Class: ClassName, X sequences, Y%)"
                const description = message.data.description || '';
                const genusMatch = description.match(/^([^(]+)/);
                const classMatch = description.match(/Class:\s*([^,]+)/);
                const countMatch = description.match(/(\d+)\s+sequences/);
                const percentMatch = description.match(/([\d.]+)%\)/);
                
                if (genusMatch && classMatch) {
                    const genus = genusMatch[1].trim();
                    const taxaData: TaxaData = {
                        name: genus,
                        genus: genus,
                        class: classMatch[1].trim(),
                        count: countMatch ? parseInt(countMatch[1]) : 0,
                        probability: message.data.match_percentage || 0,
                        percentage: percentMatch ? parseFloat(percentMatch[1]) : 0,
                    };
                    
                    // Store in ref to accumulate all taxa
                    verificationDataRef.current.set(genus, taxaData);
                }
                
            } else if (message.type === 'complete') {
                setLogs(prev => [...prev, { type: 'complete', message: message.message }]);
                
                // Convert accumulated taxa data to array and update dashboard
                const taxaArray = Array.from(verificationDataRef.current.values());
                if (taxaArray.length > 0) {
                    addTaxaDataRef.current(taxaArray);
                    
                    // Calculate novel taxa (those with low probability)
                    const novelCount = taxaArray.filter(t => t.probability < 80).length;
                    updateAnalysisDataRef.current({ novelTaxa: novelCount });
                    
                    // Add to recent analyses
                    addRecentAnalysisRef.current({
                        id: fileId.substring(0, 8),
                        sample: `Sample-${fileId.substring(0, 8)}`,
                        location: 'User Upload',
                        status: 'Completed',
                        date: new Date().toISOString().split('T')[0],
                    });
                }
                
                // Clear verification data for next analysis
                verificationDataRef.current.clear();
                
            } else if (message.type === 'error') {
                setLogs(prev => [...prev, { type: 'log', message: `ERROR: ${message.message}` }]);
            } else {
                // Fallback for any unhandled message types
                setLogs(prev => [...prev, { type: 'log', message: JSON.stringify(message) }]);
            }
        } catch (e) {
            console.error('Failed to parse log from WS:', e, line);
            setLogs(prev => [...prev, { type: 'log', message: `Failed to parse log: ${line}` }]);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket connection error event:', error);
        setLogs(prev => [...prev, { type: 'log', message: 'WebSocket connection failed. Check browser console and server status.' }]);
    };

    ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setLogs(prev => [...prev, { type: 'log', message: `Log stream closed (code: ${event.code}).` }]);
        wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const storedFileId = localStorage.getItem(FILE_ID_KEY);
    if (storedFileId) {
        setCurrentFileId(storedFileId);
        setLogs([{ type: 'log', message: `Found previous session ID: ${storedFileId}. Attempting to reconnect.` }]);
        // To run live, remove comments from: connectWebSocket(storedFileId); 
    }

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if ((uploadMode === 'file' && !selectedFile) || (uploadMode === 'text' && !textInput.trim())) {
        alert('Please select a file or enter text.');
        return;
    }

    setIsAnalyzing(true);
    setLogs([{ type: 'log', message: 'Starting upload and analysis...' }]);

    // 1. Prepare the FormData payload
    const formData = new FormData();
    
    if (uploadMode === 'file' && selectedFile) {
        formData.append('file', selectedFile);
        formData.append('type', fileType); 
    } else if (uploadMode === 'text') {
        const textBlob = new Blob([textInput], { type: 'text/plain' });
        formData.append('file', textBlob, `input${fileType}`); 
        formData.append('type', fileType);
    }
    
    let newFileId: string | undefined;

    try {
        // --- STEP 1: BLOCKING HTTP UPLOAD (Real fetch) ---
        setLogs(prev => [...prev, { type: 'log', message: 'Uploading file to server...' }]);

        const response = await fetch(UPLOAD_ENDPOINT, {
            method: 'POST',
            body: formData, 
        });

        if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status} ${response.statusText}`);
        }
        
        const result: UploadResponse = await response.json();
        newFileId = result.file_id;

        if (!newFileId) {
            throw new Error('Upload response missing file_id.');
        }

        // --- STEP 2: ESTABLISH WEBSOCKET CONNECTION ---
        setLogs(prev => [...prev, { type: 'log', message: `Upload successful. ID: ${newFileId}. Opening log stream...` }]);

        localStorage.setItem(FILE_ID_KEY, newFileId);
        setCurrentFileId(newFileId);
        
        connectWebSocket(newFileId);
        
        setSelectedFile(null);
        setTextInput('');
        if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error) {
        console.error('Analysis failed:', error);
        setLogs(prev => [...prev, { type: 'log', message: `Analysis failed: ${error instanceof Error ? error.message : String(error)}` }]);
    } finally {
        setIsAnalyzing(false); 
    }
  };

  const logHeaderMessage = logs.length > 0 && logs[0].type === 'json_result'
    ? 'Analysis Result (JSON)'
    : currentFileId ? `Analysis Logs (ID: ${currentFileId.substring(0, 8)}...)` : 'Analysis Logs';

  return (
    <div className="p-8 h-screen flex flex-col bg-gray-50">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">eDNA Analysis</h2>
        <div className="mt-3 flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${backendStatus === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {backendStatus === 'online' ? '🟢 Backend Online' : '🔴 Backend Offline'}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Input Data</h3>
          <div className="flex gap-2 mb-4">
            <button onClick={() => { setUploadMode('file'); setSelectedFile(null); setLogs([]); }} disabled={isAnalyzing} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${uploadMode === 'file' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              <FileText className="w-4 h-4 inline mr-2" /> File Upload
            </button>
            <button onClick={() => { setUploadMode('text'); setTextInput(''); setLogs([]); }} disabled={isAnalyzing} className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${uploadMode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              <Type className="w-4 h-4 inline mr-2" /> Text Input
            </button>
          </div>

          {uploadMode === 'file' ? (
            <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => !isAnalyzing && fileInputRef.current?.click()} className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-700 font-medium mb-1">{selectedFile ? selectedFile.name : 'Click to browse'}</p>
            </div>
          ) : (
            <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} disabled={isAnalyzing} placeholder="Paste sequence text here..." className="flex-1 border border-gray-300 rounded-lg p-4 font-mono text-sm resize-none" />
          )}

          <button onClick={handleAnalyze} disabled={isAnalyzing || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'text' && !textInput.trim())} className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {isAnalyzing ? 'Processing...' : 'Start Analysis'}
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{logHeaderMessage}</h3>
          <div className="flex-1 overflow-y-auto">
            <LogDisplay logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}