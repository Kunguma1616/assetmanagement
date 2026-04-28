import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { TradeGroupStackedChart } from '@/components/dashboard/TradeGroupStackedChart';
import { VehicleTypeStackedChart } from '@/components/dashboard/VehicleTypeStackedChart';
import { SpareVehiclesChart } from '@/components/dashboard/SpareVehiclesChart';
import { LeaversVehiclesChart } from '@/components/dashboard/LeaversVehiclesChart';
import { VehicleDataSheet } from '@/components/dashboard/VehicleDataSheet';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS } from '@/config/api';
import { 
  Car, CheckCircle, Wrench, AlertTriangle, Calendar, Settings,
  FileText, TrendingUp, TrendingDown, Activity, ArrowUpRight,
  ArrowDownRight, DollarSign, Users, Target, BarChart3, PieChart,
  RefreshCw, Download, Info,
} from 'lucide-react';
import {
  tradeGroupChartData, vehicleTypeChartData, spareVansByTradeGroup,
  leaversByVanNumber, VehicleRecord,
} from '@/data/fleetData';

interface VehicleSummary {
  total: number; allocated: number; garage: number; due_service: number;
  spare_ready: number; reserved: number; written_off: number; mot_due: number; tax_due: number;
}

interface SalesforceVehicle {
  Id: string; Name: string; Reg_No__c?: string; Van_Number__c?: string;
  Status__c?: string; Trade_Group__c?: string; Vehicle_Type__c?: string;
  Make_Model__c?: string; Service_Cost__c?: number; Maintenance_Cost__c?: number;
  Vehicle_Ownership__c?: string; Last_Service_Date__c?: string; Next_Service_Date__c?: string;
  Last_MOT_Date__c?: string; Next_MOT_Date__c?: string; Last_Road_Tax__c?: string;
  Next_Road_Tax__c?: string; Next_Road_Tax_Editable__c?: string;
}

interface VehiclesByStatusResponse {
  status: string; count: number; vehicles: SalesforceVehicle[];
}

type SheetType = 'current' | 'allocated' | 'garage' | 'spare_ready' | 'reserved' | 'writtenOff' | 'mot' | 'service' | 'tax' | null;

/* ─────────────────────────────────────────────────
   COPILOT AI BUTTON  →  brand yellow, zero white
   ───────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────
   START GUIDE BUTTON  →  frosted glass, white text
   ───────────────────────────────────────────────── */
const guideButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0',
  width: '56px',
  height: '56px',
  minWidth: '56px',
  padding: '0',
  background: 'rgba(255, 255, 255, 0.12)',        /* ✅ frosted — not solid white */
  color: '#FFFFFF',
  borderRadius: '999px',
  border: '2px solid rgba(255, 255, 255, 0.45)',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 700,
  fontFamily: 'Mont, sans-serif',
  letterSpacing: '-0.01em',
  lineHeight: 1,
  transition: 'all 0.2s ease',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  backdropFilter: 'blur(8px)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
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

  const startFleetTour = () => {
    const steps = [
      { element: '#ai-btn', popover: { title: 'AI Assistant', description: 'Use AI to ask questions about fleet health, risks, and performance.', side: 'bottom' as const, align: 'start' as const } },
      { element: '#kpi-current', popover: { title: 'Current Vehicles', description: 'Total active fleet size. This is your baseline.', side: 'bottom' as const, align: 'start' as const } },
      { element: '#kpi-allocated', popover: { title: 'Allocated Vehicles', description: 'Vehicles assigned to engineers. Indicates utilization.', side: 'bottom' as const, align: 'start' as const } },
      { element: '#kpi-garage', popover: { title: 'Vehicles in Garage', description: 'Vehicles under repair. This directly impacts operations.', side: 'bottom' as const, align: 'start' as const } },
      { element: '#kpi-spare', popover: { title: 'Spare Vehicles', description: 'Available vehicles ready for deployment.', side: 'bottom' as const, align: 'start' as const } },
      { element: '#kpi-mot', popover: { title: 'MOT Due', description: 'CRITICAL: Vehicles that need MOT soon.', side: 'bottom' as const, align: 'start' as const } },
      { element: '#kpi-service', popover: { title: 'Service Due', description: 'Vehicles that require servicing soon.', side: 'bottom' as const, align: 'start' as const } },
      { element: '#kpi-tax', popover: { title: 'Road Tax Due', description: 'Vehicles requiring tax renewal.', side: 'bottom' as const, align: 'start' as const } },
      { element: '#chart-trade', popover: { title: 'Trade Group Chart', description: 'Shows fleet distribution across trade groups.', side: 'top' as const, align: 'start' as const } },
      { element: '#chart-vehicle', popover: { title: 'Vehicle Type Chart', description: 'Shows breakdown of fleet by vehicle type.', side: 'top' as const, align: 'start' as const } },
      { popover: { title: 'Tour Complete', description: 'You are now ready to monitor fleet performance.', side: 'over' as const, align: 'center' as const } },
    ].filter((step) => !step.element || document.querySelector(step.element));

    driver({ showProgress: true, animate: true, overlayOpacity: 0.6, allowClose: true, steps }).drive();
  };

  useEffect(() => {
    fetchVehicleSummary();
    const interval = setInterval(() => { fetchVehicleSummary(true); }, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const seen = localStorage.getItem('fleet-tour-seen');
    if (!seen) {
      const timer = window.setTimeout(() => { startFleetTour(); localStorage.setItem('fleet-tour-seen', 'true'); }, 1000);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const fetchVehicleSummary = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setIsRefreshing(true);
      setError(null);
      const response = await axios.get(API_ENDPOINTS.VEHICLE_SUMMARY);
      setSummary(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load dashboard data from Salesforce');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const convertVehicle = (v: SalesforceVehicle): VehicleRecord => ({
    name: v.Name || '', vanNumber: v.Van_Number__c || v.Name || '', regNo: v.Reg_No__c || '',
    status: v.Status__c || '', vehicleType: v.Vehicle_Type__c || v.Make_Model__c || '',
    tradeGroup: v.Trade_Group__c || '', vehicleOwnership: v.Vehicle_Ownership__c || '',
    serviceCost: '', maintenanceCost: '', lastServiceDate: v.Last_Service_Date__c || '',
    nextServiceDate: v.Next_Service_Date__c || '', lastRoadTax: v.Last_Road_Tax__c || '',
    nextRoadTax: v.Next_Road_Tax__c || '', nextRoadTaxEditable: v.Next_Road_Tax_Editable__c || '',
  } as VehicleRecord);

  const fetchVehiclesByStatus = async (status: string, title: string, description: string, sheetType: SheetType) => {
    try {
      const response = await axios.get<VehiclesByStatusResponse>(API_ENDPOINTS.VEHICLES_BY_STATUS(status));
      setSheetVehicles(response.data.vehicles.map(convertVehicle));
      setSheetData({ title, description });
      setActiveSheet(sheetType);
    } catch { alert(`Failed to load ${title} data`); }
  };

  const fetchMotDue = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.VEHICLES_MOT_DUE);
      setSheetVehicles(response.data.vehicles.map(convertVehicle));
      setSheetData({ title: 'MOT Due in 30 Days', description: 'Vehicles with MOT expiring in the next 30 days' });
      setActiveSheet('mot');
    } catch { alert('Failed to load MOT due vehicles'); }
  };

  const fetchServiceDue = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.VEHICLES_SERVICE_DUE);
      setSheetVehicles(response.data.vehicles.map(convertVehicle));
      setSheetData({ title: 'Vehicles to Service', description: 'Vehicles due for service in the next 30 days' });
      setActiveSheet('service');
    } catch { alert('Failed to load service due vehicles'); }
  };

  const fetchTaxDue = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.VEHICLES_TAX_DUE);
      setSheetVehicles(response.data.vehicles.map(convertVehicle));
      setSheetData({ title: 'Road Tax Due', description: 'Vehicles with road tax due in the next 30 days' });
      setActiveSheet('tax');
    } catch { alert('Failed to load road tax due vehicles'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F7F9FD' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#F1FF24', borderTopColor: '#27549D' }}></div>
          <div className="text-xl font-semibold" style={{ color: '#27549D', fontFamily: 'MontBold' }}>Loading Fleet Intelligence...</div>
          <div className="text-sm font-light mt-2" style={{ color: '#646F86' }}>Fetching real-time data from Salesforce</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#F7F9FD' }}>
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" style={{ color: '#D15134' }} />
          <div className="text-xl font-semibold" style={{ color: '#1A1D23' }}>{error}</div>
          <button onClick={() => fetchVehicleSummary()} className="mt-4" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 12, background: '#17325E', color: '#F1FF24', border: 'none', boxShadow: '0 14px 28px rgba(23,50,94,0.22)', fontWeight: 700, fontFamily: 'Mont, sans-serif', cursor: 'pointer' }}>
            <RefreshCw className="w-5 h-5" /><span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9FD', paddingBottom: '32px' }}>

      {/* ─── HEADER ─── */}
      <div style={{
        backgroundImage: "url('/navheader-background.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center 40%',
        borderBottom: '1px solid #E8EAEE',
        padding: '18px 32px',
        marginBottom: '32px',
        position: 'relative',
      }}>
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,30,60,0.45)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          {/* Title */}
          <div style={{ minWidth: 0, flex: '1 1 420px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px 0', fontFamily: 'Mont, sans-serif', letterSpacing: '-0.02em' }}>
              Chumley Fleet &amp; Asset Management System
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.85)', fontFamily: 'Mont, sans-serif', fontSize: '14px', fontWeight: 500 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '999px', backgroundColor: '#2EB844', display: 'inline-block' }} />
                Live Data Feed
              </span>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontFamily: 'Mont, sans-serif', fontSize: '14px', fontWeight: 500 }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '0 1 auto' }}>

            {/* ✅ COPILOT AI — yellow, NO white */}


            {/* ✅ START GUIDE — frosted glass, white text */}
            <button
              onClick={startFleetTour}
              title="Start Guide"
              aria-label="Start Guide"
              style={guideButtonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)'; }}
            >
              <Target style={{ width: 20, height: 20 }} />
            </button>

          </div>
        </div>
      </div>

      {/* ─── KPI Grid ─── */}
      <div className="px-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Card 1: Current Vehicles */}
          <div id="kpi-current" onClick={() => fetchVehiclesByStatus('current', 'Current Vehicles', 'All active vehicles in the fleet', 'current')}
            className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #DEE8F7' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39,84,157,0.1), rgba(241,255,36,0.1))' }}></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #1e3d6e, #17325E)' }}><Car className="w-7 h-7" style={{ color: '#F1FF24' }} /></div>
                <Info className="w-4 h-4" style={{ color: '#848EA3' }} />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Current Vehicles</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.total ?? 0}</span>
                <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#17325E' }}><TrendingUp className="w-3 h-3" />Active</span>
              </div>
              <p className="text-sm mt-2" style={{ color: '#323843' }}>Active fleet (excl. Written Off, Sold, Returned)</p>
        </div>
      </div>

          {/* Card 2: Allocated Vehicles */}
          <div id="kpi-allocated" onClick={() => fetchVehiclesByStatus('allocated', 'Allocated Vehicles', 'Vehicles with active driver allocations', 'allocated')}
            className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid rgba(241,255,36,0.5)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(241,255,36,0.2), rgba(39,84,157,0.1))' }}></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#F1FF24' }}><CheckCircle className="w-7 h-7" style={{ color: '#17325E' }} /></div>
                <Info className="w-4 h-4" style={{ color: '#848EA3' }} />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Allocated Vehicles</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.allocated ?? 0}</span>
                <span className="text-sm" style={{ color: '#646F86' }}>({Math.round(((summary?.allocated ?? 0) / (summary?.total ?? 1)) * 100)}%)</span>
              </div>
              <p className="text-sm mt-2" style={{ color: '#323843' }}>With active driver allocations</p>
            </div>
          </div>

          {/* Card 3: Vehicles in Garage */}
          <div id="kpi-garage" onClick={() => fetchVehiclesByStatus('garage', 'Vehicles in Garage', 'Vehicles currently under repair', 'garage')}
            className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #DEE8F7' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39,84,157,0.1), rgba(241,255,36,0.1))' }}></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #1e3d6e, #17325E)' }}><Wrench className="w-7 h-7" style={{ color: '#F1FF24' }} /></div>
                <Info className="w-4 h-4" style={{ color: '#848EA3' }} />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Vehicles in Garage</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.garage ?? 0}</span>
                <span className="text-sm font-semibold" style={{ color: '#D15134' }}>Critical</span>
              </div>
              <p className="text-sm mt-2" style={{ color: '#323843' }}>Under repair - reducing capacity</p>
            </div>
          </div>

          {/* Card 4: Spare Vehicles Ready */}
          <div id="kpi-spare" onClick={() => fetchVehiclesByStatus('spare_ready', 'Spare Vehicles Ready', 'Spare vehicles ready for deployment', 'spare_ready')}
            className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #DEE8F7' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39,84,157,0.1), rgba(112,153,219,0.1))' }}></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #1e3d6e, #17325E)' }}><Settings className="w-7 h-7" style={{ color: '#F1FF24' }} /></div>
                <Info className="w-4 h-4" style={{ color: '#848EA3' }} />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Spare Vehicles Ready</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.spare_ready ?? 0}</span>
                <span className="text-sm font-semibold" style={{ color: '#2EB844' }}>Available</span>
              </div>
              <p className="text-sm mt-2" style={{ color: '#323843' }}>Ready for immediate deployment</p>
            </div>
          </div>

          {/* Card 5: Reserved Vehicles */}
          <div onClick={() => fetchVehiclesByStatus('reserved', 'Reserved Vehicles', 'Vehicles reserved for specific purposes', 'reserved')}
            className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #DEE8F7' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39,84,157,0.1), rgba(112,153,219,0.1))' }}></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #1e3d6e, #17325E)' }}><FileText className="w-7 h-7" style={{ color: '#F1FF24' }} /></div>
                <Info className="w-4 h-4" style={{ color: '#848EA3' }} />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Reserved Vehicles</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.reserved ?? 0}</span>
                <span className="text-sm font-semibold" style={{ color: '#F29630' }}>Reserved</span>
              </div>
              <p className="text-sm mt-2" style={{ color: '#323843' }}>Reserved for specific use cases</p>
            </div>
          </div>

          {/* Card 6: Written Off Vehicles */}
          <div onClick={() => fetchVehiclesByStatus('written_off', 'Written Off Vehicles', 'Decommissioned vehicles', 'writtenOff')}
            className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #DEE8F7' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(39,84,157,0.1), rgba(241,255,36,0.1))' }}></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(to bottom right, #1e3d6e, #17325E)' }}><AlertTriangle className="w-7 h-7" style={{ color: '#F1FF24' }} /></div>
                <Info className="w-4 h-4" style={{ color: '#848EA3' }} />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#1A1D23', fontFamily: 'MontBold' }}>Written Off Vehicles</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.written_off ?? 0}</span>
                <span className="text-sm" style={{ color: '#646F86' }}>Decommissioned</span>
              </div>
              <p className="text-sm mt-2" style={{ color: '#323843' }}>Removed from active fleet</p>
            </div>
          </div>

          {/* Card 7: MOT Due */}
          <div id="kpi-mot" onClick={fetchMotDue}
            className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ backgroundColor: '#FEF5EC', border: '2px solid #F29630' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(242,150,48,0.2), rgba(39,84,157,0.1))' }}></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-xl animate-pulse" style={{ background: 'linear-gradient(to bottom right, #F29630, #A35C0A)' }}><Calendar className="w-7 h-7 text-white" /></div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#F29630', color: 'white' }}><AlertTriangle className="w-3 h-3" />URGENT</div>
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#A35C0A', fontFamily: 'MontBold' }}>MOT Due in 30 Days</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.mot_due ?? 0}</span>
                <span className="text-sm font-semibold" style={{ color: '#F29630' }}>Expiring Soon</span>
              </div>
              <p className="text-sm mt-2 font-semibold" style={{ color: '#A35C0A' }}>⚠️ Immediate compliance action required</p>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(163,92,10,0.3)' }}><span className="text-xs font-bold" style={{ color: '#A35C0A' }}>Click to view critical list →</span></div>
            </div>
          </div>

          {/* Card 8: Vehicles to Service */}
          <div id="kpi-service" onClick={fetchServiceDue}
            className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ backgroundColor: '#F7F9FD', border: '2px solid #7099DB' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(112,153,219,0.2), rgba(39,84,157,0.1))' }}></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(to bottom right, #1e3d6e, #17325E)' }}><Wrench className="w-7 h-7" style={{ color: '#F1FF24' }} /></div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#17325E', color: 'white' }}><Wrench className="w-3 h-3" />SCHEDULE</div>
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#17325E', fontFamily: 'MontBold' }}>Vehicles to Service</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.due_service ?? 0}</span>
                <span className="text-sm font-semibold" style={{ color: '#17325E' }}>Due Soon</span>
              </div>
              <p className="text-sm mt-2 font-semibold" style={{ color: '#17325E' }}>Service due in next 30 days</p>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid #DEE8F7' }}><span className="text-xs font-bold" style={{ color: '#17325E' }}>Click to schedule services →</span></div>
            </div>
          </div>

          {/* Card 9: Road Tax Due */}
          <div id="kpi-tax" onClick={fetchTaxDue}
            className="group relative backdrop-blur-xl rounded-2xl shadow-lg p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
            style={{ backgroundColor: '#FAEDEA', border: '2px solid #D15134' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform" style={{ background: 'linear-gradient(to bottom right, rgba(209,81,52,0.2), rgba(129,47,29,0.1))' }}></div>
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-xl animate-pulse" style={{ background: 'linear-gradient(to bottom right, #D15134, #812F1D)' }}><AlertTriangle className="w-7 h-7 text-white" /></div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: '#D15134', color: 'white' }}><span style={{ fontSize: '12px', fontWeight: 900 }}>£</span>PAY NOW</div>
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-2" style={{ color: '#812F1D', fontFamily: 'MontBold' }}>Road Tax Due</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>{summary?.tax_due ?? 0}</span>
                <span className="text-sm font-semibold" style={{ color: '#D15134' }}>Renewal Needed</span>
              </div>
              <p className="text-sm mt-2 font-semibold" style={{ color: '#812F1D' }}>⚠️ Tax renewal required within 30 days</p>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(129,47,29,0.3)' }}><span className="text-xs font-bold" style={{ color: '#812F1D' }}>Click to process payments →</span></div>
            </div>
          </div>

        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div id="chart-trade" className="backdrop-blur-xl rounded-2xl shadow-lg p-6" style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #DEE8F7' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>
                Fleet Distribution by Trade Group
              </h2>
            </div>
            <TradeGroupStackedChart data={tradeGroupChartData} title="" />
          </div>
          <div id="chart-vehicle" className="backdrop-blur-xl rounded-2xl shadow-lg p-6" style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #DEE8F7' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>
                Fleet Distribution by Vehicle Type
              </h2>
            </div>
            <VehicleTypeStackedChart data={vehicleTypeChartData} title="" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="backdrop-blur-xl rounded-2xl shadow-lg p-6" style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #DEE8F7' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>
                Spare Vehicles by Trade Group
              </h2>
            </div>
            <SpareVehiclesChart data={spareVansByTradeGroup} title="" />
          </div>
          <div className="backdrop-blur-xl rounded-2xl shadow-lg p-6" style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #DEE8F7' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#17325E', fontFamily: 'MontBold' }}>
                Leavers Vehicles Management
              </h2>
            </div>
            <LeaversVehiclesChart data={leaversByVanNumber} title="" />
          </div>
        </div>

        <VehicleDataSheet
          open={activeSheet !== null}
          onOpenChange={(open) => !open && setActiveSheet(null)}
          title={sheetData.title}
          description={sheetData.description}
          vehicles={sheetVehicles}
          sheetType={activeSheet}
        />
      </div>
    </div>
  );
};

export default FleetDashboard;
