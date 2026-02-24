import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { TradeGroupStackedChart } from '@/components/dashboard/TradeGroupStackedChart';
import { VehicleTypeStackedChart } from '@/components/dashboard/VehicleTypeStackedChart';
import { SpareVehiclesChart } from '@/components/dashboard/SpareVehiclesChart';
import { LeaversVehiclesChart } from '@/components/dashboard/LeaversVehiclesChart';
import { VehicleDataSheet } from '@/components/dashboard/VehicleDataSheet';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS } from '@/config/api';
import aspectLogoIcon from '/aspect-logo-icon.svg';
import { 
  Car, 
  CheckCircle, 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  Settings,
  Zap,
  Upload as UploadIcon,
  Image as ImageIcon,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  Target,
  BarChart3,
  PieChart,
  MessageSquare,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  tradeGroupChartData,
  vehicleTypeChartData,
  spareVansByTradeGroup,
  leaversByVanNumber,
  VehicleRecord,
} from '@/data/fleetData';

interface VehicleSummary {
  total: number;
  allocated: number;
  garage: number;
  due_service: number;
  spare_ready: number;
  reserved: number;
  written_off: number;
  mot_due: number;
  tax_due: number;
}

interface SalesforceVehicle {
  Id: string;
  Name: string;
  Reg_No__c?: string;
  Van_Number__c?: string;
  Status__c?: string;
  Trade_Group__c?: string;
  Vehicle_Type__c?: string;
  Make_Model__c?: string;
  Service_Cost__c?: number;
  Maintenance_Cost__c?: number;
  Next_Service_Date__c?: string;
  Next_MOT_Date__c?: string;
}

interface VehiclesByStatusResponse {
  status: string;
  count: number;
  vehicles: SalesforceVehicle[];
}

type SheetType = 'current' | 'allocated' | 'garage' | 'spare_ready' | 'reserved' | 'writtenOff' | 'mot' | 'service' | 'tax' | null;

/* ─── Shared button style matching "Chumley AI" ─── */
const headerButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  backgroundColor: '#27549D',
  color: '#F1FF24',
  padding: '12px 24px',
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 700,
  fontFamily: 'MontBold',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 6px -1px rgba(39, 84, 157, 0.3)',
};

const FleetDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [summary, setSummary] = useState<VehicleSummary | null>(null);
  const [sheetVehicles, setSheetVehicles] = useState<VehicleRecord[]>([]);
  const [sheetData, setSheetData] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchVehicleSummary();
    
    const interval = setInterval(() => {
      fetchVehicleSummary(true);
    }, 300000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchVehicleSummary = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setIsRefreshing(true);
      setError(null);
      
      const response = await axios.get(API_ENDPOINTS.VEHICLE_SUMMARY);
      console.log('Vehicle summary response:', response.data);
      setSummary(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch vehicle summary:', err);
      setError('Failed to load dashboard data from Salesforce');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const convertVehicle = (v: SalesforceVehicle): VehicleRecord => {
    return {
      id: v.Id,
      name: v.Name || '',
      vanNumber: v.Van_Number__c || v.Name || '',
      regNo: v.Reg_No__c || '',
      status: v.Status__c || '',
      vehicleType: v.Vehicle_Type__c || v.Make_Model__c || '',
      tradeGroup: v.Trade_Group__c || '',
      serviceCost: v.Service_Cost__c != null ? v.Service_Cost__c : (v.Next_Service_Date__c || ''),
      maintenanceCost: v.Maintenance_Cost__c != null ? v.Maintenance_Cost__c : (v.Next_MOT_Date__c || ''),
    } as unknown as VehicleRecord;
  };

  const fetchVehiclesByStatus = async (status: string, title: string, description: string, sheetType: SheetType) => {
    try {
      const response = await axios.get<VehiclesByStatusResponse>(
        API_ENDPOINTS.VEHICLES_BY_STATUS(status)
      );

      const convertedVehicles: VehicleRecord[] = response.data.vehicles.map(convertVehicle);

      setSheetVehicles(convertedVehicles);
      setSheetData({ title, description });
      setActiveSheet(sheetType);
    } catch (err) {
      console.error(`Failed to fetch ${status} vehicles:`, err);
      alert(`Failed to load ${title} data`);
    }
  };

  const fetchMotDue = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.VEHICLES_MOT_DUE);
      const convertedVehicles: VehicleRecord[] = response.data.vehicles.map(convertVehicle);

      setSheetVehicles(convertedVehicles);
      setSheetData({ 
        title: 'MOT Due in 30 Days', 
        description: 'Vehicles with MOT expiring in the next 30 days' 
      });
      setActiveSheet('mot');
    } catch (err) {
      console.error('Failed to fetch MOT due vehicles:', err);
      alert('Failed to load MOT due vehicles');
    }
  };

  const fetchServiceDue = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.VEHICLES_SERVICE_DUE);
      const convertedVehicles: VehicleRecord[] = response.data.vehicles.map(convertVehicle);

      setSheetVehicles(convertedVehicles);
      setSheetData({ 
        title: 'Vehicles to Service', 
        description: 'Vehicles due for service in the next 30 days' 
      });
      setActiveSheet('service');
    } catch (err) {
      console.error('Failed to fetch service due vehicles:', err);
      alert('Failed to load service due vehicles');
    }
  };

  const fetchTaxDue = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.VEHICLES_TAX_DUE);
      const convertedVehicles: VehicleRecord[] = response.data.vehicles.map(convertVehicle);

      setSheetVehicles(convertedVehicles);
      setSheetData({ 
        title: 'Road Tax Due', 
        description: 'Vehicles with road tax due in the next 30 days' 
      });
      setActiveSheet('tax');
    } catch (err) {
      console.error('Failed to fetch road tax due vehicles:', err);
      alert('Failed to load road tax due vehicles');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F7F9FD' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#F1FF24', borderTopColor: '#27549D' }}></div>
          <div className="text-xl font-semibold" style={{ color: '#27549D', fontFamily: 'MontBold' }}>Loading Fleet Intelligence...</div>
          <div className="text-sm font-light mt-2" style={{ color: '#646F86', fontFamily: 'MontRegular' }}>Fetching real-time data from Salesforce</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F7F9FD' }}>
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: '#D15134' }} />
          <div className="text-xl font-semibold" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>{error}</div>
          <button 
            onClick={() => fetchVehicleSummary()} 
            className="mt-4"
            style={{...headerButtonStyle, fontFamily: 'MontBold'}}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17325E'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#27549D'; }}
          >
            <RefreshCw className="w-5 h-5" style={{ color: '#F1FF24' }} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6" style={{ backgroundColor: '#F7F9FD' }}>
      {/* Executive Header */}
      <div className="backdrop-blur-xl rounded-2xl shadow-2xl p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#27549D', fontFamily: 'MontBold' }}>
              <img
                src={aspectLogoIcon}
                alt="Aspect Logo"
                className="h-10 w-auto"
              />
              Aspect Fleet Dashboard
            </h1>
            <div className="mt-2 flex items-center gap-4 font-light" style={{ color: '#848EA3', fontFamily: 'MontRegular' }}>
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#2EB844' }}></div>
                Live Data Feed
              </span>
              <span className="text-sm" style={{ color: '#848EA3', fontFamily: 'MontRegular' }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Button 1: Refresh */}
            <button 
              onClick={() => fetchVehicleSummary()}
              disabled={isRefreshing}
              style={headerButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17325E'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#27549D'; }}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} style={{ color: '#F1FF24' }} />
              <span>Refresh</span>
            </button>

            {/* Button 2: AI Assistant */}
            <button 
              onClick={() => navigate('/chat')}
              style={headerButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17325E'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#27549D'; }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: '#F1FF24' }} />
              <span>AI Assistant</span>
            </button>

            {/* Button 3: Asset Portfolio */}
            <button 
              onClick={() => navigate('/assets')}
              style={headerButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17325E'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#27549D'; }}
            >
              <ImageIcon className="w-5 h-5" style={{ color: '#F1FF24' }} />
              <span>Asset Portfolio</span>
            </button>

            {/* Button 4: Upload Vehicle */}
            <button 
              onClick={() => navigate('/upload')}
              style={headerButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17325E'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#27549D'; }}
            >
              <UploadIcon className="w-5 h-5" style={{ color: '#F1FF24' }} />
              <span>Upload Vehicle</span>
            </button>

            {/* Button 5: Performance Analytics */}
            <button 
              onClick={() => navigate('/webfleet')}
              style={headerButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#17325E'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#27549D'; }}
            >
              <Zap className="w-5 h-5" style={{ color: '#F1FF24' }} />
              <span>Performance Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI Grid - ALL 9 CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Current Vehicles */}
        <div 
          onClick={() => fetchVehiclesByStatus('current', 'Current Vehicles', 'All active vehicles in the fleet', 'current')}
          className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39, 84, 157, 0.1), rgba(241, 255, 36, 0.1))' }}></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #27549D, #17325E)' }}>
                <Car className="w-7 h-7" style={{ color: '#F1FF24' }} />
              </div>
              <ArrowUpRight className="w-5 h-5" style={{ color: '#848EA3' }} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Current Vehicles</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>{summary?.total ?? 0}</span>
              <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#27549D' }}>
                <TrendingUp className="w-3 h-3" />
                Active
              </span>
            </div>
            <p className="text-sm font-regular mt-2" style={{ color: '#323843' }}>Active fleet (excl. Written Off, Sold, Returned)</p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E8EAEE' }}>
              <span className="text-xs font-regular" style={{ color: '#27549D' }}>Click to view details →</span>
            </div>
          </div>
        </div>

        {/* Card 2: Allocated Vehicles */}
        <div 
          onClick={() => fetchVehiclesByStatus('allocated', 'Allocated Vehicles', 'Vehicles with active driver allocations', 'allocated')}
          className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid rgba(241, 255, 36, 0.5)' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(241, 255, 36, 0.2), rgba(39, 84, 157, 0.1))' }}></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#F1FF24' }}>
                <CheckCircle className="w-7 h-7" style={{ color: '#27549D' }} />
              </div>
              <ArrowUpRight className="w-5 h-5" style={{ color: '#848EA3' }} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Allocated Vehicles</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>{summary?.allocated ?? 0}</span>
              <span className="text-sm font-regular" style={{ color: '#646F86' }}>
                ({Math.round(((summary?.allocated ?? 0) / (summary?.total ?? 1)) * 100)}%)
              </span>
            </div>
            <p className="text-sm font-regular mt-2" style={{ color: '#323843' }}>With active driver allocations</p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E8EAEE' }}>
              <span className="text-xs font-regular" style={{ color: '#27549D' }}>Click to view details →</span>
            </div>
          </div>
        </div>

        {/* Card 3: Vehicles in Garage */}
        <div 
          onClick={() => fetchVehiclesByStatus('garage', 'Vehicles in Garage', 'Vehicles currently under repair', 'garage')}
          className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39, 84, 157, 0.1), rgba(241, 255, 36, 0.1))' }}></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #27549D, #17325E)' }}>
                <Wrench className="w-7 h-7" style={{ color: '#F1FF24' }} />
              </div>
              <AlertTriangle className="w-5 h-5 animate-pulse" style={{ color: '#D15134' }} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Vehicles in Garage</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: '#D15134', fontFamily: 'MontBold' }}>{summary?.garage ?? 0}</span>
              <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#D15134' }}>
                <ArrowDownRight className="w-3 h-3" />
                Critical
              </span>
            </div>
            <p className="text-sm font-regular mt-2" style={{ color: '#323843' }}>Under repair - reducing capacity</p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E8EAEE' }}>
              <span className="text-xs font-regular" style={{ color: '#27549D' }}>Click to view details →</span>
            </div>
          </div>
        </div>

        {/* Card 4: Spare Vehicles Ready */}
        <div 
          onClick={() => fetchVehiclesByStatus('spare_ready', 'Spare Vehicles Ready', 'Spare vehicles ready for deployment', 'spare_ready')}
          className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39, 84, 157, 0.1), rgba(112, 153, 219, 0.1))' }}></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #27549D, #17325E)' }}>
                <Settings className="w-7 h-7" style={{ color: '#F1FF24' }} />
              </div>
              <ArrowUpRight className="w-5 h-5" style={{ color: '#848EA3' }} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Spare Vehicles Ready</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>{summary?.spare_ready ?? 0}</span>
              <span className="text-sm font-semibold" style={{ color: '#2EB844' }}>Available</span>
            </div>
            <p className="text-sm font-regular mt-2" style={{ color: '#323843' }}>Ready for immediate deployment</p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E8EAEE' }}>
              <span className="text-xs font-regular" style={{ color: '#27549D' }}>Click to view details →</span>
            </div>
          </div>
        </div>

        {/* Card 5: Reserved Vehicles */}
        <div 
          onClick={() => fetchVehiclesByStatus('reserved', 'Reserved Vehicles', 'Vehicles reserved for specific purposes', 'reserved')}
          className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39, 84, 157, 0.1), rgba(112, 153, 219, 0.1))' }}></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #27549D, #17325E)' }}>
                <FileText className="w-7 h-7" style={{ color: '#F1FF24' }} />
              </div>
              <ArrowUpRight className="w-5 h-5" style={{ color: '#848EA3' }} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Reserved Vehicles</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>{summary?.reserved ?? 0}</span>
              <span className="text-sm font-semibold" style={{ color: '#F29630' }}>Reserved</span>
            </div>
            <p className="text-sm font-regular mt-2" style={{ color: '#323843' }}>Reserved for specific use cases</p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E8EAEE' }}>
              <span className="text-xs font-regular" style={{ color: '#27549D' }}>Click to view details →</span>
            </div>
          </div>
        </div>

        {/* Card 6: Written Off Vehicles */}
        <div 
          onClick={() => fetchVehiclesByStatus('written_off', 'Written Off Vehicles', 'Decommissioned vehicles', 'writtenOff')}
          className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39, 84, 157, 0.1), rgba(241, 255, 36, 0.1))' }}></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #27549D, #17325E)' }}>
                <AlertTriangle className="w-7 h-7" style={{ color: '#F1FF24' }} />
              </div>
              <ArrowDownRight className="w-5 h-5" style={{ color: '#D15134' }} />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Written Off Vehicles</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: '#812F1D', fontFamily: 'MontBold' }}>{summary?.written_off ?? 0}</span>
              <span className="text-sm font-regular" style={{ color: '#646F86' }}>Decommissioned</span>
            </div>
            <p className="text-sm font-regular mt-2" style={{ color: '#323843' }}>Removed from active fleet</p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E8EAEE' }}>
              <span className="text-xs font-regular" style={{ color: '#27549D' }}>Click to view details →</span>
            </div>
          </div>
        </div>

        {/* Card 7: MOT Due in 30 Days */}
        <div 
          onClick={fetchMotDue}
          className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
          style={{ backgroundColor: '#FEF5EC', border: '2px solid #F29630' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(242, 150, 48, 0.2), rgba(39, 84, 157, 0.1))' }}></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-xl animate-pulse" style={{ background: 'linear-gradient(to bottom right, #F29630, #A35C0A)' }}>
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#F29630', color: 'white' }}>
                <AlertTriangle className="w-3 h-3" />
                URGENT
              </div>
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#A35C0A', fontFamily: 'MontBold' }}>MOT Due in 30 Days</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: '#A35C0A', fontFamily: 'MontBold' }}>{summary?.mot_due ?? 0}</span>
              <span className="text-sm font-semibold" style={{ color: '#F29630' }}>Expiring Soon</span>
            </div>
            <p className="text-sm mt-2 font-semibold" style={{ color: '#A35C0A' }}>⚠️ Immediate compliance action required</p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(163, 92, 10, 0.3)' }}>
              <span className="text-xs font-bold" style={{ color: '#A35C0A' }}>Click to view critical list →</span>
            </div>
          </div>
        </div>

        {/* Card 8: Vehicles to Service */}
        <div 
          onClick={fetchServiceDue}
          className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
          style={{ backgroundColor: '#F7F9FD', border: '2px solid #7099DB' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(112, 153, 219, 0.2), rgba(39, 84, 157, 0.1))' }}></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(to bottom right, #27549D, #17325E)' }}>
                <Wrench className="w-7 h-7" style={{ color: '#F1FF24' }} />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#27549D', color: 'white' }}>
                <Wrench className="w-3 h-3" />
                SCHEDULE
              </div>
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#17325E', fontFamily: 'MontBold' }}>Vehicles to Service</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.due_service ?? 0}</span>
              <span className="text-sm font-semibold" style={{ color: '#27549D' }}>Due Soon</span>
            </div>
            <p className="text-sm mt-2 font-semibold" style={{ color: '#17325E' }}>Service due in next 30 days</p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #DEE8F7' }}>
              <span className="text-xs font-bold" style={{ color: '#27549D' }}>Click to schedule services →</span>
            </div>
          </div>
        </div>

        {/* Card 9: Road Tax Due */}
        <div 
          onClick={fetchTaxDue}
          className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
          style={{ backgroundColor: '#FAEDEA', border: '2px solid #D15134' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(209, 81, 52, 0.2), rgba(129, 47, 29, 0.1))' }}></div>
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-xl animate-pulse" style={{ background: 'linear-gradient(to bottom right, #D15134, #812F1D)' }}>
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#D15134', color: 'white' }}>
                <DollarSign className="w-3 h-3" />
                PAY NOW
              </div>
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#812F1D', fontFamily: 'MontBold' }}>Road Tax Due</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ color: '#812F1D', fontFamily: 'MontBold' }}>{summary?.tax_due ?? 0}</span>
              <span className="text-sm font-semibold" style={{ color: '#D15134' }}>Renewal Needed</span>
            </div>
            <p className="text-sm mt-2 font-semibold" style={{ color: '#812F1D' }}>⚠️ Tax renewal required within 30 days</p>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(129, 47, 29, 0.3)' }}>
              <span className="text-xs font-bold" style={{ color: '#812F1D' }}>Click to process payments →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="backdrop-blur-xl rounded-2xl shadow-lg p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#17325E', fontFamily: 'MontBold' }}>
              <BarChart3 className="w-6 h-6" style={{ color: '#27549D' }} />
              Fleet Distribution by Trade Group
            </h2>
            <Button variant="outline" size="sm" className="font-semibold" style={{ borderColor: '#27549D', color: '#27549D', fontFamily: 'MontBold' }}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <TradeGroupStackedChart
            data={tradeGroupChartData}
            title=""
          />
        </div>

        <div className="backdrop-blur-xl rounded-2xl shadow-lg p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#17325E', fontFamily: 'MontBold' }}>
              <PieChart className="w-6 h-6" style={{ color: '#27549D' }} />
              Fleet Distribution by Vehicle Type
            </h2>
            <Button variant="outline" size="sm" className="font-semibold" style={{ borderColor: '#27549D', color: '#27549D', fontFamily: 'MontBold' }}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          <VehicleTypeStackedChart
            data={vehicleTypeChartData}
            title=""
          />
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="backdrop-blur-xl rounded-2xl shadow-lg p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#17325E', fontFamily: 'MontBold' }}>
              <Settings className="w-6 h-6" style={{ color: '#27549D' }} />
              Spare Vehicles by Trade Group
            </h2>
            <Button variant="outline" size="sm" className="font-semibold" style={{ borderColor: '#27549D', color: '#27549D', fontFamily: 'MontBold' }}>View All</Button>
          </div>
          <SpareVehiclesChart
            data={spareVansByTradeGroup}
            title=""
          />
        </div>

        <div className="backdrop-blur-xl rounded-2xl shadow-lg p-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '2px solid #DEE8F7' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#17325E', fontFamily: 'MontBold' }}>
              <Users className="w-6 h-6" style={{ color: '#27549D' }} />
              Leavers Vehicles Management
            </h2>
            <Button variant="outline" size="sm" className="font-semibold" style={{ borderColor: '#27549D', color: '#27549D', fontFamily: 'MontBold' }}>View All</Button>
          </div>
          <LeaversVehiclesChart
            data={leaversByVanNumber}
            title=""
          />
        </div>
      </div>

      {/* Vehicle Data Sheet Modal */}
      <VehicleDataSheet
        open={activeSheet !== null}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        title={sheetData.title}
        description={sheetData.description}
        vehicles={sheetVehicles}
      />
    </div>
  );
};

export default FleetDashboard;
