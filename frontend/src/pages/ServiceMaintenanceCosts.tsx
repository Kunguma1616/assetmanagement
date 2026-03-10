import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, TrendingUp, PoundSterling, Truck, AlertCircle, Loader, Search, ChevronDown, ChevronUp, TrendingDown } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { TRADE_GROUP_PICKLIST, getAvailableTradeGroups, isUserRestricted, getDefaultTradeGroup } from '../config/tradeMapping';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const colors = {
  primary: { default: '#27549D', light: '#7099DB', darker: '#17325E', subtle: '#F7F9FD' },
  brand: { yellow: '#F1FF24' },
  support: { green: '#2EB844', orange: '#F29630', red: '#D15134', blue: '#2196F3' },
  grayscale: { 
    title: '#1A1D23', 
    body: '#323843', 
    subtle: '#646F86', 
    caption: '#848EA3', 
    negative: '#F3F4F6', 
    border: '#CDD1DA',
    disabled: '#E8EAEE'
  },
};

interface TeamMember {
  name: string;
  email: string;
  trade: string;
  role: string;
}

interface CostData {
  total_cost: number;
  service_cost: number;
  maintenance_cost: number;
  monthly_average: number;
  cost_by_type: { [key: string]: number };
}

interface Vehicle {
  vehicle_id: string;
  name: string;
  van_number: string;
  registration: string;
  vehicle_type: string;
  trade_group: string;
  status: string;
  costs: CostData;
}

interface ApiResponse {
  success: boolean;
  summary: {
    total_fleet_cost: number;
    total_service_cost: number;
    total_maintenance_cost: number;
    average_vehicle_cost: number;
    vehicle_count: number;
    vehicles_with_costs: number;
  };
  team_members: TeamMember[];
  insights: {
    top_maintenance_vehicles: Vehicle[];
    top_service_vehicles: Vehicle[];
    highest_maintenance_cost: number;
    highest_service_cost: number;
  };
  vehicles: Vehicle[];
}

