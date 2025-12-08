export type LogType = 'log' | 'progress' | 'clustering_result' | 'verification_update' | 'complete';

export interface LogMessage {
  type: 'log';
  message: string;
}

export interface ProgressMessage {
  type: 'progress';
  step: string;
  status: string;
}

export interface ClusteringResult {
  type: 'clustering_result';
  data: {
    total_reads: number;
    total_clusters: number;
    noise_count: number;
    noise_percentage: number;
    top_groups: {
      group_id: number;
      count: number;
      percentage: number;
    }[];
  };
}

export interface VerificationUpdate {
  type: 'verification_update';
  data: {
    step: string;
    cluster_id: number;
    status: string;
    match_percentage: number;
    description: string;
  };
}

export interface CompleteMessage {
  type: 'complete';
  message: string;
}

export type AnalysisLog = LogMessage | ProgressMessage | ClusteringResult | VerificationUpdate | CompleteMessage;
