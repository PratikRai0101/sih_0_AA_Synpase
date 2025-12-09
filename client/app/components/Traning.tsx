'use client';
import { useState, useRef, JSX } from 'react';
import { Upload, Brain, CheckCircle, AlertCircle, Zap, BarChart3 } from 'lucide-react';
import type { AnalysisLog } from '../types';

interface TrainingMetadata {
  depth: string;
  latitude: string;
  longitude: string;
  collectionDate: string;
  voyage: string;
  modelTrained: boolean;
  numRows: number;
  trainingTime: number;
  datasetName: string;
  timestamp: string;
}

interface TrainingResult {
  metadata: TrainingMetadata;
  topRows: any[];
}

export default function Training(): JSX.Element {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata form fields
  const [depth, setDepth] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [voyage, setVoyage] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && isValidFileType(file.name)) {
      setSelectedFile(file);
      setTrainingResult(null);
      setLogs([]);
    } else {
      alert('Please select a valid file (.fasta, .fastq, or .csv)');
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && isValidFileType(file.name)) {
      setSelectedFile(file);
      setTrainingResult(null);
      setLogs([]);
    } else {
      alert('Please select a valid file (.fasta, .fastq, or .csv)');
    }
  };

  const isValidFileType = (filename: string): boolean => {
    const validExtensions = ['.fasta', '.fastq', '.csv'];
    return validExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const handleTrainDataset = async (): Promise<void> => {
    if (!selectedFile) return;

    setIsTraining(true);
    setLogs([{ type: 'log', message: 'Starting training on dataset...' }]);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8000/train', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Training failed with status: ${response.status}`);
      }

      const result = await response.json();
      
      // Parse metadata and top rows
      const metadata: TrainingMetadata = {
        depth,
        latitude,
        longitude,
        collectionDate,
        voyage,
        modelTrained: result.model_trained || true,
        numRows: result.num_rows || 0,
        trainingTime: result.training_time || 0,
        datasetName: selectedFile.name,
        timestamp: new Date().toISOString(),
      };

      const topRows = result.top_rows || [];

      setTrainingResult({ metadata, topRows });
      setLogs([
        ...logs,
        { type: 'log', message: 'Training completed successfully!' },
        { type: 'log', message: `Processed ${metadata.numRows} sequences` },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setLogs([
        ...logs,
        { type: 'error', message: `Training failed: ${errorMessage}` },
      ]);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="p-8 h-screen flex flex-col bg-gray-50">
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900">Model Training</h2>
        <p className="text-gray-600 mt-1">Upload datasets and train your models on FASTA, FASTQ, or CSV files</p>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0 overflow-hidden">
        {/* CENTER PANEL - Upload, Metadata Input and Results (2/3) */}
        <div className="col-span-2 space-y-4 flex flex-col overflow-y-auto">
          {/* Upload Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Dataset Upload</h3>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="h-24 border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".fasta,.fastq,.csv"
                className="hidden"
              />
              <Upload className="w-6 h-6 text-gray-400 mb-1" />
              <p className="text-xs text-gray-700 font-medium text-center">
                {selectedFile ? selectedFile.name : 'Drop file here'}
              </p>
              <p className="text-xs text-gray-500 text-center">or click</p>
            </div>
          </div>
          {/* Metadata Input Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Sample Metadata</h3>
            
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Depth (m)</label>
                  <input
                    type="text"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    placeholder="e.g., 1500"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Collection Date</label>
                  <input
                    type="date"
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g., 23.5°N"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g., 75.5°E"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Voyage</label>
                <input
                  type="text"
                  value={voyage}
                  onChange={(e) => setVoyage(e.target.value)}
                  placeholder="e.g., RV Samudra Manthan - Leg 2"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleTrainDataset}
              disabled={isTraining || !selectedFile}
              className="w-auto px-6 bg-blue-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ml-auto"
            >
              <Brain className="w-4 h-4" />
              {isTraining ? 'Training...' : 'Train'}
            </button>
          </div>

          {/* Results Section - Top 10 Rows */}
          {trainingResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col shadow-sm flex-1 min-h-0">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Sample Data (Top 10 Rows)</h3>
              <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {trainingResult.topRows[0] && Object.keys(trainingResult.topRows[0]).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-semibold text-gray-900 whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trainingResult.topRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        {Object.values(row).map((value: any, vidx) => (
                          <td key={vidx} className="px-3 py-2 text-gray-700 truncate max-w-xs">
                            {String(value).substring(0, 50)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Metadata (1/3) */}
        <div className="col-span-1 bg-white rounded-lg border border-gray-200 p-4 flex flex-col shadow-sm overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Training Info
          </h3>

          {trainingResult ? (
            <div className="space-y-3">
              {/* Status Card */}
              <div className="bg-linear-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-xs font-semibold text-gray-900">Model Trained</p>
                </div>
                <p className="text-xs text-gray-600">
                  {trainingResult.metadata.modelTrained ? 'Yes ✓' : 'No'}
                </p>
              </div>

              {/* User Input Metadata */}
              <div className="space-y-2">
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-0.5">Depth</p>
                  <p className="text-sm font-bold text-blue-600">
                    {trainingResult.metadata.depth || 'N/A'} m
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-0.5">Latitude</p>
                  <p className="text-sm font-bold text-gray-900">
                    {trainingResult.metadata.latitude || 'N/A'}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-0.5">Longitude</p>
                  <p className="text-sm font-bold text-gray-900">
                    {trainingResult.metadata.longitude || 'N/A'}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-0.5">Collection Date</p>
                  <p className="text-sm font-bold text-gray-900">
                    {trainingResult.metadata.collectionDate || 'N/A'}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-0.5">Voyage</p>
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {trainingResult.metadata.voyage || 'N/A'}
                  </p>
                </div>

                {/* Training Statistics */}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-0.5">No. of Rows</p>
                    <p className="text-sm font-bold text-gray-900">
                      {trainingResult.metadata.numRows.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 mt-2">
                    <p className="text-xs text-gray-600 mb-0.5">Training Time</p>
                    <p className="text-sm font-bold text-gray-900">
                      {trainingResult.metadata.trainingTime.toFixed(2)}s
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 mt-2">
                    <p className="text-xs text-gray-600 mb-0.5">Dataset</p>
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {trainingResult.metadata.datasetName}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 mt-2">
                    <p className="text-xs text-gray-600 mb-0.5">Timestamp</p>
                    <p className="text-xs text-gray-900">
                      {new Date(trainingResult.metadata.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Brain className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-gray-500 text-xs">No training results yet</p>
              <p className="text-gray-400 text-xs mt-0.5">Upload and train</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}