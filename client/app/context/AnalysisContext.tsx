'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

export interface TaxaData {
  name: string;
  genus: string;
  class: string;
  count: number;
  probability: number;
  percentage: number;
}

export interface AnalysisData {
  totalReads: number;
  totalClusters: number;
  novelTaxa: number;
  recentAnalyses: {
    id: string;
    sample: string;
    location: string;
    status: string;
    date: string;
  }[];
  taxaAbundance: TaxaData[];
  lastUpdated: Date | null;
}

interface AnalysisContextType {
  analysisData: AnalysisData;
  updateAnalysisData: (data: Partial<AnalysisData>) => void;
  addTaxaData: (taxa: TaxaData[]) => void;
  addRecentAnalysis: (analysis: {
    id: string;
    sample: string;
    location: string;
    status: string;
    date: string;
  }) => void;
}

const defaultAnalysisData: AnalysisData = {
  totalReads: 1247,
  totalClusters: 3892,
  novelTaxa: 156,
  recentAnalyses: [
    { id: '1', sample: 'DS-2024-001', location: 'Central Indian Basin', status: 'Completed', date: '2024-12-07' },
    { id: '2', sample: 'DS-2024-002', location: 'Carlsberg Ridge', status: 'Processing', date: '2024-12-08' },
    { id: '3', sample: 'DS-2024-003', location: 'Arabian Sea', status: 'Completed', date: '2024-12-06' },
  ],
  taxaAbundance: [],
  lastUpdated: null,
};

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [analysisData, setAnalysisData] = useState<AnalysisData>(defaultAnalysisData);

  const updateAnalysisData = (data: Partial<AnalysisData>) => {
    setAnalysisData(prev => ({
      ...prev,
      ...data,
      lastUpdated: new Date(),
    }));
  };

  const addTaxaData = (taxa: TaxaData[]) => {
    setAnalysisData(prev => ({
      ...prev,
      taxaAbundance: taxa,
      lastUpdated: new Date(),
    }));
  };

  const addRecentAnalysis = (analysis: {
    id: string;
    sample: string;
    location: string;
    status: string;
    date: string;
  }) => {
    setAnalysisData(prev => ({
      ...prev,
      recentAnalyses: [analysis, ...prev.recentAnalyses.slice(0, 2)],
      lastUpdated: new Date(),
    }));
  };

  return (
    <AnalysisContext.Provider value={{ analysisData, updateAnalysisData, addTaxaData, addRecentAnalysis }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}
