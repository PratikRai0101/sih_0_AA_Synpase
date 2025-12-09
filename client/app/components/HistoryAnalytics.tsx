'use client';

import { useEffect, useState } from 'react';
import { Trash2, Download, ChevronDown } from 'lucide-react';

interface HistoryItem {
  id: number;
  type: 'training' | 'analysis';
  file_id: string;
  filename: string;
  file_type: string;
  status: string;
  created_at: string;
  // Training specific
  num_rows?: number;
  training_time?: number;
  depth?: string;
  latitude?: string;
  longitude?: string;
  collection_date?: string;
  voyage?: string;
  // Analysis specific
  sequence_count?: number;
  total_clusters?: number;
  total_reads?: number;
  result_data?: any;
}

export default function HistoryAnalytics() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (type: string, fileId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/history/${type}/${fileId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setHistory(prev => prev.filter(item => item.file_id !== fileId));
      }
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
      try {
        const response = await fetch('http://localhost:8000/history', {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setHistory([]);
        }
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case '.fasta':
        return '🧬';
      case '.fastq':
        return '📊';
      case 'text':
        return '📝';
      default:
        return '📄';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Upload History</h2>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-2">No upload history yet</p>
          <p className="text-gray-400">Your uploads will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 max-h-96 overflow-y-auto pr-2">
          {history.map((item) => (
            <div
              key={item.file_id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg hover:border-teal-300 transition-all bg-white"
            >
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(expandedId === item.file_id ? null : item.file_id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-2xl">{getFileTypeIcon(item.file_type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{item.filename}</p>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedId === item.file_id ? 'transform rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {expandedId === item.file_id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {item.type === 'training' && (
                      <>
                        {item.num_rows !== undefined && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600">Records</p>
                            <p className="font-semibold text-gray-900">{item.num_rows}</p>
                          </div>
                        )}
                        {item.training_time !== undefined && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600">Training Time</p>
                            <p className="font-semibold text-gray-900">{item.training_time.toFixed(2)}s</p>
                          </div>
                        )}
                        {item.depth && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600">Depth</p>
                            <p className="font-semibold text-gray-900">{item.depth}m</p>
                          </div>
                        )}
                        {item.latitude && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600">Location</p>
                            <p className="font-semibold text-gray-900">{item.latitude}, {item.longitude}</p>
                          </div>
                        )}
                        {item.voyage && (
                          <div className="bg-gray-50 p-3 rounded col-span-2">
                            <p className="text-gray-600">Voyage</p>
                            <p className="font-semibold text-gray-900">{item.voyage}</p>
                          </div>
                        )}
                      </>
                    )}
                    {item.type === 'analysis' && (
                      <>
                        {item.sequence_count !== undefined && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600">Sequences</p>
                            <p className="font-semibold text-gray-900">{item.sequence_count}</p>
                          </div>
                        )}
                        {item.total_reads !== undefined && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600">Total Reads</p>
                            <p className="font-semibold text-gray-900">{item.total_reads.toLocaleString()}</p>
                          </div>
                        )}
                        {item.total_clusters !== undefined && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600">Total Clusters</p>
                            <p className="font-semibold text-gray-900">{item.total_clusters}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.type, item.file_id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
