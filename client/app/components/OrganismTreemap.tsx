'use client';

import { useContext, useEffect, useState } from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { AnalysisContext } from '../context/AnalysisContext';

const OrganismTreemap = () => {
  const { analysisData } = useContext(AnalysisContext)!;
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      const response = await fetch('http://localhost:8000/history');
      if (response.ok) {
        const data = await response.json();
        const history = data.history || [];
        
        // Aggregate organism data from all analysis records
        const genusCount: { [key: string]: { count: number, total: number } } = {};
        let totalSequences = 0;
        
        history.forEach((item: any) => {
          if (item.type === 'analysis' && item.result_data?.top_groups) {
            item.result_data.top_groups.forEach((group: any) => {
              const genusName = group.genus || `Organism ${group.group_id + 1}`;
              if (!genusCount[genusName]) {
                genusCount[genusName] = { count: 0, total: 0 };
              }
              genusCount[genusName].count += group.count;
              totalSequences += group.count;
            });
          }
        });
        
        // Calculate percentages and format for treemap
        const organisms = Object.entries(genusCount)
          .map(([name, data]) => ({
            name,
            value: totalSequences > 0 ? (data.count / totalSequences) * 100 : 0,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);
        
        setChartData([{
          name: 'Organisms',
          children: organisms,
        }]);
      }
    } catch (error) {
      console.error('Error fetching history data:', error);
      // Fallback to context data
      const organisms = analysisData.taxaAbundance.slice(0, 10);
      setChartData([{
        name: 'Organisms',
        children: organisms.map((taxa: any) => ({
          name: taxa.genus,
          value: parseFloat(taxa.percentage.toFixed(2)),
        })),
      }]);
    }
  };

  // Custom color based on percentage
  const getColor = (value: number | undefined) => {
    if (!value || typeof value !== 'number') return '#60a5fa';
    if (value >= 75) return '#991b1b'; // dark red
    if (value >= 50) return '#dc2626'; // red
    if (value >= 30) return '#f97316'; // orange
    if (value >= 15) return '#fbbf24'; // yellow
    return '#60a5fa'; // blue
  };

  // Custom rendered content for treemap
  const renderCustomizedContent = (props: any) => {
    const { x, y, width, height, name, value } = props;

    // Don't render if too small
    if (!width || !height || width < 30 || height < 30) {
      return null;
    }

    return (
      <g>
        <defs>
          <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.8" />
          </filter>
        </defs>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={getColor(value)}
          stroke="white"
          strokeWidth={2}
          opacity={0.6}
        />
        {width > 50 && height > 50 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 10}
              textAnchor="middle"
              fill="white"
              fontSize={14}
              fontWeight="900"
              stroke="#000"
              strokeWidth={0.5}
              filter="url(#textShadow)"
            >
              {name && name.length > 15 ? name.substring(0, 13) + '...' : name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="white"
              fontSize={13}
              fontWeight="900"
              stroke="#000"
              strokeWidth={0.5}
              filter="url(#textShadow)"
            >
              {value ? value.toFixed(2) : '0.00'}%
            </text>
          </>
        )}
      </g>
    );
  };

  if (!chartData[0] || chartData[0].children.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-500 text-lg">No data available yet</p>
        <p className="text-gray-400 text-sm mt-2">Upload a FASTA file to see organism distribution</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Organism Distribution Treemap</h2>
      <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white" style={{ height: '450px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={chartData}
            dataKey="value"
            stroke="#fff"
            fill="#8884d8"
            content={renderCustomizedContent as any}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px',
              }}
              formatter={(value: any) => [
                `${typeof value === 'number' ? value.toFixed(2) : '0.00'}%`,
                'Abundance',
              ]}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
          <p className="text-xs font-semibold text-gray-600 uppercase">Highest Abundance</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {chartData[0]?.children.length > 0 ? `${chartData[0].children[0].value.toFixed(2)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">{chartData[0]?.children.length > 0 ? chartData[0].children[0].name : ''}</p>
        </div>

        <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
          <p className="text-xs font-semibold text-gray-600 uppercase">Lowest Abundance</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">
            {chartData[0]?.children.length > 0 ? `${chartData[0].children[chartData[0].children.length - 1].value.toFixed(2)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">{chartData[0]?.children.length > 0 ? chartData[0].children[chartData[0].children.length - 1].name : ''}</p>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <p className="text-xs font-semibold text-gray-600 uppercase">Total Organisms</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{chartData[0]?.children.length || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Detected</p>
        </div>
      </div>
    </div>
  );
};

export default OrganismTreemap;
