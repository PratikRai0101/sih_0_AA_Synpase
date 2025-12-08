'use client';
import { useState, useEffect, useRef, useCallback, JSX } from 'react';
import { Upload, FileText, Type } from 'lucide-react';
import LogDisplay from './LogDisplay'; 
import type { AnalysisLog } from '../types'; 
import { useAnalysis, type TaxaData } from '../context/AnalysisContext';

// --- Constants & Types ---
const API_BASE_URL = 'http://127.0.0.1:8000'; 
const UPLOAD_ENDPOINT = `${API_BASE_URL}/upload`;
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

  // --- WebSocket Connection Handler ---
  const connectWebSocket = useCallback((fileId: string) => {
    if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
    }

    const wsUrl = `ws://127.0.0.1:8000/ws/${fileId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
        setLogs(prev => [...prev, { type: 'log', message: `Connected to log stream for ID: ${fileId}` }]);
    };

    ws.onmessage = (event) => {
        const line = event.data;
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

  // --- Startup Effect: Check Local Storage for existing File ID & Cleanup ---
  useEffect(() => {
    const storedFileId = localStorage.getItem(FILE_ID_KEY);
    if (storedFileId) {
        setCurrentFileId(storedFileId);
        setLogs([{ type: 'log', message: `Found previous session ID: ${storedFileId}. Attempting to reconnect.` }]);
        // To run live, remove comments from: connectWebSocket(storedFileId); 
    }

    return () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
    };
  }, [connectWebSocket]);
  
  // --- Input Handlers ---
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // --- Analysis Start Handler (Using REAL fetch for /upload) ---
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

  // --- Render ---

  const logHeaderMessage = currentFileId 
    ? `Analysis Logs (Streaming for ID: ${currentFileId})`
    : 'Analysis Logs';

  return (
    <div className="p-8 h-screen flex flex-col">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">eDNA Analysis</h2>
        <p className="text-gray-600 mt-1">Upload samples and monitor analysis progress</p>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
        <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Sample</h3>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setUploadMode('file'); setSelectedFile(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                uploadMode === 'file'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              File Upload
            </button>
            <button
              onClick={() => { setUploadMode('text'); setTextInput(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                uploadMode === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Type className="w-4 h-4" />
              Text Input
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sequence Format
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as '.fasta' | '.fastq')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value=".fasta">.FASTA</option>
              <option value=".fastq">.FASTQ</option>
            </select>
          </div>

          {uploadMode === 'file' ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".fasta,.fastq,.fa,.fq"
                className="hidden"
              />
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-700 font-medium mb-1">
                {selectedFile ? selectedFile.name : 'Drop file here or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                Supports .FASTA and .FASTQ formats
              </p>
            </div>
          ) : (
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste your sequence data here..."
              className="flex-1 border border-gray-300 rounded-lg p-4 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          )}

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'text' && !textInput.trim())}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? 'Uploading & Connecting...' : 'Start Analysis'}
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{logHeaderMessage}</h3>
          <div className="flex-1 overflow-y-auto">
            <LogDisplay logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}