export interface Sample {
  fileId: string;
  sampleId: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  fileName?: string;
  uploadDate?: string;
  latestAnalysis?: AnalysisResult;
  logs: string[];
  progress: ProgressStep[];
  verificationUpdates: VerificationUpdate[];
}

export interface AnalysisResult {
  total_sequences?: number;
  num_clusters?: number;
  num_novel_clusters?: number;
  cluster_summary?: ClusterSummary[];
  [key: string]: any;
}

export interface ClusterSummary {
  cluster_id: string;
  size: number;
  novelty_score: number;
}

export interface ProgressStep {
  step: string;
  status: string;
}

export interface VerificationUpdate {
  clusterId?: string;
  taxon?: string;
  message?: string;
  [key: string]: any;
}

// WebSocket Message Types
export type WebSocketMessageType = 'log' | 'progress' | 'clustering_result' | 'verification_update' | 'complete' | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  message?: string;
  step?: string;
  status?: string;
  data?: any;
}
