import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Vehicle {
  registration: string;
  model: string;
  netCapital: string;
}

interface Lease {
  identifier: string;
  type: string;
  contractNumber: string;
  registrationDoc: string;
  makeModel: string;
  startDate: string;
  termMonths: string;
  endDate: string;
  netCapital: string;
  capitalCost: string;
  arrangementFee: string;
  financeInterest: string;
  initialPayment: string;
  monthlyInstallment: string;
  finalPayment: string;
  totalRepayment: string;
  vehicles: Vehicle[];
}

// Color system
const colors = {
  primary: {
    default: '#27549D',
    light: '#7099DB',
    darker: '#17325E',
    subtle: '#F7F9FD',
  },
  support: {
    green: '#2EB844',
    orange: '#F29630',
    red: '#D15134',
  },
  grayscale: {
    title: '#1A1D23',
    body: '#323843',
    subtle: '#646F86',
    caption: '#848EA3',
    negative: '#F3F4F6',
    border: '#CDD1DA',
  },
};

// Hardcoded lease data
const leaseData: Lease[] = [
  {
    identifier: 'HSBC 15',
    type: 'Motor Vehicle',
    contractNumber: '300400',
    registrationDoc: 'MT17 SUH',
    makeModel: 'Renault Trafic SL27 Business Van',
    startDate: '28 September 2021',
    termMonths: '36',
    endDate: '28 September 2024',
    netCapital: '£1,512.00',
    capitalCost: '£79,690.83',
    arrangementFee: '£50.00',
    financeInterest: '£2,752.91',
    initialPayment: '£16,602.26',
    monthlyInstallment: '£1,828.93',
    finalPayment: '£0.00',
    totalRepayment: '£82,443.74',
    vehicles: [
      { registration: 'MT17 SUH', model: 'Renault Trafic SL27 Business Van', netCapital: '£1,512.00' },
    ],
  },
  {
    identifier: 'HSBC 22',
    type: 'Motor Vehicle',
    contractNumber: '297162',
    registrationDoc: 'YC21 OCL',
    makeModel: 'Renault Energy 120 DCI Van',
    startDate: '10 May 2021',
    termMonths: '48',
    endDate: '28 September 2024',
    netCapital: '£22,375.00',
    capitalCost: '£108,720.00',
    arrangementFee: '£50.00',
    financeInterest: '£4,429.48',
    initialPayment: '£22,441.00',
    monthlyInstallment: '£1,889.76',
    finalPayment: '£0.00',
    totalRepayment: '£113,149.48',
    vehicles: [
      { registration: 'YC21 OCL', model: 'Renault Energy Dci 120 Van', netCapital: '£22,375.00' },
      { registration: 'YC21 OCG', model: 'Renault Energy Dci 120 Van', netCapital: '£22,375.00' },
      { registration: 'YE21 AGZ', model: 'Renaukt Energy Dei 120 Van', netCapital: '£22,375.00' },
      { registration: 'YC21 OHO', model: 'Renault Energy Dei 120 Van', netCapital: '£22,375.00' },
    ],
  },
  {
    identifier: 'HSBC 6',
    type: 'Motor Vehicle',
    contractNumber: '302839',
    registrationDoc: 'YP71WRN',
    makeModel: 'Renault Trafic Sl28 DCi 170',
    startDate: '10 December 2021',
    termMonths: '48',
    endDate: '28 September 2024',
    netCapital: '£27,278.00',
    capitalCost: '£100,336.80',
    arrangementFee: '£50.00',
    financeInterest: '£5,396.83',
    initialPayment: '£20,746.75',
    monthlyInstallment: '£1,770.56',
    finalPayment: '£0.00',
    totalRepayment: '£105,733.63',
    vehicles: [
      { registration: 'YP71WRN', model: 'Renault Trafic Sl28 DCi 170', netCapital: '£27,278.00' },
      { registration: 'YP71WRG', model: 'Renault Trafic SI28 DCi 170', netCapital: '£27,278.00' },
      { registration: 'YVP71RZM', model: 'Renault Trafic LL20 DCi 170', netCapital: '£28,233.00' },
    ],
  },
  {
    identifier: 'HSBC 7',
    type: 'Motor Vehicle',
    contractNumber: '301861',
    registrationDoc: 'YE71DZX',
    makeModel: 'RENAULT TRAFIC LWB 30 2.0CI',
    startDate: '18 December 2021',
    termMonths: '48',
    endDate: '18 December 2025',
    netCapital: '£27,278.00',
    capitalCost: '£196,353.58',
    arrangementFee: '£50.00',
    financeInterest: '£10,296.86',
    initialPayment: '£40,593.50',
    monthlyInstallment: '£3,459.52',
    finalPayment: '£0.00',
    totalRepayment: '£206,650.46',
    vehicles: [
      { registration: 'YE71DZX', model: 'RENAULT TRAFIC LWB 30 2.0CI', netCapital: '£27,278.00' },
      { registration: 'YP71EUN', model: 'RENAULT TRAFIC LL30 ENERGY', netCapital: '£25,588.00' },
      { registration: 'YE71DZZ', model: 'RENAULT TRAFIC LWB 30 2.0CI', netCapital: '£27,278.00' },
      { registration: 'YE71EPZ', model: '307996 RENAULT TRAFIC LWB 30 2.0DCI', netCapital: '£27,278.00' },
      { registration: 'YE71ERJ', model: 'RENAULT TRAFIC LWB 30 2.0DCI', netCapital: '£27,278.00' },
      { registration: 'YE71CLO', model: 'RENAULT TRAFIC LWB 30 2.0DCI', netCapital: '£27,278.00' },
    ],
  },
  {
    identifier: 'HSBC 1',
    type: 'Motor Vehicle',
    contractNumber: '309651',
    registrationDoc: 'BT70XMO',
    makeModel: 'Peugeot Boxer PROFESSIONAL L3H2 2.2 BLUE',
    startDate: '26 August 2022',
    termMonths: '48',
    endDate: '26 August 2026',
    netCapital: '£28,015.00',
    capitalCost: '£33,948.00',
    arrangementFee: '£50.00',
    financeInterest: '£2,973.78',
    initialPayment: '£8,404.50',
    monthlyInstallment: '£594.11',
    finalPayment: '£0.00',
    totalRepayment: '£36,921.78',
    vehicles: [
      { registration: 'BT70XMO', model: 'Peugeot Boxer PROFESSIONAL L3H2 2.2 BLUE', netCapital: '£28,015.00' },
    ],
  },
  {
    identifier: 'HSBC 5',
    type: 'Motor Vehicle',
    contractNumber: '302840',
    registrationDoc: 'YVP71 JUK',
    makeModel: 'Renault Trafic SL28 DCi 145',
    startDate: '13 December 2021',
    termMonths: '48',
    endDate: '13 December 2025',
    netCapital: '£25,588.00',
    capitalCost: '£97,162.80',
    arrangementFee: '£50.00',
    financeInterest: '£5,226.38',
    initialPayment: '£20,085.50',
    monthlyInstallment: '£1,714.66',
    finalPayment: '£0.00',
    totalRepayment: '£102,389.18',
    vehicles: [
      { registration: 'YVP71 JUK', model: 'Renault Trafic SL28 DCi 145', netCapital: '£25,588.00' },
      { registration: 'YP71 OHA', model: 'Renault Trafic LL30 DCi 170', netCapital: '£27,278.00' },
      { registration: 'YP71 SMX', model: 'Renault Trafic LL30 DCi 170', netCapital: '£27,278.00' },
    ],
  },
  {
    identifier: 'HSBC 8 -1',
    type: 'Motor Vehicle',
    contractNumber: '301798',
    registrationDoc: 'DU19 YTB',
    makeModel: 'Vauxhall Astra Estate SRI Nav 1.4 Petrol 2019',
    startDate: '16 November 2021',
    termMonths: '48',
    endDate: '16 November 2025',
    netCapital: '£20,500.00',
    capitalCost: '£20,500.00',
    arrangementFee: '£50.00',
    financeInterest: '£1,134.68',
    initialPayment: '£3,075.00',
    monthlyInstallment: '£386.66',
    finalPayment: '£0.00',
    totalRepayment: '£21,634.68',
    vehicles: [
      { registration: 'DU19 YTB', model: 'Vauxhall Astra Estate SRI Nav 1.4 Petrol 2019', netCapital: '£20,500.00' },
    ],
  },
  {
    identifier: 'HSBC 9',
    type: 'Motor Vehicle',
    contractNumber: '300999',
    registrationDoc: 'YR71UHA',
    makeModel: 'Renault Trafic LWB',
    startDate: '18 October 2021',
    termMonths: '48',
    endDate: '18 October 2025',
    netCapital: '£25,528.00',
    capitalCost: '£164,076.00',
    arrangementFee: '£50.00',
    financeInterest: '£7,209.25',
    initialPayment: '£33,921.25',
    monthlyInstallment: '£2,861.75',
    finalPayment: '£0.00',
    totalRepayment: '£171,285.25',
    vehicles: [
      { registration: 'YR71UHA', model: 'Renault Trafic LWB', netCapital: '£25,528.00' },
      { registration: 'YH71XYJ', model: 'Renault Trafic LWB', netCapital: '£27,218.00' },
      { registration: 'YT71ZYF', model: 'Renault Trafic LWB', netCapital: '£27,218.00' },
      { registration: 'YH71WNC', model: 'Renault Trafic LWB', netCapital: '£27,218.00' },
      { registration: 'YH71WND', model: 'Renault Trafic LWB', netCapital: '£28,173.00' },
    ],
  },
  {
    identifier: 'HSBC 16',
    type: 'Motor Vehicle',
    contractNumber: '299817',
    registrationDoc: 'YE21COF',
    makeModel: 'Renault Trafic Crew LL30 Energy',
    startDate: 'Sep 15, 2021',
    termMonths: '48',
    endDate: 'Sep 15, 2025',
    netCapital: '£25,310.00',
    capitalCost: '£60,057.60',
    arrangementFee: '£50.00',
    financeInterest: '£2,504.14',
    initialPayment: '£12,407.50',
    monthlyInstallment: '£1,044.88',
    finalPayment: '£0.00',
    totalRepayment: '£62,561.74',
    vehicles: [
      { registration: 'YE21COF', model: 'Renault Trafic Crew LL30 Energy', netCapital: '£25,310.00' },
      { registration: 'YO21BYK', model: 'Renault Trafic Crew LL30 Energy', netCapital: '£24,188.00' },
    ],
  },
  {
    identifier: 'HSBC 18',
    type: 'Motor Vehicle',
    contractNumber: '299061',
    registrationDoc: 'YC21JU.J',
    makeModel: 'Renault Trafic SL28 Energy',
    startDate: '20 July 2021',
    termMonths: '48',
    endDate: '20 July 2025',
    netCapital: '£22,560.00',
    capitalCost: '£109,608.00',
    arrangementFee: '£50.00',
    financeInterest: '£4,592.40',
    initialPayment: '£22,626.00',
    monthlyInstallment: '£1,907.80',
    finalPayment: '£0.00',
    totalRepayment: '£114,200.40',
    vehicles: [
      { registration: 'YC21JU.J', model: 'Renault Trafic SL28 Energy', netCapital: '£22,560.00' },
      { registration: 'YH21ZPU', model: 'Renault Trafic SL28 Energy', netCapital: '£22,560.00' },
      { registration: 'YH21ZPL', model: 'Renault Trafic SL28 Energy', netCapital: '£22,560.00' },
      { registration: 'YH21ZPW', model: 'Renault Trafic SL28 Energy', netCapital: '£22,560.00' },
    ],
  },
  {
    identifier: 'HSBC 20',
    type: 'Motor Vehicle',
    contractNumber: '298039',
    registrationDoc: 'YC21 NZP',
    makeModel: 'Renault Traffic SL28 Energy',
    startDate: '17 June 2021',
    termMonths: '48',
    endDate: '17 June 2025',
    netCapital: '£22,375.00',
    capitalCost: '£109,020.00',
    arrangementFee: '£50.00',
    financeInterest: '£4,514.54',
    initialPayment: '£22,503.50',
    monthlyInstallment: '£1,896.48',
    finalPayment: '£0.00',
    totalRepayment: '£113,534.54',
    vehicles: [
      { registration: 'YC21 NZP', model: 'Renault Traffic SL28 Energy', netCapital: '£22,375.00' },
      { registration: 'YC21 NZR', model: 'Renault Traffic SL28 Energy', netCapital: '£22,375.00' },
      { registration: 'YC21 NZM', model: 'Renault Traffic SL28 Energy', netCapital: '£22,500.00' },
      { registration: 'YC21 NZO', model: 'Renault Traffic SL28 Energy', netCapital: '£22,500.00' },
    ],
  },
  {
    identifier: 'HSBC 3',
    type: 'Motor Vehicle',
    contractNumber: '303740',
    registrationDoc: 'KS70 ORP',
    makeModel: 'Audi Q7 S Line 55 TFSi e Quattro',
    startDate: '03 March 2022',
    termMonths: '48',
    endDate: '03 March 2026',
    netCapital: '£57,500.00',
    capitalCost: '£69,480.00',
    arrangementFee: '£50.00',
    financeInterest: '£5,232.00',
    initialPayment: '£6,998.00',
    monthlyInstallment: '£1,411.75',
    finalPayment: '£0.00',
    totalRepayment: '£74,762.00',
    vehicles: [
      { registration: 'KS70 ORP', model: 'Audi Q7 S Line 55 TFSi e Quattro', netCapital: '£57,500.00' },
    ],
  },
  {
    identifier: 'HSBC 4',
    type: 'Motor Vehicle',
    contractNumber: '302841',
    registrationDoc: 'YF71EKO',
    makeModel: 'Renault TraficLL30 DCi 170 BLACK EDITION',
    startDate: '13 January 2022',
    termMonths: '48',
    endDate: '13 January 2026',
    netCapital: '£27,278.00',
    capitalCost: '£199,191.60',
    arrangementFee: '£50.00',
    financeInterest: '£10,713.63',
    initialPayment: '£41,184.75',
    monthlyInstallment: '£3,515.01',
    finalPayment: '£0.00',
    totalRepayment: '£209,905.23',
    vehicles: [
      { registration: 'YF71EKO', model: 'Renault TraficLL30 DCi 170 BLACK EDITION', netCapital: '£27,278.00' },
      { registration: 'YP7 1MVA', model: 'Renault Trafic SL28 Energy Sport Nav', netCapital: '£28,233.00' },
      { registration: 'YE71FZL', model: 'Renault Trafic LL30 Energy Black Edition', netCapital: '£27,278.00' },
      { registration: 'YP71MUO', model: 'Renault Trafic LL30 Energy Sport Nav', netCapital: '£27,733.00' },
      { registration: 'YE710YW', model: 'Renault Trafic LWB Black Edition', netCapital: '£28,233.00' },
      { registration: 'YP71SNJ', model: 'Renault Trafic SL28 Energy Sport Nav', netCapital: '£25,588.00' },
    ],
  },
  {
    identifier: 'HSBC 12',
    type: 'Motor Vehicle',
    contractNumber: '301994',
    registrationDoc: 'LB19YYR',
    makeModel: 'Vauxhall Astra Elite Auto Nav Turbo',
    startDate: '16 November 2021',
    termMonths: '48',
    endDate: '16 November 2025',
    netCapital: '£20,250.00',
    capitalCost: '£20,250.00',
    arrangementFee: '£50.00',
    financeInterest: '£1,137.90',
    initialPayment: '£3,037.50',
    monthlyInstallment: '£382.30',
    finalPayment: '£0.00',
    totalRepayment: '£21,387.90',
    vehicles: [
      { registration: 'LB19YYR', model: 'Vauxhall Astra Elite Auto Nav Turbo', netCapital: '£20,250.00' },
    ],
  },
];

