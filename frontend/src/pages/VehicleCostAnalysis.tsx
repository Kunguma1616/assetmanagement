import React, { useState, useMemo } from 'react';
import { TrendingDown, AlertTriangle, Zap, PoundSterling, Car, BarChart3, TrendingUp, AlertCircle, Search, ChevronDown, ChevronUp, Calendar, FileText, Truck } from 'lucide-react';

// Company design system colors - EXACT MATCH
export const colors = {
  brand: { blue: "#27549D", yellow: "#F1FF24" },
  support: { gray: "#848EA3", green: "#2EB844", orange: "#F29630", red: "#D15134" },
  primary: { light: "#7099DB", default: "#27549D", darker: "#17325E", subtle: "#F7F9FD" },
  error: { light: "#E49786", default: "#D15134", darker: "#812F1D", subtle: "#FAEDEA" },
  warning: { light: "#F7C182", default: "#F29630", darker: "#A35C0A", subtle: "#FEF5EC" },
  grayscale: {
    title: "#1A1D23", body: "#323843", subtle: "#646F86", caption: "#848EA3",
    negative: "#F3F4F6", disabled: "#CDD1DA",
    border: { default: "#CDD1DA", disabled: "#E8EAEE", subtle: "#F3F4F6" },
    surface: { default: "#CDD1DA", disabled: "#E8EAEE", subtle: "#F3F4F6" },
  },
  border: {
    primary: { light: "#7099DB", default: "#27549D", darker: "#17325E", subtle: "#DEE8F7" },
    error: { light: "#E49786", default: "#D15134", darker: "#812F1D", subtle: "#F6DBD5" },
    warning: { light: "#F7C182", default: "#F29630", darker: "#A35C0A", subtle: "#FCE9D4" },
  },
  surface: {
    primary: { default: "#27549D", lighter: "#7099DB", darker: "#17325E", subtle: "#F7F9FD" },
    error: { default: "#D15134", lighter: "#E49786", darker: "#812F1D", subtle: "#FAEDEA" },
    warning: { default: "#F29630", lighter: "#F7C182", darker: "#A35C0A", subtle: "#FEF5EC" },
  },
  text: {
    primary: { label: "#17325E" },
    error: { label: "#812F1D" },
    warning: { label: "#A35C0A" },
    grayscale: { title: "#1A1D23", body: "#323843", subtle: "#646F86", caption: "#848EA3", negative: "#F3F4F6", disabled: "#CDD1DA" },
  },
};

interface Vehicle {
  registration: string;
  model: string;
  net_capital: number;
}

interface LeaseData {
  identifier: string;
  type: string;
  contract_number: string;
  agreement_start: string;
  agreement_term_months: number;
  agreement_end: string;
  capital_cost: number;
  arrangement_fee: number;
  finance_interest: number;
  initial_payment: number;
  monthly_installment: number;
  final_payment: number;
  total_repayment: number;
  vehicles: Vehicle[];
}

