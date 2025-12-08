import { create } from 'zustand';
import { Sample, AnalysisResult, ProgressStep, VerificationUpdate } from '../types';

interface AppState {
  samples: Sample[];
  addSample: (sample: Sample) => void;
  updateSampleStatus: (fileId: string, status: Sample['status']) => void;
  addSampleLog: (fileId: string, log: string) => void;
  updateSampleProgress: (fileId: string, progress: ProgressStep) => void;
  setSampleAnalysisResult: (fileId: string, result: AnalysisResult) => void;
  addSampleVerificationUpdate: (fileId: string, update: VerificationUpdate) => void;
  getSample: (fileId: string) => Sample | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  samples: [],
  addSample: (sample) => set((state) => ({ samples: [...state.samples, sample] })),
  updateSampleStatus: (fileId, status) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.fileId === fileId ? { ...s, status } : s
      ),
    })),
  addSampleLog: (fileId, log) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.fileId === fileId ? { ...s, logs: [...s.logs, log] } : s
      ),
    })),
  updateSampleProgress: (fileId, progress) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.fileId === fileId ? { ...s, progress: [...s.progress, progress] } : s
      ),
    })),
  setSampleAnalysisResult: (fileId, result) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.fileId === fileId ? { ...s, latestAnalysis: result } : s
      ),
    })),
  addSampleVerificationUpdate: (fileId, update) =>
    set((state) => ({
      samples: state.samples.map((s) =>
        s.fileId === fileId
          ? { ...s, verificationUpdates: [...s.verificationUpdates, update] }
          : s
      ),
    })),
  getSample: (fileId) => get().samples.find((s) => s.fileId === fileId),
}));