export default function CostAnalysis() {
  const [expandedLease, setExpandedLease] = useState<string | null>(null);

  const toggleExpand = (identifier: string) => {
    setExpandedLease(expandedLease === identifier ? null : identifier);
  };

  return (
    <div style={{ background: colors.grayscale.negative, minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: colors.grayscale.title, marginBottom: '8px', fontFamily: 'MontBold' }}>
            HSBC Lease Register
          </h1>
          <p style={{ fontSize: '16px', color: colors.grayscale.subtle, fontFamily: 'MontRegular' }}>
            {leaseData.length} leases • Click to expand and view cost breakdown & vehicles
          </p>
        </div>

        {/* Leases Table */}
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${colors.grayscale.border}` }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.primary.subtle, borderBottom: `2px solid ${colors.grayscale.border}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                    Identifier
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                    Type
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                    Contract
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                    Agreement Dates
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                    Capital Cost
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                    Monthly
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                    Total Repayment
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                    Vehicles
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaseData.map((lease) => (
                  <React.Fragment key={lease.identifier}>
                    <tr
                      onClick={() => toggleExpand(lease.identifier)}
                      style={{
                        borderBottom: `1px solid ${colors.grayscale.border}`,
                        background: expandedLease === lease.identifier ? colors.primary.subtle : 'white',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (expandedLease !== lease.identifier) {
                          (e.currentTarget as HTMLTableRowElement).style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (expandedLease !== lease.identifier) {
                          (e.currentTarget as HTMLTableRowElement).style.background = 'white';
                        }
                      }}
                    >
                      <td style={{ padding: '12px 16px', color: colors.grayscale.title, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                        {lease.identifier}
                      </td>
                      <td style={{ padding: '12px 16px', color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>
                        {lease.type}
                      </td>
                      <td style={{ padding: '12px 16px', color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>
                        {lease.contractNumber}
                      </td>
                      <td style={{ padding: '12px 16px', color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>
                        {lease.startDate} to {lease.endDate}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                        {lease.capitalCost}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>
                        {lease.monthlyInstallment}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.support.green, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                        {lease.totalRepayment}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontFamily: 'MontRegular' }}>
                        <span style={{ background: colors.primary.default, color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                          {lease.vehicles.length}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.primary.default }}>
                        {expandedLease === lease.identifier ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {expandedLease === lease.identifier && (
                      <tr style={{ background: colors.primary.subtle, borderBottom: `1px solid ${colors.grayscale.border}` }}>
                        <td colSpan={9} style={{ padding: '24px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                            {/* Cost Breakdown */}
                            <div>
                              <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.grayscale.title, marginBottom: '16px', fontFamily: 'MontSemiBold' }}>
                                Cost Breakdown
                              </h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: `1px solid ${colors.grayscale.border}` }}>
                                  <span style={{ color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>Arrangement Fee:</span>
                                  <span style={{ color: colors.grayscale.title, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                                    {lease.arrangementFee}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: `1px solid ${colors.grayscale.border}` }}>
                                  <span style={{ color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>Finance Interest:</span>
                                  <span style={{ color: colors.grayscale.title, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                                    {lease.financeInterest}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: `1px solid ${colors.grayscale.border}` }}>
                                  <span style={{ color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>Initial Payment:</span>
                                  <span style={{ color: colors.grayscale.title, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                                    {lease.initialPayment}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: `1px solid ${colors.grayscale.border}` }}>
                                  <span style={{ color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>Final Payment:</span>
                                  <span style={{ color: colors.grayscale.title, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>
                                    {lease.finalPayment}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Vehicles */}
                            <div>
                              <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.grayscale.title, marginBottom: '16px', fontFamily: 'MontSemiBold' }}>
                                Vehicles ({lease.vehicles.length})
                              </h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {lease.vehicles.map((vehicle, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      background: 'white',
                                      padding: '12px',
                                      borderRadius: '6px',
                                      border: `1px solid ${colors.grayscale.border}`,
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                      <div style={{ flex: 1 }}>
                                        <p style={{ color: colors.grayscale.title, fontWeight: '600', fontSize: '12px', fontFamily: 'MontSemiBold', marginBottom: '4px' }}>
                                          {vehicle.registration}
                                        </p>
                                        <p style={{ color: colors.grayscale.subtle, fontSize: '12px', fontFamily: 'MontRegular' }}>
                                          {vehicle.model}
                                        </p>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <p style={{ color: colors.primary.default, fontWeight: '600', fontSize: '12px', fontFamily: 'MontSemiBold' }}>
                                          {vehicle.netCapital}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: `1px solid ${colors.grayscale.border}` }}>
            <p style={{ fontSize: '12px', color: colors.grayscale.subtle, marginBottom: '8px', fontFamily: 'MontRegular' }}>
              Total Leases
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: colors.primary.default, fontFamily: 'MontBold' }}>
              {leaseData.length}
            </p>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: `1px solid ${colors.grayscale.border}` }}>
            <p style={{ fontSize: '12px', color: colors.grayscale.subtle, marginBottom: '8px', fontFamily: 'MontRegular' }}>
              Total Vehicles
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: colors.primary.default, fontFamily: 'MontBold' }}>
              {leaseData.reduce((sum, lease) => sum + lease.vehicles.length, 0)}
            </p>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: `1px solid ${colors.grayscale.border}` }}>
            <p style={{ fontSize: '12px', color: colors.grayscale.subtle, marginBottom: '8px', fontFamily: 'MontRegular' }}>
              Total Capital Cost
            </p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: colors.support.green, fontFamily: 'MontBold' }}>
              £{(leaseData.reduce((sum, lease) => {
                const num = parseFloat(lease.capitalCost.replace(/£|,/g, ''));
                return sum + num;
              }, 0) / 1000).toFixed(0)}K
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
