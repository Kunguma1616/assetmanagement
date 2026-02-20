import os

# Read the existing file to get encoding info
filepath = r"C:\Users\Kunguma.Balaji\Downloads\FLEET-FULL-STACK--main (1)\FLEET-FULL-STACK--main\frontend\src\pages\VehicleCostAnalysis.tsx"

new_content = '''import React, { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, AlertTriangle, Zap, Shield, CheckCircle, Wrench, DollarSign } from 'lucide-react';

interface Vehicle {
  vehicle_id: string;
  name: string;
  van_number: string;
  registration: string;
  type: string;
  status: string;
  total_cost: number;
  maintenance_cost: number;
  fuel_cost: number;
  insurance_cost: number;
  other_cost: number;
  cost_per_month: number;
}

interface Insight {
  type: string;
  severity: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  count?: number;
  vehicle_id?: string;
  value?: number;
  vehicles?: any[];
}

interface CostBreakdown {
  total_maintenance: number;
  total_fuel: number;
  total_insurance: number;
  total_other: number;
  total_fleet_cost: number;
}

interface CostAnalysisData {
  total_fleet_cost: number;
  average_vehicle_cost: number;
  vehicle_count: number;
  vehicles_by_cost: Vehicle[];
  insights: Insight[];
  cost_breakdown: CostBreakdown;
}

const VehicleCostAnalysis: React.FC = () => {
  const [data, setData] = useState<CostAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCostAnalysis();
  }, []);

  const fetchCostAnalysis = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/cost-analysis');
      if (!response.ok) {
        throw new Error('Failed to fetch cost analysis');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cost analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-700 font-semibold">Error</p>
          <p className="text-red-600 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const topVehiclesBySpend = data.vehicles_by_cost.slice(0, 10);
  const costBreakdownChartData = [
    { name: 'Maintenance', value: data.cost_breakdown.total_maintenance },
    { name: 'Fuel', value: data.cost_breakdown.total_fuel },
    { name: 'Insurance', value: data.cost_breakdown.total_insurance },
    { name: 'Other', value: data.cost_breakdown.total_other }
  ].filter(item => item.value > 0);

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

  const getInsightIcon = (severity: string) => {
    switch (severity) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'info':
        return <Zap className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            Cost Analysis
          </h1>
          <p className="text-gray-600 mt-2">Fleet spending insights - Here's where most of your money has gone</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">Total Fleet Cost</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  £{data.total_fleet_cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">Average per Vehicle</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  £{data.average_vehicle_cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <Wrench className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">Total Vehicles</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{data.vehicle_count}</p>
              </div>
              <Shield className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">Highest Monthly Cost</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  £{(data.vehicles_by_cost[0]?.cost_per_month || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <TrendingDown className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Insights Section */}
        {data.insights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Key Insights - Action Required</h2>
            <div className="grid grid-cols-1 gap-4">
              {data.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg p-4 border-l-4 ${
                    insight.severity === 'warning'
                      ? 'bg-red-50 border-red-500'
                      : insight.severity === 'success'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.severity)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                      <p className="text-gray-700 text-sm mt-1">{insight.message}</p>
                      {insight.vehicles && insight.vehicles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {insight.vehicles.map((v, vidx) => (
                            <div key={vidx} className="text-sm text-gray-600 bg-white bg-opacity-50 p-2 rounded">
                              <span className="font-semibold">{v.name}</span>
                              {' '}(Van: {v.van}) - {v.cost ? `£${v.cost.toLocaleString()}` : `£${v.maint_cost?.toLocaleString()}`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Vehicles by Cost */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Top 10 Most Expensive Vehicles</h2>
            <p className="text-sm text-gray-600 mb-4">These are candidates for review or replacement</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVehiclesBySpend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="van_number" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
                  <Bar dataKey="total_cost" fill="#ef4444" name="Total Cost" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Breakdown */}
          {costBreakdownChartData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Where Your Money Goes</h2>
              <p className="text-sm text-gray-600 mb-4">Overall fleet cost distribution</p>
              <div className="h-80 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costBreakdownChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: £${value.toLocaleString()}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdownChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Cost Breakdown Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Fleet Cost Breakdown by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-gray-600 text-sm font-semibold">🔧 Maintenance & Repair</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                £{data.cost_breakdown.total_maintenance.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((data.cost_breakdown.total_maintenance / data.cost_breakdown.total_fleet_cost) * 100).toFixed(1)}% of total
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-gray-600 text-sm font-semibold">⛽ Fuel</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                £{data.cost_breakdown.total_fuel.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((data.cost_breakdown.total_fuel / data.cost_breakdown.total_fleet_cost) * 100).toFixed(1)}% of total
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-gray-600 text-sm font-semibold">🛡️ Insurance</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">
                £{data.cost_breakdown.total_insurance.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((data.cost_breakdown.total_insurance / data.cost_breakdown.total_fleet_cost) * 100).toFixed(1)}% of total
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-600 text-sm font-semibold">📋 Other Costs</p>
              <p className="text-2xl font-bold text-gray-600 mt-2">
                £{data.cost_breakdown.total_other.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((data.cost_breakdown.total_other / data.cost_breakdown.total_fleet_cost) * 100).toFixed(1)}% of total
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Vehicle List - Ranked */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">All Vehicles - Ranked by Total Cost</h2>
          <p className="text-sm text-gray-600 mb-4">High-cost vehicles are candidates for retirement or replacement</p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vehicle Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Van #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">💰 Total Cost</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">📅 Monthly Avg</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">🔧 Maintenance</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">⛽ Fuel</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">🛡️ Insurance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.vehicles_by_cost.map((vehicle, idx) => (
                  <tr key={vehicle.vehicle_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100'}>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">#{idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{vehicle.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{vehicle.van_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{vehicle.type}</td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-red-600">
                      £{vehicle.total_cost.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-600">
                      £{vehicle.cost_per_month.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-orange-600">
                      £{vehicle.maintenance_cost.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-yellow-600">
                      £{vehicle.fuel_cost.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-blue-600">
                      £{vehicle.insurance_cost.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Recommendations for Cost Reduction</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ Review high-maintenance vehicles (ranked #1-3) for potential retirement</li>
            <li>✓ Investigate fuel consumption patterns - high fuel costs may indicate mechanical issues</li>
            <li>✓ Consider replacing vehicles in the top 20% cost bracket</li>
            <li>✓ Implement preventative maintenance to reduce repair costs</li>
            <li>✓ Review insurance policies - negotiate better rates for low-cost vehicles</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VehicleCostAnalysis;
'''

try:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("✅ VehicleCostAnalysis.tsx successfully updated!")
except Exception as e:
    print(f"❌ Error: {e}")