const HSBC_LEASES: LeaseData[] = [
  {"identifier":"HSBC 1","type":"Motor Vehicle","contract_number":"309651","agreement_start":"2022-08-26","agreement_term_months":48,"agreement_end":"2026-08-26","capital_cost":33948,"arrangement_fee":50,"finance_interest":2973.78,"initial_payment":8404.5,"monthly_installment":594.11,"final_payment":0,"total_repayment":36921.78,"vehicles":[{"registration":"BT70XMO","model":"Peugeot Boxer PROFESSIONAL L3H2 2.2 BLUE","net_capital":28015}]},
  {"identifier":"HSBC 3","type":"Motor Vehicle","contract_number":"303740","agreement_start":"2022-03-03","agreement_term_months":48,"agreement_end":"2026-03-03","capital_cost":69480,"arrangement_fee":50,"finance_interest":5232,"initial_payment":6998,"monthly_installment":1411.75,"final_payment":0,"total_repayment":74762,"vehicles":[{"registration":"KS70 ORP","model":"Audi Q7 S Line 55 TFSi e Quattro","net_capital":57500}]},
  {"identifier":"HSBC 4","type":"Motor Vehicle","contract_number":"302841","agreement_start":"2022-01-13","agreement_term_months":0,"agreement_end":"2026-01-13","capital_cost":199191.6,"arrangement_fee":50,"finance_interest":10713.63,"initial_payment":41184.75,"monthly_installment":3515.01,"final_payment":0,"total_repayment":209905.23,"vehicles":[{"registration":"YF71EKO","model":"Renault TraficLL30 DCi 170 BLACK EDITION","net_capital":27278},{"registration":"YP7 1MVA","model":"Renault Trafic SL28 Energy Sport Nav","net_capital":28233},{"registration":"YE71FZL","model":"Renault Trafic LL30 Energy Black Edition","net_capital":27278},{"registration":"YP71MUO","model":"Renault Trafic LL30 Energy Sport Nav","net_capital":27733},{"registration":"YE710YW","model":"Renault Trafic LWB Black Edition","net_capital":28233},{"registration":"YP71SNJ","model":"Renault Trafic SL28 Energy Sport Nav","net_capital":25588}]},
  {"identifier":"HSBC 5","type":"Motor Vehicle","contract_number":"302840","agreement_start":"2021-12-13","agreement_term_months":48,"agreement_end":"2025-12-13","capital_cost":97162.8,"arrangement_fee":50,"finance_interest":5226.38,"initial_payment":20085.5,"monthly_installment":1714.66,"final_payment":0,"total_repayment":102389.18,"vehicles":[{"registration":"YVP71 JUK","model":"Renault Trafic SL28 DCi 145","net_capital":25588},{"registration":"YP71 OHA","model":"Renault Trafic LL30 DCi 170","net_capital":27278},{"registration":"YP71 SMX","model":"Renault Trafic LL30 DCi 170","net_capital":27278}]},
  {"identifier":"HSBC 6","type":"Motor Vehicle","contract_number":"302839","agreement_start":"2021-12-10","agreement_term_months":48,"agreement_end":"2024-09-28","capital_cost":100336.8,"arrangement_fee":50,"finance_interest":5396.83,"initial_payment":20746.75,"monthly_installment":1770.56,"final_payment":0,"total_repayment":105733.63,"vehicles":[{"registration":"YP71WRN","model":"Renault Trafic Sl28 DCi 170","net_capital":27278},{"registration":"YP71WRG","model":"Renault Trafic SI28 DCi 170","net_capital":27278},{"registration":"YVP71RZM","model":"Renault Trafic LL20 DCi 170","net_capital":28233}]},
  {"identifier":"HSBC 7","type":"Motor Vehicle","contract_number":"301861","agreement_start":"2021-12-18","agreement_term_months":48,"agreement_end":"2025-12-18","capital_cost":196353.58,"arrangement_fee":50,"finance_interest":10296.86,"initial_payment":40593.5,"monthly_installment":3459.52,"final_payment":0,"total_repayment":206650.46,"vehicles":[{"registration":"YE71DZX","model":"RENAULT TRAFIC LWB 30 2.0CI","net_capital":27278}]},
  {"identifier":"HSBC 8 -1","type":"Motor Vehicle","contract_number":"301798","agreement_start":"2021-11-16","agreement_term_months":48,"agreement_end":"2025-11-16","capital_cost":20500,"arrangement_fee":50,"finance_interest":1134.68,"initial_payment":3075,"monthly_installment":386.66,"final_payment":0,"total_repayment":21634.68,"vehicles":[{"registration":"DU19 YTB","model":"Vauxhall Astra Estate SRI Nav 1.4 Petrol 2019","net_capital":20500}]},
  {"identifier":"HSBC 9","type":"Motor Vehicle","contract_number":"300999","agreement_start":"2021-10-18","agreement_term_months":48,"agreement_end":"2025-10-18","capital_cost":164076,"arrangement_fee":50,"finance_interest":7209.25,"initial_payment":33921.25,"monthly_installment":2861.75,"final_payment":0,"total_repayment":171285.25,"vehicles":[{"registration":"YR71UHA","model":"Renault Trafic LWB","net_capital":25528},{"registration":"YH71XYJ","model":"Renault Trafic LWB","net_capital":27218},{"registration":"YT71ZYF","model":"Renault Trafic LWB","net_capital":27218},{"registration":"YH71WNC","model":"Renault Trafic LWB","net_capital":27218},{"registration":"YH71WND","model":"Renault Trafic LWB","net_capital":28173}]},
  {"identifier":"HSBC 10","type":"Equipment","contract_number":"300961","agreement_start":"2021-10-01","agreement_term_months":30,"agreement_end":"2024-09-28","capital_cost":22455.22,"arrangement_fee":50,"finance_interest":648.36,"initial_payment":4678.17,"monthly_installment":614.18,"final_payment":0,"total_repayment":23103.57,"vehicles":[]},
  {"identifier":"HSBC 15","type":"Motor Vehicle","contract_number":"300400","agreement_start":"2021-09-28","agreement_term_months":36,"agreement_end":"2024-09-28","capital_cost":79690.83,"arrangement_fee":50,"finance_interest":2752.91,"initial_payment":16602.26,"monthly_installment":1828.93,"final_payment":0,"total_repayment":82443.74,"vehicles":[{"registration":"MT17 SUH","model":"Renault Trafic SL27 Business Van","net_capital":1512}]},
  {"identifier":"HSBC 22","type":"Motor Vehicle","contract_number":"297162","agreement_start":"2021-05-10","agreement_term_months":48,"agreement_end":"2024-09-28","capital_cost":108720,"arrangement_fee":50,"finance_interest":4429.48,"initial_payment":22441,"monthly_installment":1889.76,"final_payment":0,"total_repayment":113149.48,"vehicles":[{"registration":"YC21 OCL","model":"Renault Energy 120 DCI Van","net_capital":22375},{"registration":"YC21 OCG","model":"Renault Energy Dci 120 Van","net_capital":22375},{"registration":"YE21 AGZ","model":"Renaukt Energy Dei 120 Van","net_capital":22375},{"registration":"YC21 OHO","model":"Renault Energy Dei 120 Van","net_capital":22375}]},
];