const fmt = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export default function ServiceMaintenanceCosts() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTrade, setFilterTrade] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'maintenance' | 'service' | 'total'>('maintenance');
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [userTrade, setUserTrade] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [csvLeases, setCsvLeases] = useState<any[]>([]);
  const [leaseSearch, setLeaseSearch] = useState('');
  const [leaseTypeFilter, setLeaseTypeFilter] = useState<string>('all');
  const [leaseTradeGroupFilter, setLeaseTradeGroupFilter] = useState<string>('all');
  const [leaseTradeGroups, setLeaseTradeGroups] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userIsRestricted, setUserIsRestricted] = useState(false);
  const [userRestrictedTradeGroup, setUserRestrictedTradeGroup] = useState<string | null>(null);

  useEffect(() => {
    // Get user info from session
    const userData = sessionStorage.getItem('user_data');
    if (userData) {
      const user = JSON.parse(userData);
      const normalizedEmail = user.email.toLowerCase().trim();
      setUserEmail(normalizedEmail);
      
      console.log('👤 Session user email:', user.email);
      console.log('👤 Normalized email:', normalizedEmail);
      
      // Check if user is restricted using the new restriction function
      const restricted = isUserRestricted(normalizedEmail);
      const defaultGroup = getDefaultTradeGroup(normalizedEmail);
      
      console.log('🔒 User restricted?', restricted);
      console.log('🔒 Default group:', defaultGroup);

      if (restricted && defaultGroup) {
        setUserIsRestricted(true);
        setUserRestrictedTradeGroup(defaultGroup);
        setLeaseTradeGroupFilter(defaultGroup);
        setFilterTrade(defaultGroup);
        console.log('🔒 User restricted to trade group:', defaultGroup);
      } else {
        console.log('✅ User has full access');
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const base = API_BASE_URL || '';
        let endpoint = `${base}/api/cost/service-maintenance/insights`;
        if (isRestricted && userTrade) {
          endpoint += `?trade_filter=${encodeURIComponent(userTrade)}`;
          console.log('📍 Fetching restricted data:', endpoint);
        }

        const insightsResponse = await fetch(endpoint);

        if (!insightsResponse.ok) {
          throw new Error('Failed to fetch service & maintenance costs');
        }

        const result = await insightsResponse.json();
        setData(result);
        
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (isRestricted && !userTrade) {
      // Still loading user data
      return;
    }
    
    fetchData();
  }, [isRestricted, userTrade]);

  // Load all HSBC CSV rows from the backend API (runs once on mount)
  useEffect(() => {
    const fetchCSV = async () => {
      try {
        const base = API_BASE_URL || '';
        const resp = await fetch(`${base}/api/cost/leases/csv-all`);
        if (!resp.ok) throw new Error(`API returned ${resp.status}`);
        const json = await resp.json();
        if (json.success && Array.isArray(json.rows)) {
          setCsvLeases(json.rows);
          console.log(`✅ HSBC CSV: ${json.rows.length} rows loaded`);
        }
      } catch (e) {
        console.error('Failed to load HSBC CSV rows:', e);
      }
    };
    fetchCSV();
    
    // Load trade groups
    const fetchTradeGroups = async () => {
      try {
        const base = API_BASE_URL || '';
        const resp = await fetch(`${base}/api/leases/trade-groups`);
        if (resp.ok) {
          const json = await resp.json();
          if (json.success && Array.isArray(json.data)) {
            setLeaseTradeGroups(json.data);
          }
        }
      } catch (e) {
        console.error('Failed to load trade groups:', e);
      }
    };
    fetchTradeGroups();
  }, []);

  const filteredVehicles = useMemo(() => {
    if (!data) return [];
    
    let vehicles = data.vehicles;
    
    // Apply trade group filter (works for both restricted and unrestricted users)
    // For restricted users: filterTrade is already set to their trade group in useEffect
    // For unrestricted users: filterTrade is set by their selection
    if (filterTrade !== 'all') {
      vehicles = vehicles.filter(v => v.trade_group === filterTrade);
    }
    
    // Apply search filter
    if (searchTerm) {
      vehicles = vehicles.filter(v => 
        v.van_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.registration?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sort
    return vehicles.sort((a, b) => {
      if (sortBy === 'maintenance') {
        return b.costs.maintenance_cost - a.costs.maintenance_cost;
      } else if (sortBy === 'service') {
        return b.costs.service_cost - a.costs.service_cost;
      } else {
        return b.costs.total_cost - a.costs.total_cost;
      }
    });
  }, [data, filterTrade, sortBy, searchTerm, isRestricted]);

  const tradeGroups = useMemo(() => {
    if (!data || isRestricted) return [];
    const trades = new Set(data.vehicles.map(v => v.trade_group).filter(Boolean));
    return Array.from(trades).sort();
  }, [data, isRestricted]);

  // All CSV rows enriched with Salesforce vehicle matching (no filter applied)
  const enrichedCsvLeases = useMemo(() => {
    const regToVehicle: {[reg: string]: Vehicle} = {};
    if (data?.vehicles) {
      data.vehicles.forEach(v => {
        if (v.registration) {
          regToVehicle[v.registration.replace(/\s+/g, '').toUpperCase()] = v;
        }
      });
    }
    return csvLeases.map(lease => {
      const reg = (lease['Registration Doc'] || '').replace(/\s+/g, '').toUpperCase();
      const matched = reg ? regToVehicle[reg] : undefined;
      return { ...lease, _trade_group: matched?.trade_group || 'Not Assigned', _van_number: matched?.van_number || '' };
    });
  }, [csvLeases, data]);

  const filteredCsvLeases = useMemo(() => {
    return enrichedCsvLeases.filter(lease => {
      const typeMatch = leaseTypeFilter === 'all' || lease['Type'] === leaseTypeFilter;
      const tradeMatch = leaseTradeGroupFilter === 'all' || lease['_trade_group'] === leaseTradeGroupFilter;
      const search = leaseSearch.toLowerCase();
      const searchMatch = !search ||
        (lease['_identifier'] || '').toLowerCase().includes(search) ||
        (lease['Registration Doc'] || '').toLowerCase().includes(search) ||
        (lease['Make and Model'] || '').toLowerCase().includes(search) ||
        (lease['_van_number'] || '').toLowerCase().includes(search);
      return typeMatch && tradeMatch && searchMatch;
    });
  }, [enrichedCsvLeases, leaseSearch, leaseTypeFilter, leaseTradeGroupFilter]);

  const getLeaseTradeColor = (tradeGroup: string) => {
    const map: {[k: string]: {bg: string; color: string}} = {
      'Drainage & Plumbing': { bg: '#EFF6FF', color: '#1D4ED8' },
      'HVAC & Electrical': { bg: '#FFF7ED', color: '#C2410C' },
      'Gas, HVAC & Electrical': { bg: '#FFF7ED', color: '#C2410C' },
      'Building Fabric': { bg: '#F0FDF4', color: '#15803D' },
      'LDR': { bg: '#FAF5FF', color: '#7E22CE' },
      'Environmental Services': { bg: '#ECFDF5', color: '#065F46' },
      'Key Account': { bg: '#EFF6FF', color: '#1E40AF' },
    };
    return map[tradeGroup] || { bg: '#F3F4F6', color: '#6B7280' };
  };

  const toggleVehicleExpand = (vehicleId: string) => {
    const newExpanded = new Set(expandedVehicles);
    if (newExpanded.has(vehicleId)) {
      newExpanded.delete(vehicleId);
    } else {
      newExpanded.add(vehicleId);
    }
    setExpandedVehicles(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.grayscale.negative }}>
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin" style={{ color: colors.primary.default }} />
          <p style={{ color: colors.grayscale.body }}>Loading service & maintenance costs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.grayscale.negative }}>
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6" style={{ color: colors.support.red }} />
            <h2 className="text-xl font-bold" style={{ color: colors.grayscale.title }}>Error</h2>
          </div>
          <p style={{ color: colors.grayscale.body }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.grayscale.negative }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.primary.default }}>
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-4xl font-bold" style={{ color: colors.grayscale.title }}>
                  Chumely Service & Maintenance Costs
                </h1>
                {isRestricted && (
                  <span style={{ 
                    padding: '4px 8px', 
                    backgroundColor: colors.support.green, 
                    color: 'white', 
                    borderRadius: '4px', 
                    fontSize: '11px', 
                    fontWeight: 600 
                  }}>
                    🔒 {userTrade}
                  </span>
                )}
              </div>
              <p style={{ color: colors.grayscale.subtle }}>
                {isRestricted ? `Viewing vehicles for ${userTrade}` : 'Vehicle fleet analysis'}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: colors.grayscale.border }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: colors.grayscale.caption, fontSize: '12px' }}>Total Fleet Cost</p>
                <p className="text-2xl font-bold mt-2" style={{ color: colors.primary.default }}>
                  £{fmt(data.summary.total_fleet_cost)}
                </p>
              </div>
              <PoundSterling className="w-8 h-8" style={{ color: colors.primary.light, opacity: 0.3 }} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: colors.grayscale.border }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: colors.grayscale.caption, fontSize: '12px' }}>Service Costs</p>
                <p className="text-2xl font-bold mt-2" style={{ color: colors.support.blue }}>
                  £{fmt(data.summary.total_service_cost)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8" style={{ color: colors.support.blue, opacity: 0.3 }} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: colors.grayscale.border }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: colors.grayscale.caption, fontSize: '12px' }}>Maintenance Costs</p>
                <p className="text-2xl font-bold mt-2" style={{ color: colors.support.orange }}>
                  £{fmt(data.summary.total_maintenance_cost)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8" style={{ color: colors.support.orange, opacity: 0.3 }} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: colors.grayscale.border }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: colors.grayscale.caption, fontSize: '12px' }}>Avg Per Vehicle</p>
                <p className="text-2xl font-bold mt-2" style={{ color: colors.support.green }}>
                  £{fmt(data.summary.average_vehicle_cost)}
                </p>
              </div>
              <Truck className="w-8 h-8" style={{ color: colors.support.green, opacity: 0.3 }} />
            </div>
          </div>
        </div>

        {/* HSBC Leases Section */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border" style={{ borderColor: colors.grayscale.border }}>
          {/* Header row */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold" style={{ color: colors.grayscale.title }}>HSBC Leases</h2>
              <span style={{ padding: '3px 10px', backgroundColor: colors.primary.subtle, borderRadius: '12px', fontSize: '12px', fontWeight: 600, color: colors.primary.default }}>
                {filteredCsvLeases.length} of {enrichedCsvLeases.length} records
              </span>
            </div>
            <div className="flex gap-3 flex-wrap">
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search reg, model, HSBC..."
                  value={leaseSearch}
                  onChange={(e) => setLeaseSearch(e.target.value)}
                  style={{ padding: '8px 12px 8px 32px', border: `1px solid ${colors.grayscale.border}`, borderRadius: '6px', fontSize: '13px', width: '220px' }}
                />
                <Search className="w-3.5 h-3.5" style={{ position: 'absolute', left: '10px', top: '10px', color: colors.grayscale.caption }} />
              </div>
              <select
                value={leaseTradeGroupFilter}
                onChange={(e) => {
                  if (!userIsRestricted) {
                    setLeaseTradeGroupFilter(e.target.value);
                  }
                }}
                disabled={userIsRestricted}
                style={{ 
                  padding: '8px 12px', 
                  border: `1px solid ${colors.grayscale.border}`, 
                  borderRadius: '6px', 
                  fontSize: '13px',
                  opacity: userIsRestricted ? 0.6 : 1,
                  cursor: userIsRestricted ? 'not-allowed' : 'pointer',
                  backgroundColor: userIsRestricted ? colors.grayscale.disabled : 'white'
                }}
                title={userIsRestricted ? `Your access is restricted to: ${userRestrictedTradeGroup}` : ''}
              >
                {!userIsRestricted && <option value="all">All Trade Groups</option>}
                {getAvailableTradeGroups(userEmail).map(tg => (
                  <option key={tg} value={tg}>{tg}</option>
                ))}
              </select>
              <select
                value={leaseTypeFilter}
                onChange={(e) => setLeaseTypeFilter(e.target.value)}
                style={{ padding: '8px 12px', border: `1px solid ${colors.grayscale.border}`, borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="all">All Types</option>
                <option value="Motor Vehicle">Motor Vehicle</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div style={{ padding: '10px 14px', backgroundColor: colors.primary.subtle, borderRadius: '6px' }}>
              <p style={{ fontSize: '11px', color: colors.grayscale.caption, marginBottom: '2px' }}>Total Records</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: colors.primary.default }}>{filteredCsvLeases.length}</p>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: '#EFF6FF', borderRadius: '6px' }}>
              <p style={{ fontSize: '11px', color: colors.grayscale.caption, marginBottom: '2px' }}>Motor Vehicles</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#1D4ED8' }}>{filteredCsvLeases.filter(l => l['Type'] === 'Motor Vehicle').length}</p>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: '#FFF7ED', borderRadius: '6px' }}>
              <p style={{ fontSize: '11px', color: colors.grayscale.caption, marginBottom: '2px' }}>Equipment</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#C2410C' }}>{filteredCsvLeases.filter(l => l['Type'] === 'Equipment').length}</p>
            </div>
            <div style={{ padding: '10px 14px', backgroundColor: '#F0FDF4', borderRadius: '6px' }}>
              <p style={{ fontSize: '11px', color: colors.grayscale.caption, marginBottom: '2px' }}>Matched to Fleet</p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#15803D' }}>{filteredCsvLeases.filter(l => l['_van_number']).length}</p>
            </div>
          </div>

          {/* Full table */}
          <div style={{ overflowX: 'auto', maxHeight: '540px', overflowY: 'auto', border: `1px solid ${colors.grayscale.border}`, borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1300px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr style={{ backgroundColor: colors.primary.default }}>
                  {['#', 'Identifier', 'Type', 'Registration', 'Van #', 'Make & Model', 'Trade Group', 'Start Date', 'End Date', 'Term', 'Net Capital', 'Monthly', 'Total Repayment'].map((col, i) => (
                    <th key={i} style={{
                      padding: '10px 12px',
                      textAlign: i >= 10 ? 'right' : 'left',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      borderBottom: `2px solid ${colors.primary.darker}`,
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCsvLeases.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: colors.grayscale.caption }}>
                      {enrichedCsvLeases.length === 0 ? '⏳ Loading lease data...' : 'No leases match your search'}
                    </td>
                  </tr>
                ) : (
                  filteredCsvLeases.map((lease, idx) => {
                    const tradeColor = getLeaseTradeColor(lease['_trade_group']);
                    const isMotorVehicle = lease['Type'] === 'Motor Vehicle';
                    return (
                      <tr key={idx} style={{ borderBottom: `1px solid ${colors.grayscale.border}`, backgroundColor: idx % 2 === 0 ? '#fff' : colors.grayscale.negative }}>
                        <td style={{ padding: '9px 12px', color: colors.grayscale.caption, fontSize: '11px' }}>{idx + 1}</td>
                        <td style={{ padding: '9px 12px', color: colors.primary.default, fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {lease['_identifier'] || '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                            backgroundColor: isMotorVehicle ? '#EFF6FF' : '#FFF7ED',
                            color: isMotorVehicle ? '#1D4ED8' : '#C2410C',
                          }}>
                            {lease['Type'] || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', color: colors.grayscale.title, fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}>
                          {lease['Registration Doc'] || '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          {lease['_van_number'] ? (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: colors.primary.subtle, color: colors.primary.default, fontSize: '12px', fontWeight: 700 }}>
                              Van {lease['_van_number']}
                            </span>
                          ) : <span style={{ color: colors.grayscale.caption, fontSize: '12px' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 12px', color: colors.grayscale.body, fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lease['Make and Model'] || '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: tradeColor.bg, color: tradeColor.color }}>
                            {lease['_trade_group']}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', color: colors.grayscale.subtle, fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {lease['Agreement Start Date'] || '—'}
                        </td>
                        <td style={{ padding: '9px 12px', color: colors.grayscale.subtle, fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {lease['Agreement end date'] || '—'}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'center', color: colors.grayscale.subtle, fontSize: '12px' }}>
                          {lease['Agreement term (months)'] ? `${lease['Agreement term (months)']}m` : '—'}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: colors.grayscale.body, fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {lease['Net Capital'] || '—'}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: colors.support.blue, fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {lease['Monthly Installment'] || '—'}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: colors.primary.default, fontWeight: 600, fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {lease['Total Repayment'] || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Maintenance Vehicles */}
          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: colors.grayscale.border }}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.grayscale.title }}>
              <AlertTriangle className="w-5 h-5" style={{ color: colors.support.orange }} />
              Highest Maintenance Costs
            </h3>
            <div className="space-y-3">
              {data.insights.top_maintenance_vehicles.map((vehicle, idx) => (
                <div key={vehicle.vehicle_id} className="p-3 rounded-lg border" style={{ borderColor: colors.grayscale.border }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm" style={{ color: colors.grayscale.title }}>
                        {idx + 1}. Van {vehicle.van_number} - {vehicle.registration}
                      </p>
                      <p className="text-xs" style={{ color: colors.grayscale.subtle }}>{vehicle.trade_group}</p>
                    </div>
                    <p className="font-bold" style={{ color: colors.support.orange }}>
                      £{fmt(vehicle.costs.maintenance_cost)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Service Cost Vehicles */}
          <div className="bg-white rounded-lg p-6 shadow-sm border" style={{ borderColor: colors.grayscale.border }}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: colors.grayscale.title }}>
              <TrendingUp className="w-5 h-5" style={{ color: colors.support.blue }} />
              Highest Service Costs
            </h3>
            <div className="space-y-3">
              {data.insights.top_service_vehicles.map((vehicle, idx) => (
                <div key={vehicle.vehicle_id} className="p-3 rounded-lg border" style={{ borderColor: colors.grayscale.border }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm" style={{ color: colors.grayscale.title }}>
                        {idx + 1}. Van {vehicle.van_number} - {vehicle.registration}
                      </p>
                      <p className="text-xs" style={{ color: colors.grayscale.subtle }}>{vehicle.trade_group}</p>
                    </div>
                    <p className="font-bold" style={{ color: colors.support.blue }}>
                      £{fmt(vehicle.costs.service_cost)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm border" style={{ borderColor: colors.grayscale.border }}>
          <div className={`grid gap-4 ${isRestricted ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            <div>
              <label style={{ color: colors.grayscale.caption, fontSize: '12px', fontWeight: 600 }}>Search Vehicle</label>
              <div className="relative mt-2">
                <input
                  type="text"
                  placeholder="Van number, registration..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    border: `1px solid ${colors.grayscale.border}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />
                <Search className="w-4 h-4" style={{ position: 'absolute', left: '10px', top: '12px', color: colors.grayscale.caption }} />
              </div>
            </div>

            {!isRestricted && (
              <div>
                <label style={{ color: colors.grayscale.caption, fontSize: '12px', fontWeight: 600 }}>Trade Group</label>
                <select
                  value={filterTrade}
                  onChange={(e) => userIsRestricted ? null : setFilterTrade(e.target.value)}
                  disabled={userIsRestricted}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginTop: '8px',
                    border: `1px solid ${colors.grayscale.border}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    opacity: userIsRestricted ? 0.6 : 1,
                    cursor: userIsRestricted ? 'not-allowed' : 'pointer',
                    backgroundColor: userIsRestricted ? colors.grayscale.disabled : 'white',
                  }}
                  title={userIsRestricted ? `Your access is restricted to: ${userRestrictedTradeGroup}` : ''}
                >
                  {!userIsRestricted && <option value="all">All Trade Groups</option>}
                  {getAvailableTradeGroups(userEmail).map(trade => (
                    <option key={trade} value={trade}>{trade}</option>
                  ))}
                </select>
              </div>
            )}

            {userIsRestricted && (
              <div>
                <label style={{ color: colors.grayscale.caption, fontSize: '12px', fontWeight: 600 }}>Your Trade Group</label>
                <div style={{
                  padding: '10px 12px',
                  marginTop: '8px',
                  border: `1px solid ${colors.support.green}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#f0f9f4',
                  color: colors.support.green,
                  fontWeight: 600
                }}>
                  🔒 {userRestrictedTradeGroup}
                </div>
              </div>
            )}

            <div>
              <label style={{ color: colors.grayscale.caption, fontSize: '12px', fontWeight: 600 }}>Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  marginTop: '8px',
                  border: `1px solid ${colors.grayscale.border}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                <option value="maintenance">Maintenance Cost (High to Low)</option>
                <option value="service">Service Cost (High to Low)</option>
                <option value="total">Total Cost (High to Low)</option>
              </select>
            </div>
          </div>
          
          {isRestricted && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: '#e8f5e9', 
              borderRadius: '6px',
              fontSize: '12px',
              color: colors.support.green,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔐 Restricted View: You can only see vehicles in the {userTrade} trade group
            </div>
          )}
        </div>

        {/* Vehicles Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden" style={{ borderColor: colors.grayscale.border }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: colors.primary.subtle, borderBottom: `2px solid ${colors.grayscale.border}` }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.grayscale.title, fontWeight: 600, fontSize: '12px' }}>Van #</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.grayscale.title, fontWeight: 600, fontSize: '12px' }}>Registration</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.grayscale.title, fontWeight: 600, fontSize: '12px' }}>Trade Group</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.grayscale.title, fontWeight: 600, fontSize: '12px' }}>Total Cost</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.grayscale.title, fontWeight: 600, fontSize: '12px' }}>Service</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.grayscale.title, fontWeight: 600, fontSize: '12px' }}>Maintenance</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.grayscale.title, fontWeight: 600, fontSize: '12px' }}>Monthly Avg</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: colors.grayscale.title, fontWeight: 600, fontSize: '12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle, idx) => (
                <React.Fragment key={vehicle.vehicle_id}>
                  <tr style={{ borderBottom: `1px solid ${colors.grayscale.border}`, backgroundColor: idx % 2 === 0 ? '#fff' : colors.grayscale.negative }}>
                    <td style={{ padding: '12px 16px', color: colors.grayscale.title, fontWeight: 600 }}>Van {vehicle.van_number}</td>
                    <td style={{ padding: '12px 16px', color: colors.grayscale.body, fontSize: '13px' }}>{vehicle.registration || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', color: colors.grayscale.body, fontSize: '13px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: colors.primary.subtle, color: colors.primary.default, fontSize: '12px', fontWeight: 600 }}>
                        {vehicle.trade_group}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.primary.default, fontWeight: 600 }}>
                      £{fmt(vehicle.costs.total_cost)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.support.blue, fontWeight: 600 }}>
                      £{fmt(vehicle.costs.service_cost)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.support.orange, fontWeight: 600 }}>
                      £{fmt(vehicle.costs.maintenance_cost)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.grayscale.subtle, fontSize: '13px' }}>
                      £{fmt(vehicle.costs.monthly_average)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleVehicleExpand(vehicle.vehicle_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: colors.grayscale.caption
                        }}
                      >
                        {expandedVehicles.has(vehicle.vehicle_id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Row - Cost Breakdown */}
                  {expandedVehicles.has(vehicle.vehicle_id) && (
                    <tr style={{ backgroundColor: colors.primary.subtle, borderBottom: `1px solid ${colors.grayscale.border}` }}>
                      <td colSpan={8} style={{ padding: '16px' }}>
                        <div>
                          <p style={{ color: colors.grayscale.title, fontWeight: 600, marginBottom: '12px' }}>Cost Breakdown by Type</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(vehicle.costs.cost_by_type).map(([type, amount]) => (
                              <div key={type} style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', border: `1px solid ${colors.grayscale.border}` }}>
                                <p style={{ color: colors.grayscale.caption, fontSize: '11px', marginBottom: '4px' }}>{type}</p>
                                <p style={{ color: colors.primary.default, fontWeight: 600, fontSize: '14px' }}>£{fmt(amount as number)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {filteredVehicles.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: colors.grayscale.negative }}>
              <p style={{ color: colors.grayscale.caption }}>No vehicles found matching your filters</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', color: colors.grayscale.caption, fontSize: '12px' }}>
          <p>Total Vehicles: {data.summary.vehicle_count} | Vehicles with Costs: {data.summary.vehicles_with_costs}</p>
          <p>This report is for stakeholders and fleet management team only</p>
          <p style={{ marginTop: '12px', padding: '12px', backgroundColor: colors.primary.subtle, borderRadius: '4px' }}>
            📊 HSBC Leases: {enrichedCsvLeases.length > 0 ? `✅ ${enrichedCsvLeases.length} records loaded (${enrichedCsvLeases.filter(l => l['_van_number']).length} matched to fleet)` : '⏳ Loading leases...'}
          </p>
        </div>
      </div>
    </div>
  );
}
