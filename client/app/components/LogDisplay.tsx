'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react';
import type { AnalysisLog, PipelineStep  } from '../types'; 

// --- 1. Static Pipeline Definition (Hard-coded sequential steps) ---
const INITIAL_PIPELINE: PipelineStep[] = [
    { id: 'read_sequences', label: 'Reading Sequences...', status: 'pending' },
    { id: 'generate_embeddings', label: 'Generating AI Embeddings...', status: 'pending' },
    { id: 'umap_hdbscan', label: 'Running UMAP & HDBSCAN...', status: 'pending' },
    { id: 'clustering_result', label: 'Clustering Complete', status: 'pending' }, 
    { id: 'ncbi_verification', label: 'Starting NCBI Verification (Slow)...', status: 'pending' },
    { id: 'analysis_complete', label: 'Analysis Complete', status: 'pending' },
];

interface LogDisplayProps {
  logs: AnalysisLog[];
}

export default function LogDisplay({ logs }: LogDisplayProps) {
    const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(INITIAL_PIPELINE);
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
    const [lastVerificationUpdate, setLastVerificationUpdate] = useState<AnalysisLog | null>(null);

    // --- 2. State & Effect for Sequential Update ---
    
    useEffect(() => {
        if (logs.length === 0) {
            setPipelineSteps(INITIAL_PIPELINE);
            setLastVerificationUpdate(null);
            return;
        }

        const lastLog = logs[logs.length - 1];

        setPipelineSteps(prevSteps => {
            const newSteps = [...prevSteps];
            let changed = false;
            
            // Function to find step index by ID
            const findIndexById = (id: string) => newSteps.findIndex(s => s.id === id);

            const handleCompletion = (stepId: string, resultData?: any) => {
                const index = findIndexById(stepId);
                if (index !== -1 && newSteps[index].status !== 'complete') {
                    newSteps[index] = { ...newSteps[index], status: 'complete', resultData: resultData };
                    
                    // Activate the next step (if it exists and is pending)
                    const nextIndex = index + 1;
                    if (nextIndex < newSteps.length && newSteps[nextIndex].status === 'pending') {
                        newSteps[nextIndex] = { ...newSteps[nextIndex], status: 'active' };
                    }
                    changed = true;
                }
            };
            
            const activateStep = (stepId: string) => {
                const index = findIndexById(stepId);
                if (index !== -1 && newSteps[index].status === 'pending') {
                    newSteps[index] = { ...newSteps[index], status: 'active' };
                    changed = true;
                }
            };
            
            // --- A. Handle Log Messages (Activate steps based on message content) ---
            if (lastLog.type === 'log') {
                const message = lastLog.message.toLowerCase();
                
                if (message.includes('reading sequences')) {
                    activateStep('read_sequences');
                } else if (message.includes('found') && message.includes('sequences')) {
                    handleCompletion('read_sequences');
                } else if (message.includes('generating') && message.includes('embeddings')) {
                    activateStep('generate_embeddings');
                } else if (message.includes('running umap')) {
                    handleCompletion('generate_embeddings');
                    activateStep('umap_hdbscan');
                } else if (message.includes('clustering complete')) {
                    handleCompletion('umap_hdbscan');
                } else if (message.includes('ncbi verification')) {
                    activateStep('ncbi_verification');
                }
            }
            
            // --- B. Handle Progress Messages ---
            if (lastLog.type === 'progress' && lastLog.status === 'complete' && lastLog.step) {
                handleCompletion(lastLog.step);
            }
            
            // --- C. Handle Clustering Result ---
            if (lastLog.type === 'clustering_result') {
                handleCompletion('umap_hdbscan');
                handleCompletion('clustering_result', lastLog.data);
            }
            
            // --- D. Handle Final Completion ---
            if (lastLog.type === 'complete') {
                handleCompletion('ncbi_verification');
                handleCompletion('analysis_complete');
            }

            // --- E. Handle Verification Updates (Logs WITHIN a step) ---
            if (lastLog.type === 'verification_update') {
                setLastVerificationUpdate(lastLog);
                activateStep('ncbi_verification');
            }
            
            return changed ? newSteps : prevSteps;
        });

    }, [logs]);

    // --- 3. UI Helper Functions ---
    
    const toggleLog = (id: string) => {
        const newExpanded = new Set(expandedLogs);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedLogs(newExpanded);
    };

    const STATUS_MAP = useMemo(() => ({
        pending: { icon: Clock, className: 'bg-gray-50 text-gray-500 border border-gray-200' },
        active: { icon: Zap, className: 'bg-blue-50 text-blue-600 border border-blue-200' },
        complete: { icon: CheckCircle, className: 'bg-green-50 text-green-600 border border-green-200' },
        error: { icon: AlertCircle, className: 'bg-red-50 text-red-600 border border-red-200' },
    }), []);

    const VERIFICATION_COLORS = useMemo(() => ({
        NOVEL: {bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-600', border: 'border-purple-200'},
        MATCHED: {bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-600', border: 'border-blue-200'},
        COMPLETE: {bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-600', border: 'border-green-200'},
    }), []);

    // --- 4. Render Step Components ---

    const renderPipelineStep = (step: PipelineStep) => {
        const { icon: Icon, className } = STATUS_MAP[step.status];
        const isExpanded = expandedLogs.has(step.id);
        
        // --- A. Render CLUSTERING RESULT (Collapsible) ---
        if (step.id === 'clustering_result' && step.status === 'complete') {
            const log = step.resultData;
            if (!log) return null;

            return (
                <div key={step.id} className="border border-gray-200 rounded-lg">
                    <button
                        onClick={() => toggleLog(step.id)}
                        className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">{step.label}</span>
                        </div>
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-green-600" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-green-600" />
                        )}
                    </button>
                    {isExpanded && (
                        <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-600">Total Reads</p>
                                    <p className="text-lg font-bold text-gray-900">{log.total_reads.toLocaleString()}</p>
                                </div> 
                                <div>
                                    <p className="text-xs text-gray-600">Total Clusters</p>
                                    <p className="text-lg font-bold text-gray-900">{log.total_clusters.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Noise Percentage</p>
                                    <p className="text-lg font-bold text-gray-900">{log.noise_percentage}%</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-600 mb-2">Top Groups</p>
                                <div className="space-y-2">
                                  {log.top_groups.map((group: any) => (
                                    <div key={group.group_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <span className="text-sm text-gray-700">Group {group.group_id}</span>
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm text-gray-600">{group.count.toLocaleString()} reads</span>
                                        <span className="text-sm font-medium text-gray-900">{group.percentage}%</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                        </div>
                    )}
                </div>
            );
        }
        
        // --- B. Render NCBI Verification Update Logs (Active streaming collapsible) ---
        if (step.id === 'ncbi_verification' && step.status !== 'pending') {
            const log = lastVerificationUpdate || { data: { status: 'PENDING', cluster_id: 'N/A', match_percentage: 0, description: 'Waiting...' } };
            
            const statusKey = step.status === 'complete' ? 'COMPLETE' : log.data.status.includes('NOVEL') ? 'NOVEL' : 'MATCHED';
            const colorMap = VERIFICATION_COLORS[statusKey] || VERIFICATION_COLORS['MATCHED'];
            
            const IconComponent = step.status === 'complete' ? CheckCircle : AlertCircle;
            
            return (
                <div key={step.id} className="border border-gray-200 rounded-lg">
                    <button
                        onClick={() => toggleLog(step.id)}
                        className={`w-full flex items-center justify-between p-3 transition-colors rounded-lg ${colorMap.bg} ${colorMap.hover} ${colorMap.border}`}
                    >
                        <div className="flex items-center gap-3">
                            <IconComponent className={`w-4 h-4 ${colorMap.text}`} />
                            <div className="text-left">
                                <span className={`text-sm font-medium ${colorMap.text}`}>{step.label}</span>
                                <span className={`text-xs ml-2 ${colorMap.text}`}>• Cluster {log.data.cluster_id}</span>
                            </div>
                        </div>
                        {isExpanded ? (
                            <ChevronDown className={`w-4 h-4 ${colorMap.text}`} />
                        ) : (
                            <ChevronRight className={`w-4 h-4 ${colorMap.text}`} />
                        )}
                    </button>
                    {isExpanded && (
                        <div className="p-4 bg-white border-t border-gray-200 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Status</span>
                                <span className={`text-sm font-medium ${colorMap.text}`}>{log.data.status}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Match Percentage</span>
                                <span className="text-sm font-medium text-gray-900">{log.data.match_percentage}%</span>
                            </div>
                            <div>
                                <span className="text-xs text-gray-600">Description</span>
                                <p className="text-sm text-gray-700 mt-1">{log.data.description}</p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }


        // --- C. Render Default Sequential Steps (Non-collapsible) ---
        return (
            <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg ${className}`}>
                <Icon className="w-4 h-4 mt-0.5" />
                <span className="text-sm font-medium">{step.label}</span>
            </div>
        );
    };

    return (
        <div className="space-y-3">
            {logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>Analysis logs will appear here</p>
                </div>
            ) : (
                pipelineSteps.map((step) => renderPipelineStep(step))
            )}
        </div>
    );
}