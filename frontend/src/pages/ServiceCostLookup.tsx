import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ArrowLeft, AlertCircle, Loader, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

interface ServiceCost {
  total_cost: number;
  monthly_average: number;
  cost_by_type: { [key: string]: number };
  cost_types_count: number;
}

interface Vehicle {
  id: string;
  name: string;
  van_number: string;
  registration: string;
  vehicle_type: string;
}

const colors = {
  primary: { default: '#27549D', light: '#7099DB', darker: '#17325E', subtle: '#F7F9FD' },
  brand: { yellow: '#F1FF24' },
  support: { green: '#2EB844', orange: '#F29630', red: '#D15134' },
  grayscale: { title: '#1A1D23', body: '#323843', subtle: '#646F86', caption: '#848EA3', negative: '#F3F4F6', border: '#CDD1DA' },
};

const COST_COLORS: { [key: string]: string } = {
  'Insurance': colors.primary.default,
  'MOT': colors.support.green,
  'Tax': colors.support.red,
  'Fuel': colors.primary.light,
  'Repair': '#E49786',
  'Rental': colors.brand.yellow,
  'Congestion': '#FF6B6B',
  'Dart Charge': colors.support.orange,
  'ULEZ': '#9C27B0',
  'Service': '#2196F3',
  'Other': colors.grayscale.caption
};

export default function ServiceCostLookup() {
  const navigate = useNavigate();
  const [vanNumber, setVanNumber] = useState('');
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [serviceCost, setServiceCost] = useState<ServiceCost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!vanNumber.trim()) {
      setError('Please enter a van number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const base = API_BASE_URL || '';

      console.log(`🔍 Searching for van number: ${vanNumber}`);
      const response = await fetch(`${base}/api/cost/service/${vanNumber}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Vehicle with van number ${vanNumber} not found`);
        }
        throw new Error('Failed to fetch service costs');
      }

      const data = await response.json();
      console.log('✅ Service costs loaded:', data);

      setVehicle(data.vehicle);
      setServiceCost(data.service_costs);
      setSearched(true);
    } catch (err) {
      console.error('❌ Error fetching service costs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch service costs');
      setVehicle(null);
      setServiceCost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getCostColor = (type: string) => {
    return COST_COLORS[type] || '#848EA3';
  };

  return (
    <div className="min-h-screen" style={{ background: '#F3F4F6' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-4 hover:opacity-80 transition"
            style={{ color: '#27549D' }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#1A1D23' }}>
            Service Cost Lookup
          </h1>
          <p style={{ color: '#646F86' }}>Enter van number to view total service costs and breakdown by type</p>
        </div>

        {/* Search Box */}
        <Card style={{ backgroundColor: 'white', borderColor: 'rgba(39, 84, 157, 0.2)', borderWidth: '1px', marginBottom: '24px' }}>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Enter van number (e.g., 288)"
                  value={vanNumber}
                  onChange={(e) => setVanNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid rgba(39, 84, 157, 0.3)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
                <Search
                  size={20}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#646F86'
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                style={{
                  padding: '12px 32px',
                  backgroundColor: '#27549D',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: '#FAEDEA', borderLeft: '4px solid #D15134' }}>
            <AlertCircle size={20} style={{ color: '#D15134', marginTop: '2px' }} />
            <div>
              <p style={{ color: '#812F1D', fontWeight: 600 }}>Error</p>
              <p style={{ color: '#D15134' }}>{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <Loader size={48} className="animate-spin mx-auto mb-4" style={{ color: '#27549D' }} />
            <p style={{ color: '#646F86' }}>Loading service costs...</p>
          </div>
        )}

        {/* Results */}
        {searched && !loading && vehicle && serviceCost && (
          <>
            {/* Vehicle Info */}
            <Card style={{ backgroundColor: 'white', borderColor: 'rgba(39, 84, 157, 0.2)', borderWidth: '1px', marginBottom: '24px' }}>
              <CardHeader>
                <CardTitle style={{ color: '#27549D' }}>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p style={{ color: '#646F86', fontSize: '13px', marginBottom: '4px' }}>Vehicle Name</p>
                    <p style={{ color: '#1A1D23', fontWeight: '600' }}>{vehicle.name}</p>
                  </div>
                  <div>
                    <p style={{ color: '#646F86', fontSize: '13px', marginBottom: '4px' }}>Van Number</p>
                    <p style={{ color: '#1A1D23', fontWeight: '600' }}>{vehicle.van_number}</p>
                  </div>
                  <div>
                    <p style={{ color: '#646F86', fontSize: '13px', marginBottom: '4px' }}>Registration</p>
                    <p style={{ color: '#1A1D23', fontWeight: '600' }}>{vehicle.registration}</p>
                  </div>
                  <div className="col-span-2">
                    <p style={{ color: '#646F86', fontSize: '13px', marginBottom: '4px' }}>Vehicle Type</p>
                    <p style={{ color: '#1A1D23', fontWeight: '600' }}>{vehicle.vehicle_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Cost Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card style={{ backgroundColor: 'white', borderColor: 'rgba(39, 84, 157, 0.2)', borderWidth: '1px' }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p style={{ color: '#646F86', fontSize: '14px' }}>Total Service Cost</p>
                      <p className="text-3xl font-bold" style={{ color: '#27549D' }}>
                        £{serviceCost.total_cost.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <DollarSign size={40} style={{ color: '#27549D', opacity: 0.2 }} />
                  </div>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: 'white', borderColor: 'rgba(39, 84, 157, 0.2)', borderWidth: '1px' }}>
                <CardContent className="pt-6">
                  <div>
                    <p style={{ color: '#646F86', fontSize: '14px' }}>Monthly Average</p>
                    <p className="text-3xl font-bold" style={{ color: '#27549D' }}>
                      £{serviceCost.monthly_average.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                    </p>
                    <p style={{ color: '#646F86', fontSize: '12px', marginTop: '8px' }}>
                      {serviceCost.cost_types_count} service type{serviceCost.cost_types_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Breakdown */}
            <Card style={{ backgroundColor: 'white', borderColor: 'rgba(39, 84, 157, 0.2)', borderWidth: '1px' }}>
              <CardHeader>
                <CardTitle style={{ color: '#27549D' }}>Service Cost Breakdown (excluding Maintenance)</CardTitle>
              </CardHeader>
              <CardContent>
                {serviceCost.cost_types_count > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(serviceCost.cost_by_type).map(([type, amount]) => (
                      <div key={type} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#F7F9FD' }}>
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: getCostColor(type)
                            }}
                          />
                          <span style={{ color: '#1A1D23', fontWeight: '500' }}>{type}</span>
                        </div>
                        <span style={{ color: '#27549D', fontWeight: '600', fontSize: '16px' }}>
                          £{amount.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#646F86' }}>No service cost data found for this vehicle</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* No Search Yet */}
        {!searched && !loading && !error && (
          <div className="text-center py-16">
            <p style={{ color: '#646F86', fontSize: '16px' }}>Enter a van number above to view service costs</p>
          </div>
        )}

        {/* No Results */}
        {searched && !loading && !vehicle && (
          <div className="text-center py-16">
            <p style={{ color: '#646F86', fontSize: '16px' }}>No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}
