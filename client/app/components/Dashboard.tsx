import { Database, Dna, Sparkles, MapPin } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { label: 'Total Samples', value: '1,247', icon: Database, color: 'blue' },
    { label: 'Taxa Identified', value: '3,892', icon: Dna, color: 'green' },
    { label: 'Novel Taxa', value: '156', icon: Sparkles, color: 'purple' },
    { label: 'Active Sites', value: '12', icon: MapPin, color: 'orange' },
  ];

  const ecosystems = [
    { name: 'Abyssal Plains', percentage: 35, color: 'bg-blue-600' },
    { name: 'Hydrothermal Vents', percentage: 28, color: 'bg-red-600' },
    { name: 'Seamounts', percentage: 22, color: 'bg-green-600' },
    { name: 'Cold Seeps', percentage: 15, color: 'bg-purple-600' },
  ];

  const recentAnalyses = [
    { id: '1', sample: 'DS-2024-001', location: 'Central Indian Basin', status: 'Completed', date: '2024-12-07' },
    { id: '2', sample: 'DS-2024-002', location: 'Carlsberg Ridge', status: 'Processing', date: '2024-12-08' },
    { id: '3', sample: 'DS-2024-003', location: 'Arabian Sea', status: 'Completed', date: '2024-12-06' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Deep-sea biodiversity monitoring overview</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Abundance Heatmap</h3>
        <div className="bg-gray-50 rounded-lg h-96 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Geographical abundance visualization will appear here</p>
            <p className="text-sm text-gray-500 mt-2">Integrate with mapping library for interactive heatmap</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Analyses</h3>
          <div className="space-y-3">
            {recentAnalyses.map((analysis) => (
              <div key={analysis.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{analysis.sample}</p>
                  <p className="text-sm text-gray-600">{analysis.location}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    analysis.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {analysis.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{analysis.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Ecosystem Distribution</h3>
          <div className="space-y-4">
            {ecosystems.map((ecosystem) => (
              <div key={ecosystem.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{ecosystem.name}</span>
                  <span className="text-sm text-gray-600">{ecosystem.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${ecosystem.color} h-2 rounded-full`}
                    style={{ width: `${ecosystem.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
