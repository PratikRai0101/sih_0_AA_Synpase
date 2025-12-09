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
                <div key={step.id} className="border border-green-200 rounded-lg overflow-hidden shadow-md">
                    <button
                        onClick={() => toggleLog(step.id)}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 transition-all rounded-lg"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 animate-pulse" />
                            <div className="text-left">
                                <span className="text-base font-bold text-green-900">{step.label}</span>
                                <span className="text-sm text-green-700 ml-2">✓ Clustering Complete</span>
                            </div>
                        </div>
                        {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-green-600" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-green-600" />
                        )}
                    </button>
                    {isExpanded && (
                        <div className="p-5 bg-white border-t border-green-200 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-xs text-green-600 font-semibold uppercase">Total Reads</p>
                                    <p className="text-2xl font-bold text-green-900 mt-2">{log.total_reads.toLocaleString()}</p>
                                </div> 
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-xs text-blue-600 font-semibold uppercase">Total Clusters</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-2">{log.total_clusters.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <p className="text-xs text-purple-600 font-semibold uppercase">Noise %</p>
                                    <p className="text-2xl font-bold text-purple-900 mt-2">{log.noise_percentage}%</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 mb-3">📊 Top Groups by Abundance</p>
                                <div className="space-y-2">
                                  {log.top_groups.map((group: any) => (
                                    <div key={group.group_id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                      <span className="text-sm font-semibold text-gray-800">Group {group.group_id}</span>
                                      <div className="flex items-center gap-4">
                                        <span className="text-base font-bold text-gray-700">{group.count.toLocaleString()}</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-20 h-2 bg-gray-300 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500" style={{width: `${group.percentage}%`}}></div>
                                          </div>
                                          <span className="text-sm font-bold text-green-600 min-w-10">{group.percentage}%</span>
                                        </div>
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
                <div key={step.id} className={`border-2 rounded-lg overflow-hidden shadow-md ${step.status === 'complete' ? 'border-green-300' : 'border-gray-200'}`}>
                    <button
                        onClick={() => toggleLog(step.id)}
                        className={`w-full flex items-center justify-between p-4 transition-all rounded-lg ${step.status === 'complete' ? 'bg-gradient-to-r from-green-50 to-green-100' : colorMap.bg} ${step.status === 'complete' ? 'hover:from-green-100 hover:to-green-200' : colorMap.hover} ${step.status === 'complete' ? 'border-green-200' : colorMap.border}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <IconComponent className={`w-5 h-5 ${step.status === 'complete' ? 'text-green-600 animate-pulse' : colorMap.text}`} />
                            </div>
                            <div className="text-left">
                                <span className={`text-base font-bold ${step.status === 'complete' ? 'text-green-900' : colorMap.text}`}>{step.label}</span>
                                <span className={`text-sm ml-2 ${step.status === 'complete' ? 'text-green-700' : colorMap.text}`}>• Cluster {log.data.cluster_id}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {step.status === 'complete' && (
                                <CheckCircle className="w-5 h-5 text-green-600 animate-pulse" />
                            )}
                            {isExpanded ? (
                                <ChevronDown className={`w-5 h-5 ${step.status === 'complete' ? 'text-green-600' : colorMap.text}`} />
                            ) : (
                                <ChevronRight className={`w-5 h-5 ${step.status === 'complete' ? 'text-green-600' : colorMap.text}`} />
                            )}
                        </div>
                    </button>
                    {isExpanded && (
                        <div className={`p-5 bg-white border-t-2 space-y-3 ${step.status === 'complete' ? 'border-green-200' : 'border-gray-200'}`}>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-semibold text-gray-700">Status</span>
                                <span className={`text-base font-bold ${step.status === 'complete' ? 'text-green-600' : colorMap.text}`}>{log.data.status}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-semibold text-gray-700">Match Accuracy</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-gray-300 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{width: `${log.data.match_percentage}%`}}></div>
                                    </div>
                                    <span className="text-base font-bold text-blue-600 min-w-12">{log.data.match_percentage}%</span>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-semibold text-gray-700">Details</span>
                                <p className="text-base text-gray-800 mt-2 leading-relaxed">{log.data.description}</p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }


        // --- C. Render Default Sequential Steps (Non-collapsible) ---
        return (
            <div key={step.id} className={`flex items-start gap-3 p-4 rounded-lg ${className} transition-all duration-300`}>
                <Icon className="w-5 h-5 mt-1 flex-shrink-0" />
                <div className="flex-1">
                    <span className="text-base font-semibold">{step.label}</span>
                    {step.status === 'complete' && (
                        <div className="flex items-center gap-2 mt-1">
                            <CheckCircle className="w-5 h-5 text-green-500 animate-pulse" />
                            <span className="text-sm text-green-600 font-medium">Completed</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-3">
            {logs.length === 0 ? (
                <div className="text-center py-16 text-gray-500 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
                    <p className="text-lg font-semibold text-gray-600">No analysis running</p>
                    <p className="text-base text-gray-500 mt-1">Upload a file to start analysis</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {pipelineSteps.map((step) => renderPipelineStep(step))}
                </div>
            )}
        </div>
    );
}