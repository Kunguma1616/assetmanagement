import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { DollarSign, TrendingUp, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

interface VehicleCost {
  vehicle_id: string;
  name: string;
  van_number: string;
  registration: string;
  vehicle_type: string;
  status: string;
  total_cost: number;
  cost_breakdown: { [key: string]: number };
  monthly_average: number;
}

interface CostSummary {
  total_fleet_cost: number;
  average_vehicle_cost: number;
  vehicle_count: number;
  vehicles_with_costs: number;
}

const colors = {
  primary: { default: '#27549D', light: '#7099DB', darker: '#17325E', subtle: '#F7F9FD' },
  brand: { yellow: '#F1FF24' },
  support: { green: '#2EB844', orange: '#F29630', red: '#D15134' },
  grayscale: { title: '#1A1D23', body: '#323843', subtle: '#646F86', caption: '#848EA3', negative: '#F3F4F6', border: '#CDD1DA' },
};

const COST_COLORS = {
  'Insurance': colors.primary.default,
  'Maintenance': colors.support.orange,
  'MOT': colors.support.green,
  'Tax': colors.support.red,
  'Fuel': colors.primary.light,
  'Repair': '#E49786',
  'Rental': colors.brand.yellow,
  'Other': colors.grayscale.caption
};

export default function VehicleCostSimple() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleCost[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllVehicleCosts();
  }, []);

  const fetchAllVehicleCosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const base = API_BASE_URL || '';
      
      console.log('📊 Fetching all vehicle costs...');
      const response = await fetch(`${base}/api/cost/all-vehicles`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle costs');
      }

      const data = await response.json();
      console.log('✅ Vehicle costs loaded:', data);
      
      setVehicles(data.vehicles || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('❌ Error fetching costs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicle costs');
    } finally {
      setLoading(false);
    }
  };

  const getCostColor = (type: string) => {
    return COST_COLORS[type as keyof typeof COST_COLORS] || '#848EA3';
  };

  // Calculate average cost to identify expensive vehicles
  const avgCost = summary ? summary.average_vehicle_cost : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.grayscale.negative }}>
        <div className="text-center">
          <Loader size={48} className="animate-spin mx-auto mb-4" style={{ color: colors.primary.default }} />
          <p style={{ color: colors.grayscale.subtle, fontFamily: 'MontRegular' }}>Loading vehicle costs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: colors.grayscale.negative }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-4 hover:opacity-80 transition"
            style={{ color: colors.primary.default }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-4xl font-bold mb-2" style={{ color: colors.grayscale.title, fontFamily: 'MontBold' }}>
            Vehicle Lifecycle Cost Analysis
          </h1>
          <p style={{ color: colors.grayscale.subtle, fontFamily: 'MontRegular' }}>
            View total lifecycle cost per vehicle • Identify expensive vehicles • See cost breakdown by service type
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: '#FAEDEA', borderLeft: `4px solid ${colors.support.red}` }}>
            <AlertCircle size={20} style={{ color: colors.support.red, marginTop: '2px' }} />
            <div>
              <p style={{ color: '#812F1D', fontWeight: 600, fontFamily: 'MontBold' }}>Error</p>
              <p style={{ color: colors.support.red, fontFamily: 'MontRegular' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Per-Vehicle Lifecycle Cost Analysis */}
        <Card style={{ backgroundColor: 'white', borderColor: 'rgba(39, 84, 157, 0.2)', borderWidth: '1px', marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle style={{ color: colors.primary.default, fontFamily: 'MontBold' }}>Per-Vehicle Lifecycle Cost • Ranked by Expense</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicles.length > 0 ? (
              <div className="space-y-4">
                {/* Sorted by cost (highest first) */}
                {vehicles.sort((a, b) => b.total_cost - a.total_cost).map((vehicle, idx) => {
                  const costAboveAvg = vehicle.total_cost > avgCost;
                  const costPercentAboveAvg = avgCost > 0 ? ((vehicle.total_cost - avgCost) / avgCost * 100).toFixed(0) : 0;
                  
                  return (
                    <div
                      key={vehicle.vehicle_id}
                      className="p-4 rounded-lg border"
                      style={{
                        borderColor: costAboveAvg ? 'rgba(209, 81, 52, 0.3)' : 'rgba(39, 84, 157, 0.1)',
                        backgroundColor: costAboveAvg ? 'rgba(250, 237, 234, 0.5)' : '#F7F9FD'
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg" style={{ color: '#1A1D23' }}>
                              {idx + 1}. {vehicle.name || vehicle.van_number}
                            </p>
                            {costAboveAvg && (
                              <span
                                className="px-2 py-1 rounded text-xs font-semibold"
                                style={{ backgroundColor: '#D15134', color: 'white' }}
                              >
                                EXPENSIVE (+{costPercentAboveAvg}%)
                              </span>
                            )}
                          </div>
                          <p style={{ color: '#646F86', fontSize: '13px' }}>
                            {vehicle.van_number} • {vehicle.registration} • {vehicle.vehicle_type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold" style={{ color: costAboveAvg ? '#D15134' : '#27549D' }}>
                            £{vehicle.total_cost.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                          </p>
                          <p style={{ color: '#646F86', fontSize: '12px' }}>
                            £{vehicle.monthly_average}/month
                          </p>
                        </div>
                      </div>

                      {/* Cost Breakdown as percentage bars */}
                      {Object.keys(vehicle.cost_breakdown).length > 0 && (
                        <div className="mt-4">
                          <p style={{ color: '#646F86', fontSize: '12px', marginBottom: '8px', fontWeight: '500' }}>
                            Cost Breakdown:
                          </p>
                          <div className="space-y-2">
                            {Object.entries(vehicle.cost_breakdown)
                              .sort((a, b) => b[1] - a[1])
                              .map(([type, amount]) => {
                                const percentage = vehicle.total_cost > 0 
                                  ? (amount / vehicle.total_cost * 100).toFixed(1)
                                  : 0;
                                
                                return (
                                  <div key={type}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span style={{ color: '#323843', fontSize: '13px', fontWeight: '500' }}>
                                        {type}
                                      </span>
                                      <span style={{ color: '#27549D', fontSize: '13px', fontWeight: '600' }}>
                                        £{amount.toLocaleString('en-GB', { maximumFractionDigits: 2 })} ({percentage}%)
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        height: '8px',
                                        backgroundColor: 'rgba(39, 84, 157, 0.1)',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <div
                                        style={{
                                          height: '100%',
                                          width: `${percentage}%`,
                                          backgroundColor: getCostColor(type),
                                          transition: 'width 0.3s ease'
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {Object.keys(vehicle.cost_breakdown).length === 0 && (
                        <p style={{ color: '#848EA3', fontSize: '13px' }}>No cost breakdown data available</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: '#646F86' }}>No vehicles with cost data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