const fmt = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 0 });

const VehicleCostAnalysis = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedLease, setExpandedLease] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'identifier' | 'total_repayment' | 'capital_cost' | 'monthly_installment'>('identifier');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filteredLeases = useMemo(() => {
    let result = HSBC_LEASES.filter(l => {
      const matchesSearch = searchTerm === "" ||
        l.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.contract_number.includes(searchTerm) ||
        l.vehicles.some(v => v.registration.toLowerCase().includes(searchTerm.toLowerCase()) || v.model.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === "all" || l.type === filterType;
      return matchesSearch && matchesType;
    });

    result.sort((a, b) => {
      let valA: number | string, valB: number | string;
      if (sortBy === 'identifier') {
        const numA = parseInt(a.identifier.replace(/[^\d]/g, '')) || 0;
        const numB = parseInt(b.identifier.replace(/[^\d]/g, '')) || 0;
        valA = numA; valB = numB;
      } else {
        valA = a[sortBy]; valB = b[sortBy];
      }
      if (sortDir === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return result;
  }, [searchTerm, filterType, sortBy, sortDir]);

  const totals = useMemo(() => {
    const activeLeases = HSBC_LEASES.filter(l => l.capital_cost > 0);
    return {
      totalCapitalCost: activeLeases.reduce((s, l) => s + l.capital_cost, 0),
      totalRepayment: activeLeases.reduce((s, l) => s + l.total_repayment, 0),
      totalFinanceInterest: activeLeases.reduce((s, l) => s + l.finance_interest, 0),
      totalMonthly: activeLeases.reduce((s, l) => s + l.monthly_installment, 0),
      totalVehicles: HSBC_LEASES.reduce((s, l) => s + l.vehicles.length, 0),
      leaseCount: HSBC_LEASES.length,
      motorVehicleCount: HSBC_LEASES.filter(l => l.type === 'Motor Vehicle').length,
      equipmentCount: HSBC_LEASES.filter(l => l.type === 'Equipment').length,
    };
  }, []);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.surface.primary.subtle, fontFamily: "'Mont', 'Montserrat', -apple-system, sans-serif" }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.primary.default }}>
              <PoundSterling className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl tracking-tight" style={{ color: colors.grayscale.title, fontWeight: 800 }}>
                HSBC Lease Register
              </h1>
              <p className="text-lg" style={{ color: colors.grayscale.body, fontWeight: 500 }}>
                Lease cost breakdown by identifier
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-2xl shadow-sm p-6 text-white" style={{ backgroundColor: colors.brand.blue }}>
            <p className="text-sm opacity-90" style={{ fontWeight: 600 }}>Total Capital Cost</p>
            <p className="text-2xl mt-1" style={{ fontWeight: 700 }}>£{fmtInt(totals.totalCapitalCost)}</p>
          </div>
          <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${colors.grayscale.border.default}` }}>
            <p className="text-sm" style={{ color: colors.grayscale.caption, fontWeight: 600 }}>Total Repayment</p>
            <p className="text-2xl mt-1" style={{ color: colors.brand.blue, fontWeight: 700 }}>£{fmtInt(totals.totalRepayment)}</p>
          </div>
          <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${colors.grayscale.border.default}` }}>
            <p className="text-sm" style={{ color: colors.grayscale.caption, fontWeight: 600 }}>Total Finance Interest</p>
            <p className="text-2xl mt-1" style={{ color: colors.support.orange, fontWeight: 700 }}>£{fmtInt(totals.totalFinanceInterest)}</p>
          </div>
          <div className="rounded-2xl shadow-sm p-6" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${colors.grayscale.border.default}` }}>
            <p className="text-sm" style={{ color: colors.grayscale.caption, fontWeight: 600 }}>Total Monthly</p>
            <p className="text-2xl mt-1" style={{ color: colors.support.red, fontWeight: 700 }}>£{fmtInt(totals.totalMonthly)}/mo</p>
          </div>
        </div>

        {/* Count Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl shadow-sm p-4 flex items-center gap-3" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${colors.grayscale.border.default}` }}>
            <FileText className="w-8 h-8" style={{ color: colors.brand.blue }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.grayscale.title }}>{totals.leaseCount}</p>
              <p className="text-xs" style={{ color: colors.grayscale.caption }}>Total Leases</p>
            </div>
          </div>
          <div className="rounded-xl shadow-sm p-4 flex items-center gap-3" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${colors.grayscale.border.default}` }}>
            <Truck className="w-8 h-8" style={{ color: colors.support.orange }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.grayscale.title }}>{totals.motorVehicleCount}</p>
              <p className="text-xs" style={{ color: colors.grayscale.caption }}>Motor Vehicle Leases</p>
            </div>
          </div>
          <div className="rounded-xl shadow-sm p-4 flex items-center gap-3" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${colors.grayscale.border.default}` }}>
            <Zap className="w-8 h-8" style={{ color: colors.support.green }} />
            <div>
              <p className="text-2xl font-bold" style={{ color: colors.grayscale.title }}>{totals.equipmentCount}</p>
              <p className="text-xs" style={{ color: colors.grayscale.caption }}>Equipment Leases</p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="rounded-2xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-3" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${colors.grayscale.border.default}` }}>
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.grayscale.caption }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by identifier, contract number, registration, or model..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 text-sm"
              style={{ border: `1px solid ${colors.grayscale.border.default}`, color: colors.grayscale.body }}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
            style={{ border: `1px solid ${colors.grayscale.border.default}`, color: colors.grayscale.body }}
          >
            <option value="all">All Types</option>
            <option value="Motor Vehicle">Motor Vehicle</option>
            <option value="Equipment">Equipment</option>
          </select>
        </div>

        {/* Results count */}
        <p className="text-sm mb-4" style={{ color: colors.grayscale.caption }}>
          Showing {filteredLeases.length} of {HSBC_LEASES.length} leases
        </p>

        {/* Lease Table - BEAUTIFUL STYLING */}
        <div className="rounded-2xl shadow-lg overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${colors.grayscale.border.default}` }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ 
                  backgroundColor: colors.primary.default,
                  borderBottom: `3px solid ${colors.primary.darker}`
                }}>
                  <th 
                    className="px-6 py-4 text-left text-sm cursor-pointer select-none" 
                    style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }} 
                    onClick={() => handleSort('identifier')}
                  >
                    Identifier <SortIcon col="identifier" />
                  </th>
                  <th className="px-6 py-4 text-left text-sm" style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }}>Type</th>
                  <th className="px-6 py-4 text-left text-sm" style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }}>Contract #</th>
                  <th className="px-6 py-4 text-left text-sm" style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }}>Start</th>
                  <th className="px-6 py-4 text-left text-sm" style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }}>End</th>
                  <th className="px-6 py-4 text-left text-sm" style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }}>Term</th>
                  <th 
                    className="px-6 py-4 text-right text-sm cursor-pointer select-none" 
                    style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }} 
                    onClick={() => handleSort('capital_cost')}
                  >
                    Capital Cost <SortIcon col="capital_cost" />
                  </th>
                  <th 
                    className="px-6 py-4 text-right text-sm cursor-pointer select-none" 
                    style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }} 
                    onClick={() => handleSort('monthly_installment')}
                  >
                    Monthly <SortIcon col="monthly_installment" />
                  </th>
                  <th 
                    className="px-6 py-4 text-right text-sm cursor-pointer select-none" 
                    style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }} 
                    onClick={() => handleSort('total_repayment')}
                  >
                    Total Repayment <SortIcon col="total_repayment" />
                  </th>
                  <th className="px-6 py-4 text-center text-sm" style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }}>Vehicles</th>
                  <th className="px-6 py-4 text-sm" style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: '0.02em' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeases.map((lease, idx) => {
                  const isExpanded = expandedLease === lease.identifier;
                  return (
                    <React.Fragment key={lease.identifier}>
                      <tr
                        className="cursor-pointer transition-all"
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#FFFFFF' : colors.primary.subtle,
                          borderBottom: `1px solid ${colors.grayscale.border.subtle}`
                        }}
                        onClick={() => setExpandedLease(isExpanded ? null : lease.identifier)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.primary.subtle;
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : colors.primary.subtle;
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <td className="px-6 py-4 text-sm" style={{ color: colors.brand.blue, fontWeight: 800 }}>{lease.identifier}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className="px-3 py-1 rounded-full text-xs"
                            style={{
                              backgroundColor: lease.type === 'Motor Vehicle' ? colors.border.primary.subtle : colors.border.warning.subtle,
                              color: lease.type === 'Motor Vehicle' ? colors.brand.blue : colors.warning.darker,
                              fontWeight: 600
                            }}
                          >
                            {lease.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono" style={{ color: colors.grayscale.body, fontWeight: 600 }}>{lease.contract_number}</td>
                        <td className="px-6 py-4 text-sm" style={{ color: colors.grayscale.body, fontWeight: 500 }}>{lease.agreement_start || '—'}</td>
                        <td className="px-6 py-4 text-sm" style={{ color: colors.grayscale.body, fontWeight: 500 }}>{lease.agreement_end || '—'}</td>
                        <td className="px-6 py-4 text-sm" style={{ color: colors.grayscale.body, fontWeight: 500 }}>{lease.agreement_term_months ? `${lease.agreement_term_months}mo` : '—'}</td>
                        <td className="px-6 py-4 text-sm text-right" style={{ color: colors.grayscale.title, fontWeight: 700 }}>
                          {lease.capital_cost > 0 ? `£${fmt(lease.capital_cost)}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right" style={{ color: colors.support.orange, fontWeight: 700 }}>
                          {lease.monthly_installment > 0 ? `£${fmt(lease.monthly_installment)}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right" style={{ color: colors.support.green, fontWeight: 800, letterSpacing: '-0.01em' }}>
                          {lease.total_repayment > 0 ? `£${fmt(lease.total_repayment)}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span 
                            style={{ 
                              backgroundColor: colors.primary.default, 
                              color: '#FFFFFF', 
                              padding: '0.375rem 0.75rem', 
                              borderRadius: '8px', 
                              fontWeight: 700,
                              display: 'inline-block',
                              minWidth: '32px'
                            }}
                          >
                            {lease.vehicles.length}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isExpanded ? 
                            <ChevronUp className="w-5 h-5" style={{ color: colors.primary.default }} strokeWidth={3} /> : 
                            <ChevronDown className="w-5 h-5" style={{ color: colors.primary.default }} strokeWidth={3} />
                          }
                        </td>
                      </tr>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} style={{ 
                            background: `linear-gradient(to right, ${colors.primary.subtle}, #FFFFFF)`,
                            borderBottom: `3px solid ${colors.primary.light}`
                          }}>
                            <div className="p-6">
                              {/* Cost Breakdown */}
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
                                <div className="rounded-lg p-4" style={{ backgroundColor: '#FFFFFF', border: `2px solid ${colors.grayscale.border.default}` }}>
                                  <p className="text-xs" style={{ color: colors.grayscale.caption, fontWeight: 600 }}>Capital Cost</p>
                                  <p className="text-lg font-bold mt-1" style={{ color: colors.grayscale.title }}>£{fmt(lease.capital_cost)}</p>
                                </div>
                                <div className="rounded-lg p-4" style={{ backgroundColor: '#FFFFFF', border: `2px solid ${colors.grayscale.border.default}` }}>
                                  <p className="text-xs" style={{ color: colors.grayscale.caption, fontWeight: 600 }}>Arrangement Fee</p>
                                  <p className="text-lg font-bold mt-1" style={{ color: colors.grayscale.title }}>£{fmt(lease.arrangement_fee)}</p>
                                </div>
                                <div className="rounded-lg p-4" style={{ backgroundColor: '#FFFFFF', border: `2px solid ${colors.grayscale.border.default}` }}>
                                  <p className="text-xs" style={{ color: colors.grayscale.caption, fontWeight: 600 }}>Finance Interest</p>
                                  <p className="text-lg font-bold mt-1" style={{ color: colors.support.orange }}>£{fmt(lease.finance_interest)}</p>
                                </div>
                                <div className="rounded-lg p-4" style={{ backgroundColor: '#FFFFFF', border: `2px solid ${colors.grayscale.border.default}` }}>
                                  <p className="text-xs" style={{ color: colors.grayscale.caption, fontWeight: 600 }}>Initial Payment</p>
                                  <p className="text-lg font-bold mt-1" style={{ color: colors.grayscale.title }}>£{fmt(lease.initial_payment)}</p>
                                </div>
                                <div className="rounded-lg p-4" style={{ backgroundColor: '#FFFFFF', border: `2px solid ${colors.grayscale.border.default}` }}>
                                  <p className="text-xs" style={{ color: colors.grayscale.caption, fontWeight: 600 }}>Final Payment</p>
                                  <p className="text-lg font-bold mt-1" style={{ color: colors.grayscale.title }}>£{fmt(lease.final_payment)}</p>
                                </div>
                              </div>

                              {/* Vehicles */}
                              {lease.vehicles.length > 0 && (
                                <div>
                                  <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: colors.text.primary.label }}>
                                    <Car className="w-4 h-4" /> Vehicles on this lease ({lease.vehicles.length})
                                  </p>
                                  <div className="space-y-2">
                                    {lease.vehicles.map((v, vi) => (
                                      <div
                                        key={vi}
                                        className="rounded-lg p-4 flex justify-between items-center transition-all"
                                        style={{
                                          backgroundColor: '#FFFFFF',
                                          border: `1px solid ${colors.grayscale.border.default}`
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.borderColor = colors.primary.default;
                                          e.currentTarget.style.boxShadow = `0 4px 12px rgba(39, 84, 157, 0.15)`;
                                          e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.borderColor = colors.grayscale.border.default;
                                          e.currentTarget.style.boxShadow = 'none';
                                          e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                      >
                                        <div>
                                          <div className="font-mono" style={{ color: colors.brand.blue, fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>
                                            {v.registration}
                                          </div>
                                          <div style={{ color: colors.grayscale.subtle, fontWeight: 500, fontSize: '0.8125rem' }}>
                                            {v.model}
                                          </div>
                                        </div>
                                        <div style={{ 
                                          color: colors.primary.default, 
                                          fontWeight: 800, 
                                          fontSize: '1rem',
                                          background: colors.primary.subtle,
                                          padding: '0.5rem 1rem',
                                          borderRadius: '8px'
                                        }}>
                                          £{fmt(v.net_capital)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {lease.vehicles.length === 0 && (
                                <p className="text-sm italic" style={{ color: colors.grayscale.caption }}>Equipment lease — no vehicles linked</p>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-3 mt-5 justify-end">
                                <button
                                  className="px-6 py-3 rounded-lg text-sm transition-all"
                                  style={{
                                    background: colors.brand.yellow,
                                    color: colors.text.primary.label,
                                    border: 'none',
                                    fontWeight: 700,
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 4px 12px rgba(241, 255, 36, 0.3)',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(241, 255, 36, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(241, 255, 36, 0.3)';
                                  }}
                                >
                                  View Details
                                </button>
                                <button
                                  className="px-6 py-3 rounded-lg text-sm transition-all"
                                  style={{
                                    background: colors.primary.default,
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontWeight: 700,
                                    letterSpacing: '0.02em',
                                    boxShadow: '0 4px 12px rgba(39, 84, 157, 0.3)',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = colors.primary.darker;
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 84, 157, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = colors.primary.default;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(39, 84, 157, 0.3)';
                                  }}
                                >
                                  Export Contract
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleCostAnalysis;