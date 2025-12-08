'use client';
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle, Zap, Code } from 'lucide-react';
import type { AnalysisLog, PipelineStep } from '../types'; 

const INITIAL_PIPELINE: PipelineStep[] = [
    { id: 'read_sequences', label: 'Reading Sequences...', status: 'pending' },
    { id: 'generate_embeddings', label: 'Generating AI Embeddings...', status: 'pending' },
    { id: 'umap_hdbscan', label: 'Running UMAP & HDBSCAN...', status: 'pending' },
    { id: 'clustering_result', label: 'Clustering Complete', status: 'pending' }, 
    { id: 'ncbi_verification', label: 'Starting NCBI Verification (Slow)...', status: 'pending' },
    { id: 'analysis_complete', label: 'Analysis Complete', status: 'pending' },
];

interface LogDisplayProps {
  logs: AnalysisLog[]; // Note: might contain { type: 'json_result', data: ... }
}

export default function LogDisplay({ logs }: LogDisplayProps) {
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

    // --- MODE 1: JSON VIEW (For Text Input) ---
    // If the first log is our special 'json_result' type, render raw JSON.
    if (logs.length > 0 && logs[0].type === 'json_result') {
        const jsonData = (logs[0] as any).data;
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                    <Code className="w-4 h-4" />
                    <span>Raw JSON Response</span>
                </div>
                <div className="flex-1 bg-gray-900 rounded-lg p-4 overflow-auto border border-gray-700">
                    <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap break-all">
                        {JSON.stringify(jsonData, null, 2)}
                    </pre>
                </div>
            </div>
        );
    }
    
    // --- MODE 2: PIPELINE STEPS VIEW (For File Upload / Socket) ---
    // (Logic remains exactly as before for sequential steps)

    const pipelineSteps = useMemo(() => {
        if (logs.length === 0) return INITIAL_PIPELINE;

        const steps = INITIAL_PIPELINE.map(s => ({...s}));
        const completedIds = new Set<string>();
        let lastVerification = null;

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
            if (log.type === 'complete') completedIds.add('analysis_complete');
        });

            // --- E. Handle Verification Updates (Logs WITHIN a step) ---
            if (lastLog.type === 'verification_update') {
                setLastVerificationUpdate(lastLog);
                activateStep('ncbi_verification');
            }
        });

        const verifyStep = steps.find(s => s.id === 'ncbi_verification');
        if (verifyStep && lastVerification) verifyStep.resultData = lastVerification;

        return steps;
    }, [logs]);

    const toggleLog = (id: string) => {
        const newExpanded = new Set(expandedLogs);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedLogs(newExpanded);
    };

    const STATUS_MAP = {
        pending: { icon: Clock, className: 'bg-gray-50 text-gray-500 border border-gray-200' },
        active: { icon: Zap, className: 'bg-blue-50 text-blue-600 border border-blue-200' },
        complete: { icon: CheckCircle, className: 'bg-green-50 text-green-600 border border-green-200' },
        error: { icon: AlertCircle, className: 'bg-red-50 text-red-600 border border-red-200' },
    };

    return (
        <div className="space-y-3">
             {/* Render Error Logs separately if present */}
             {logs.some(l => l.type === 'error') && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4"/>
                    {logs.find(l => l.type === 'error')?.message || 'An error occurred'}
                </div>
            )}

            {pipelineSteps.map((step) => {
                const { icon: Icon, className } = STATUS_MAP[step.status];
                const isExpanded = expandedLogs.has(step.id);
                
                // RENDER CLUSTERING RESULT
                if (step.id === 'clustering_result' && step.status === 'complete') {
                    const data = step.resultData;
                    return (
                        <div key={step.id} className="border border-gray-200 rounded-lg">
                            <button onClick={() => toggleLog(step.id)} className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-900">{step.label}</span>
                                </div>
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-green-600" /> : <ChevronRight className="w-4 h-4 text-green-600" />}
                            </button>
                            {isExpanded && data && (
                                <div className="p-4 bg-white border-t border-gray-200 space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Clusters:</span> <b>{data.total_clusters}</b></div>
                                    <div className="flex justify-between"><span>Reads:</span> <b>{data.total_reads}</b></div>
                                    <div className="mt-2 font-medium">Top Groups:</div>
                                    {data.top_groups?.map((g: any, i: number) => (
                                        <div key={i} className="pl-2 border-l-2 border-green-200 text-gray-600">
                                            Group {g.group_id}: {g.count} reads ({g.percentage}%)
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                }

                // RENDER VERIFICATION
                if (step.id === 'ncbi_verification' && step.status !== 'pending') {
                    const data = step.resultData || {};
                    const isNovel = data.status === 'NOVEL';
                    const colorClass = step.status === 'complete' ? 'bg-green-50 border-green-200 text-green-700' : 
                                     isNovel ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700';

                    return (
                        <div key={step.id} className={`border rounded-lg ${colorClass}`}>
                             <button onClick={() => toggleLog(step.id)} className="w-full flex items-center justify-between p-3 rounded-lg hover:opacity-80 transition-opacity">
                                <div className="flex items-center gap-3">
                                    {step.status === 'complete' ? <CheckCircle className="w-4 h-4"/> : <Zap className="w-4 h-4"/>}
                                    <div className="text-left">
                                        <div className="text-sm font-medium">{step.label}</div>
                                        {data.cluster_id && <div className="text-xs opacity-75">Cluster {data.cluster_id}: {data.status}</div>}
                                    </div>
                                </div>
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                             {isExpanded && data.cluster_id && (
                                <div className="p-4 bg-white border-t border-gray-200 space-y-2 text-sm text-gray-700">
                                    <div className="flex justify-between"><span>Status:</span> <b>{data.status}</b></div>
                                    <div className="flex justify-between"><span>Match:</span> <b>{data.match_percentage}%</b></div>
                                    <div className="italic text-gray-500">{data.description}</div>
                                </div>
                            )}
                        </div>
                    )
                }

                // DEFAULT RENDER
                return (
                    <div key={step.id} className={`flex items-start gap-3 p-3 rounded-lg ${className}`}>
                        <Icon className="w-4 h-4 mt-0.5" />
                        <span className="text-sm font-medium">{step.label}</span>
                    </div>
                );
            })}
        </div>
    );
}