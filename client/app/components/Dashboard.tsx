'use client';

import { useContext } from 'react';
import { Database, Dna, Sparkles } from 'lucide-react';
import { AnalysisContext } from '../context/AnalysisContext';

export default function Dashboard() {
  const { analysisData } = useContext(AnalysisContext)!;

  // Calculate pie chart data for ecosystem distribution
  const ecosystemTotal = 100;
  const ecosystems = [
    { name: 'Abyssal Plains', percentage: 35, color: '#1e3a5f' },
    { name: 'Hydrothermal Vents', percentage: 28, color: '#c53030' },
    { name: 'Seamounts', percentage: 22, color: '#22863a' },
    { name: 'Cold Seeps', percentage: 15, color: '#6f42c1' },
  ];

  // Generate SVG pie chart
  let cumulativeAngle = 0;
  const pieSegments = ecosystems.map((ecosystem) => {
    const sliceAngle = (ecosystem.percentage / 100) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);
    
    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathData = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
    
    cumulativeAngle = endAngle;
    
    return { ...ecosystem, pathData };
  });

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-white">Dashboard</h1>
        <p className="text-lg text-gray-400 mt-2">Deep-sea biodiversity monitoring overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Samples */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-base font-medium">Total Samples</p>
              <p className="text-5xl font-bold text-gray-900 mt-2">{analysisData.totalReads}</p>
            </div>
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Taxa Identified & Novel */}
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <p className="text-gray-600 text-base font-medium">Taxa Identified & Novel</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Dna className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{analysisData.totalClusters}</p>
                <p className="text-sm text-gray-600">Identified</p>
              </div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{analysisData.novelTaxa}</p>
                <p className="text-sm text-gray-600">Novel</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Taxonomic Abundance Heatmap */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col flex-1">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
          <h2 className="text-2xl font-bold text-white">Taxonomic Abundance</h2>
        </div>
        
        {analysisData.taxaAbundance.length > 0 ? (
          <div className="p-6 overflow-auto flex-1 flex flex-col">
            {/* Heatmap Grid - Extra Large */}
            <div className="flex-1 flex flex-col">
              {/* Top legend for samples */}
              <div className="flex items-end gap-0 mb-1">
                <div className="w-72"></div>
                <div className="flex gap-0">
                  {Array.from({ length: Math.max(20, analysisData.taxaAbundance.length) }).map((_, i) => (
                    <div key={`sample-${i}`} className="w-14 h-12 flex items-center justify-center text-sm font-bold text-gray-800">
                      {i % 5 === 0 ? i + 1 : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap rows */}
              <div className="flex gap-0 flex-1">
                {/* Taxa labels */}
                <div className="flex flex-col gap-0">
                  {analysisData.taxaAbundance.map((taxa: any, index: number) => (
                    <div key={`taxa-label-${index}`} className="h-16 flex items-center pr-3 text-base font-bold text-gray-800 w-72 truncate" title={taxa.genus}>
                      {taxa.genus}
                    </div>
                  ))}
                </div>

                {/* Heatmap cells */}
                <div className="flex gap-0 flex-1">
                  {Array.from({ length: Math.max(20, analysisData.taxaAbundance.length) }).map((_, sampleIdx) => (
                    <div key={`sample-col-${sampleIdx}`} className="flex flex-col gap-0 flex-1">
                      {analysisData.taxaAbundance.map((taxa: any, taxaIdx: number) => {
                        // Distribute percentage across sample columns with some variation
                        const basePercentage = taxa.percentage;
                        const variation = Math.sin((sampleIdx + taxaIdx) * 0.5) * 30;
                        const percentage = Math.max(0, Math.min(100, basePercentage + variation));

                        // Color intensity based on percentage
                        let color = '#ffffff';
                        if (percentage >= 75) {
                          color = '#991b1b'; // Dark red
                        } else if (percentage >= 50) {
                          color = '#dc2626'; // Red
                        } else if (percentage >= 30) {
                          color = '#f97316'; // Orange
                        } else if (percentage >= 15) {
                          color = '#fbbf24'; // Yellow
                        } else if (percentage >= 5) {
                          color = '#60a5fa'; // Light blue
                        } else if (percentage > 0) {
                          color = '#e5e7eb'; // Very light gray
                        }

                        return (
                          <div
                            key={`cell-${sampleIdx}-${taxaIdx}`}
                            className="flex-1 h-16 border-2 border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: color }}
                            title={`${taxa.genus} (Sample ${sampleIdx + 1}): ${percentage.toFixed(1)}%`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
              <span className="text-base font-bold text-gray-800">Abundance Legend:</span>
              <div className="flex items-center gap-4">
                {[
                  { color: '#991b1b', label: '75-100%' },
                  { color: '#dc2626', label: '50-75%' },
                  { color: '#f97316', label: '30-50%' },
                  { color: '#fbbf24', label: '15-30%' },
                  { color: '#60a5fa', label: '5-15%' },
                  { color: '#e5e7eb', label: '<5%' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 border-2 border-gray-400"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-base font-semibold text-gray-800">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-16 text-center flex items-center justify-center flex-1">
            <p className="text-gray-500 text-2xl font-semibold">No taxa data yet. Upload a FASTA or FASTQ file to begin analysis.</p>
          </div>
        )}
      </div>

      {/* Recent Analyses & Ecosystem Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Analyses */}
        <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Analyses</h2>
          <div className="space-y-3">
            {analysisData.recentAnalyses.length > 0 ? (
              analysisData.recentAnalyses.map((analysis: any) => (
                <div key={analysis.id} className="bg-teal-700 bg-opacity-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white text-base">{analysis.sample}</p>
                      <p className="text-base text-teal-100">{analysis.location}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      analysis.status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {analysis.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-base text-teal-100 text-center py-4">No recent analyses</p>
            )}
          </div>
        </div>

        {/* Ecosystem Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ecosystem Distribution</h2>
          <div className="flex items-center gap-8">
            {/* Pie Chart */}
            <svg viewBox="0 0 100 100" className="w-32 h-32">
              {pieSegments.map((segment, idx) => (
                <path
                  key={idx}
                  d={segment.pathData}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                />
              ))}
              <circle cx="50" cy="50" r="25" fill="white" />
            </svg>

            {/* Legend */}
            <div className="space-y-2">
              {ecosystems.map((ecosystem) => (
                <div key={ecosystem.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ecosystem.color }}
                  />
                  <span className="text-base text-gray-700">{ecosystem.name}</span>
                  <span className="text-base font-semibold text-gray-900 ml-auto">{ecosystem.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
