'use client';
import { useState, useEffect, useRef, JSX } from 'react';
import { Upload, Brain, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react';


interface TrainingSession {
  id: string; 
  name: string;
  dataset_name: string;
  file_type: string;
  status: 'pending' | 'training' | 'completed' | 'failed';
  model_type: 'rag' | 'embedding' | 'clustering'; 
  accuracy: number;
  samples_count: number;
  created_at: string;
  updated_at: string;
}

const INITIAL_SESSIONS: TrainingSession[] = [
    {
        id: '101',
        name: 'Initial Model Training',
        dataset_name: 'survey_data_v1.fasta',
        file_type: '.fasta',
        status: 'completed',
        model_type: 'rag',
        accuracy: 92.5,
        samples_count: 5200,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: '102',
        name: 'Embedding Update Q1',
        dataset_name: 'new_vectors.fastq',
        file_type: '.fastq',
        status: 'training',
        model_type: 'embedding',
        accuracy: 65.1,
        samples_count: 1200,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 120000).toISOString(),
    },
];
// --- END MOCK DATA ---


export default function Training(): JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modelType, setModelType] = useState<'rag' | 'embedding' | 'clustering'>('rag');
  const [sessionName, setSessionName] = useState<string>('');
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [recentTraining, setRecentTraining] = useState<TrainingSession[]>([]); 
  const [loading, setLoading] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    loadRecentTraining();
  }, []);

  const loadRecentTraining = async (): Promise<void> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    setRecentTraining(INITIAL_SESSIONS);
    setLoading(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSessionName(file.name.split('.')[0]);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setSessionName(file.name.split('.')[0]);
    }
  };

  // --- LOCAL Mock Session Creation ---
  const handleStartTraining = async (): Promise<void> => {
    if (!selectedFile || !sessionName) return;

    setIsTraining(true);
    const fileExtension = selectedFile.name.split('.').pop() || 'unknown';

    const newSession: TrainingSession = {
        id: Date.now().toString(),
        name: sessionName,
        dataset_name: selectedFile.name,
        file_type: `.${fileExtension}`,
        status: 'pending',
        model_type: modelType,
        accuracy: 0,
        samples_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    // 2. Simulate training process locally (optional)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 3. Update state with the new session
    setRecentTraining(prev => [newSession, ...prev]);

    // Reset form state
    setSelectedFile(null);
    setSessionName('');
    
    setIsTraining(false);
  };

  // --- Helper Functions (No changes needed) ---

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'training':
        return <Zap className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'training':
        return 'bg-blue-50 border-blue-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-8 h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white">Model Training</h2>
        <p className="text-gray-300 mt-1">Upload datasets and train RAG/embedding models</p>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        <div className="col-span-2 bg-white rounded-lg p-6 flex flex-col shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">New Training Session</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Name</label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="e.g., Deep Sea Survey Q4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Model Type</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'rag', label: 'RAG', icon: Brain },
                { id: 'embedding', label: 'Embedding', icon: Brain },
                { id: 'clustering', label: 'Clustering', icon: Brain },
              ].map((model) => {
                const Icon = model.icon;
                return (
                  <button
                    key={model.id}
                    onClick={() => setModelType(model.id as any)}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-colors border-2 ${
                      modelType === model.id
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {model.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6 flex-1 flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">Dataset File</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 transition-colors"
            >
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-700 font-medium mb-1">
                {selectedFile ? selectedFile.name : 'Drop file here or click to browse'}
              </p>
              <p className="text-sm text-gray-500">Supports .FASTA, .FASTQ, and reference databases</p>
            </div>
          </div>

          <button
            onClick={handleStartTraining}
            disabled={isTraining || !selectedFile || !sessionName}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Brain className="w-5 h-5" />
            {isTraining ? 'Adding Session...' : 'Start Training (Mock)'}
          </button>
        </div>

        <div className="bg-white rounded-lg p-6 flex flex-col shadow-lg">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Training (Mock Data)</h3>
          <div className="flex-1 overflow-y-auto space-y-3">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Loading...</p>
              </div>
            ) : recentTraining.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No training sessions yet</p>
              </div>
            ) : (
              recentTraining.map((session) => (
                <div key={session.id} className={`border rounded-lg p-3 ${getStatusColor(session.status)}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getStatusIcon(session.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{session.name}</p>
                        <p className="text-xs text-gray-600 truncate">{session.dataset_name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Model</p>
                      <p className="font-medium text-gray-900 uppercase">{session.model_type}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Accuracy</p>
                      <p className="font-medium text-gray-900">{session.accuracy.toFixed(1)}%</p>
                    </div>
                  </div>
                  {session.samples_count > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {session.samples_count.toLocaleString()} samples processed
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}