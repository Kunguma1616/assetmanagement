import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Colors (exact design system) ────────────────────────────────────────────
export const colors = {
  // Brand colors
  brand: {
    blue: '#27549D',
    yellow: '#F1FF24',
  },
  // Support colors
  support: {
    gray: '#848EA3',
    green: '#2EB844',
    orange: '#F29630',
    red: '#D15134',
  },
  // Primary (Blue)
  primary: {
    light: '#7099DB',
    default: '#27549D',
    darker: '#17325E',
    subtle: '#F7F9FD',
  },
  // Error (Red)
  error: {
    light: '#E49786',
    default: '#D15134',
    darker: '#812F1D',
    subtle: '#FAEDEA',
  },
  // Warning (Orange)
  warning: {
    light: '#F7C182',
    default: '#F29630',
    darker: '#A35C0A',
    subtle: '#FEF5EC',
  },
  // Grayscale
  grayscale: {
    title: '#1A1D23',
    body: '#323843',
    subtle: '#646F86',
    caption: '#848EA3',
    negative: '#F3F4F6',
    disabled: '#CDD1DA',
    border: {
      default: '#CDD1DA',
      disabled: '#E8EAEE',
      subtle: '#F3F4F6',
    },
    surface: {
      default: '#CDD1DA',
      disabled: '#E8EAEE',
      subtle: '#F3F4F6',
    },
  },
  // Border
  border: {
    primary: {
      light: '#7099DB',
      default: '#27549D',
      darker: '#17325E',
      subtle: '#DEE8F7',
    },
    error: {
      light: '#E49786',
      default: '#D15134',
      darker: '#812F1D',
      subtle: '#F6DBD5',
    },
    warning: {
      light: '#F7C182',
      default: '#F29630',
      darker: '#A35C0A',
      subtle: '#FCE9D4',
    },
  },
  // Surface
  surface: {
    primary: {
      default: '#27549D',
      lighter: '#7099DB',
      darker: '#17325E',
      subtle: '#F7F9FD',
    },
    error: {
      default: '#D15134',
      lighter: '#E49786',
      darker: '#812F1D',
      subtle: '#FAEDEA',
    },
    warning: {
      default: '#F29630',
      lighter: '#F7C182',
      darker: '#A35C0A',
      subtle: '#FEF5EC',
    },
  },
  // Text
  text: {
    primary: {
      label: '#17325E',
    },
    error: {
      label: '#812F1D',
    },
    warning: {
      label: '#A35C0A',
    },
    grayscale: {
      title: '#1A1D23',
      body: '#323843',
      subtle: '#646F86',
      caption: '#848EA3',
      negative: '#F3F4F6',
      disabled: '#CDD1DA',
    },
  },
};

const COST_COLORS: Record<string, string> = {
  Insurance:     colors.primary.default,      // #27549D blue
  Maintenance:   colors.support.orange,        // #F29630 orange
  Service:       colors.support.gray,          // #848EA3 gray
  MOT:           colors.support.green,         // #2EB844 green
  Tax:           colors.support.red,           // #D15134 red
  Fuel:          colors.primary.light,         // #7099DB light blue
  Repair:        colors.error.light,           // #E49786 salmon
  Rental:        colors.warning.darker,        // #A35C0A amber
  Congestion:    colors.grayscale.subtle,      // #646F86 slate
  "Dart Charge": colors.grayscale.body,        // #323843 dark slate
  Other:         colors.grayscale.caption,     // #848EA3 gray
};

// ─── Full HSBC Lease Data — ALL 38 leases ────────────────────────────────────
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
  {
    identifier: 'HSBC 13',
    type: 'Motor Vehicle',
    contractNumber: '301958',
    registrationDoc: 'YG71UXE',
    makeModel: 'Renault Trafic SL28 Energy',
    startDate: '15 November 2021',
    termMonths: '48',
    endDate: '15 November 2025',
    netCapital: '£25,588.00',
    capitalCost: '£62,071.20',
    arrangementFee: '£50.00',
    financeInterest: '£3,255.32',
    initialPayment: '£12,827.00',
    monthlyInstallment: '£1,093.74',
    finalPayment: '£0.00',
    totalRepayment: '£65,326.52',
    vehicles: [
      { registration: 'YG71UXE', model: 'Renault Trafic SL28 Energy', netCapital: '£25,588.00' },
      { registration: 'YK71ZTX', model: 'Renault Trafic SL28 Energy', netCapital: '£25,588.00' },
    ],
  },
  {
    identifier: 'HSBC 14',
    type: 'Motor Vehicle',
    contractNumber: '301330',
    registrationDoc: 'YC71GMY',
    makeModel: 'Renault Trafic 30 LWB',
    startDate: '27 October 2021',
    termMonths: '48',
    endDate: '27 October 2025',
    netCapital: '£27,218.00',
    capitalCost: '£162,528.00',
    arrangementFee: '£50.00',
    financeInterest: '£8,211.07',
    initialPayment: '£33,598.75',
    monthlyInstallment: '£2,857.09',
    finalPayment: '£0.00',
    totalRepayment: '£170,739.07',
    vehicles: [
      { registration: 'YC71GMY', model: 'Renault Trafic 30 LWB', netCapital: '£27,218.00' },
      { registration: 'YC71VRR', model: 'Renaullt Trafic LL30 Energy 145 Sport Nav', netCapital: '£25,928.00' },
      { registration: 'YC71HWR', model: 'Renault Trafic SL28 Energy', netCapital: '£27,218.00' },
      { registration: 'YC71USG', model: 'Renault Trafic LWB Sport Nav', netCapital: '£28,173.00' },
      { registration: 'YC71SNF', model: 'Renault Trafic LWB Sport Nav', netCapital: '£25,528.00' },
    ],
  },
  {
    identifier: 'HSBC 19',
    type: 'Motor Vehicle',
    contractNumber: '298466',
    registrationDoc: 'YC21MKD',
    makeModel: 'Renault Traffic Van',
    startDate: '02 July 2021',
    termMonths: '48',
    endDate: '02 July 2025',
    netCapital: '£22,500.00',
    capitalCost: '£109,320.00',
    arrangementFee: '£50.00',
    financeInterest: '£4,524.72',
    initialPayment: '£22,566.00',
    monthlyInstallment: '£1,901.64',
    finalPayment: '£0.00',
    totalRepayment: '£113,844.72',
    vehicles: [
      { registration: 'YC21MKD', model: 'Renault Traffic Van', netCapital: '£22,500.00' },
      { registration: 'YC21MKE', model: 'Renault Traffic Van', netCapital: '£22,500.00' },
      { registration: 'YC21 MKK', model: 'Renault Traffic Van', netCapital: '£22,500.00' },
      { registration: 'YC21NZN', model: 'Renault Traffic Van', netCapital: '£22,500.00' },
    ],
  },
  {
    identifier: 'HSBC 23',
    type: 'Motor Vehicle',
    contractNumber: '295547',
    registrationDoc: 'YB21WPN',
    makeModel: 'Renault Trafic SI28 DCi 145 Bus',
    startDate: '07 April 2021',
    termMonths: '48',
    endDate: '07 April 2025',
    netCapital: '£23,125.00',
    capitalCost: '£28,070.00',
    arrangementFee: '£50.00',
    financeInterest: '£1,135.73',
    initialPayment: '£5,781.25',
    monthlyInstallment: '£488.01',
    finalPayment: '£0.00',
    totalRepayment: '£29,205.73',
    vehicles: [
      { registration: 'YB21WPN', model: 'Renault Trafic SI28 DCi 145 Bus', netCapital: '£23,125.00' },
    ],
  },
  {
    identifier: 'HSBC 11',
    type: 'Equipment',
    contractNumber: '301740',
    registrationDoc: '-',
    makeModel: 'Roof Leak Detection Kits',
    startDate: '16 November 2021',
    termMonths: '36',
    endDate: '16 November 2024',
    netCapital: '£3,249.90',
    capitalCost: '£58,498.20',
    arrangementFee: '£50.00',
    financeInterest: '£2,408.46',
    initialPayment: '£12,187.13',
    monthlyInstallment: '£1,353.32',
    finalPayment: '£0.00',
    totalRepayment: '£60,906.65',
    vehicles: [
      { registration: 'Equipment', model: 'Roof Leak Detection Kits', netCapital: '£3,249.90' },
    ],
  },
  {
    identifier: 'HSBC 17',
    type: 'Equipment',
    contractNumber: '299558',
    registrationDoc: '-',
    makeModel: 'Air Moving & Drying Equipment',
    startDate: '15 October 2021',
    termMonths: '36',
    endDate: '15 October 2024',
    netCapital: '£33,918.84',
    capitalCost: '£40,702.61',
    arrangementFee: '£50.00',
    financeInterest: '£1,347.82',
    initialPayment: '£8,479.70',
    monthlyInstallment: '£932.52',
    finalPayment: '£0.00',
    totalRepayment: '£42,050.42',
    vehicles: [
      { registration: 'Equipment', model: 'Air Moving & Drying Equipment', netCapital: '£33,918.84' },
    ],
  },
  {
    identifier: 'HSBC 27',
    type: 'Motor Vehicle',
    contractNumber: '283425',
    registrationDoc: 'EO69FZT',
    makeModel: 'Audi e Tron',
    startDate: '25 September 2019',
    termMonths: '48',
    endDate: '25 September 2023',
    netCapital: '£62,037.50',
    capitalCost: '£74,500.00',
    arrangementFee: '£50.00',
    financeInterest: '£5,815.20',
    initialPayment: '£7,450.00',
    monthlyInstallment: '£1,052.40',
    finalPayment: '£22,350.00',
    totalRepayment: '£80,315.20',
    vehicles: [
      { registration: 'EO69FZT', model: 'Audi e Tron', netCapital: '£62,037.50' },
    ],
  },
  {
    identifier: 'HSBC 25',
    type: 'Equipment',
    contractNumber: '291576',
    registrationDoc: '-',
    makeModel: 'Leak Detection Equipment',
    startDate: '16 October 2020',
    termMonths: '36',
    endDate: '16 October 2023',
    netCapital: '£81,085.70',
    capitalCost: '£97,302.84',
    arrangementFee: '£50.00',
    financeInterest: '£3,036.87',
    initialPayment: '£24,325.71',
    monthlyInstallment: '£2,111.50',
    finalPayment: '£0.00',
    totalRepayment: '£100,339.71',
    vehicles: [
      { registration: 'Equipment', model: 'Leak Detection Equipment', netCapital: '£81,085.70' },
    ],
  },
  {
    identifier: 'HSBC 24',
    type: 'Equipment',
    contractNumber: '293477',
    registrationDoc: '-',
    makeModel: 'Leak Detection Equipment',
    startDate: '04 March 2021',
    termMonths: '36',
    endDate: '04 March 2024',
    netCapital: '£190,316.65',
    capitalCost: '£228,379.98',
    arrangementFee: '£150.00',
    financeInterest: '£7,020.50',
    initialPayment: '£57,095.00',
    monthlyInstallment: '£4,952.93',
    finalPayment: '£0.00',
    totalRepayment: '£235,400.48',
    vehicles: [
      { registration: 'Equipment', model: 'Leak Detection Equipment', netCapital: '£190,316.65' },
    ],
  },
  {
    identifier: 'HSBC 26',
    type: 'Motor Vehicle',
    contractNumber: '286738',
    registrationDoc: 'BN20W',
    makeModel: 'Nissan Navara Tekna DC190 Manual',
    startDate: '16 March 2020',
    termMonths: '48',
    endDate: '16 March 2024',
    netCapital: '£29,090.00',
    capitalCost: '£35,223.00',
    arrangementFee: '£50.00',
    financeInterest: '£1,648.80',
    initialPayment: '£8,727.00',
    monthlyInstallment: '£586.35',
    finalPayment: '£0.00',
    totalRepayment: '£36,871.80',
    vehicles: [
      { registration: 'BN20W', model: 'Nissan Navara Tekna DC190 Manual', netCapital: '£29,090.00' },
    ],
  },
  {
    identifier: 'HSBC 28',
    type: 'Motor Vehicle',
    contractNumber: '282958',
    registrationDoc: 'YC19EPT',
    makeModel: 'Renault Traffic Van',
    startDate: '25 September 2019',
    termMonths: '48',
    endDate: '25 September 2023',
    netCapital: '£18,780.00',
    capitalCost: '£114,255.00',
    arrangementFee: '£50.00',
    financeInterest: '£5,832.99',
    initialPayment: '£23,553.75',
    monthlyInstallment: '£2,011.13',
    finalPayment: '£0.00',
    totalRepayment: '£120,087.99',
    vehicles: [
      { registration: 'YC19EPT', model: 'Renault Traffic Van', netCapital: '£18,780.00' },
      { registration: 'YC19ERD', model: 'Renault Traffic Van', netCapital: '£18,780.00' },
      { registration: 'YC19ERF', model: 'Renault Traffic Van', netCapital: '£18,780.00' },
      { registration: 'YC19 ERR', model: 'Renault Traffic Van', netCapital: '£18,780.00' },
      { registration: 'YC19EPR', model: 'Renault Traffic Van', netCapital: '£18,780.00' },
    ],
  },
  {
    identifier: 'HSBC 29',
    type: 'Motor Vehicle',
    contractNumber: '282959',
    registrationDoc: 'YC19EMY',
    makeModel: 'Renault Traffic SL27 Dei 120',
    startDate: '01 March 2020',
    termMonths: '48',
    endDate: '01 March 2024',
    netCapital: '£18,780.00',
    capitalCost: '£114,255.00',
    arrangementFee: '£50.00',
    financeInterest: '£5,832.99',
    initialPayment: '£23,553.75',
    monthlyInstallment: '£2,011.13',
    finalPayment: '£0.00',
    totalRepayment: '£120,087.99',
    vehicles: [
      { registration: 'YC19EMY', model: 'Renault Traffic SL27 Dei 120', netCapital: '£18,780.00' },
      { registration: 'YC19EPB', model: 'Renault Traffic SL27 Dei 120', netCapital: '£18,780.00' },
      { registration: 'YC19ESP', model: 'Renault Traffic SL27 Dei 120', netCapital: '£18,780.00' },
      { registration: 'YC19ESR', model: 'Renault Traffic SL27 Dei 120', netCapital: '£18,780.00' },
      { registration: 'YC19ESS', model: 'Renault Traffic SL27 Dei 120', netCapital: '£18,780.00' },
    ],
  },
  {
    identifier: 'HSBC 30',
    type: 'Motor Vehicle',
    contractNumber: '282241',
    registrationDoc: 'YC19ENB',
    makeModel: 'Renault Traffic Sl27 120Dci',
    startDate: '01 March 2020',
    termMonths: '48',
    endDate: '01 March 2024',
    netCapital: '£18,780.00',
    capitalCost: '£114,255.00',
    arrangementFee: '£50.00',
    financeInterest: '£5,855.55',
    initialPayment: '£23,553.75',
    monthlyInstallment: '£2,011.60',
    finalPayment: '£0.00',
    totalRepayment: '£120,110.55',
    vehicles: [
      { registration: 'YC19ENB', model: 'Renault Traffic Sl27 120Dci', netCapital: '£18,780.00' },
      { registration: 'YC19EPH', model: 'Renault Traffic Sl27 120Dci', netCapital: '£18,780.00' },
      { registration: 'YC19ESK', model: 'Renault Traffic Sl27 120Dci', netCapital: '£18,780.00' },
      { registration: 'YC19EST', model: 'Renault Traffic Sl27 120Dci', netCapital: '£18,780.00' },
      { registration: 'YC19ESZ', model: 'Renault Traffic Sl27 120Dci', netCapital: '£18,780.00' },
    ],
  },
  {
    identifier: 'HSBC 21',
    type: 'Motor Vehicle',
    contractNumber: '297339',
    registrationDoc: 'YC21NZK',
    makeModel: 'Renault Energy 120 Dei Van',
    startDate: '25 May 2021',
    termMonths: '48',
    endDate: '25 May 2025',
    netCapital: '£22,375.00',
    capitalCost: '£108,720.00',
    arrangementFee: '£50.00',
    financeInterest: '£4,431.40',
    initialPayment: '£22,441.00',
    monthlyInstallment: '£1,889.80',
    finalPayment: '£0.00',
    totalRepayment: '£113,151.40',
    vehicles: [
      { registration: 'YC21NZK', model: 'Renault Energy 120 Dei Van', netCapital: '£22,375.00' },
      { registration: 'YC210CH', model: 'Renault Energy 120 Dei Van', netCapital: '£22,375.00' },
      { registration: 'YC210CJ', model: 'Renault Energy 120 Dei Van', netCapital: '£22,375.00' },
      { registration: 'YC210CF', model: 'Renault Energy 120 Dei Van', netCapital: '£22,375.00' },
    ],
  },
  {
    identifier: 'HSBC 31',
    type: 'Motor Vehicle',
    contractNumber: '333520',
    registrationDoc: 'YC74ZPK',
    makeModel: 'RENAULT TRAFIC CREW DCI ADVANCE',
    startDate: '12 November 2024',
    termMonths: '48',
    endDate: '11 November 2028',
    netCapital: '£33,390.00',
    capitalCost: '£40,458.00',
    arrangementFee: '£300.00',
    financeInterest: '£9,110.64',
    initialPayment: '£20,034.00',
    monthlyInstallment: '£1,458.18',
    finalPayment: '£0.00',
    totalRepayment: '£90,026.64',
    vehicles: [
      { registration: 'YC74ZPK', model: 'RENAULT TRAFIC CREW DCI ADVANCE', netCapital: '£33,390.00' },
      { registration: 'YG74ZJZ', model: 'RENAULT TRAFIC CREW DCI ADVANCE', netCapital: '£33,390.00' },
    ],
  },
  {
    identifier: 'HSBC 32',
    type: 'Motor Vehicle',
    contractNumber: '333953',
    registrationDoc: 'YC74XAS',
    makeModel: 'RENAULT TRAFIC SL 30 BLUE DCI 130 ADVANCE',
    startDate: '28 November 2024',
    termMonths: '48',
    endDate: '27 November 2028',
    netCapital: '£29,310.00',
    capitalCost: '£35,562.00',
    arrangementFee: '£200.00',
    financeInterest: '£16,013.28',
    initialPayment: '£35,172.00',
    monthlyInstallment: '£2,564.36',
    finalPayment: '£0.00',
    totalRepayment: '£158,261.28',
    vehicles: [
      { registration: 'YC74XAS', model: 'RENAULT TRAFIC SL 30 BLUE DCI 130 ADVANCE', netCapital: '£29,310.00' },
      { registration: 'YC74XDF', model: 'RENAULT TRAFIC SL 30 BLUE DCI 130 ADVANCE', netCapital: '£29,310.00' },
      { registration: 'YC74XMJ', model: 'RENAULT TRAFIC SL 30 BLUE DCI 130 ADVANCE', netCapital: '£29,310.00' },
      { registration: 'YC74XMH', model: 'RENAULT TRAFIC SL 30 BLUE DCI 130 ADVANCE', netCapital: '£29,310.00' },
    ],
  },
  {
    identifier: 'HSBC 33',
    type: 'Motor Vehicle',
    contractNumber: '334237',
    registrationDoc: 'YB24UVD',
    makeModel: 'CITROEN RELAY 62 H2',
    startDate: '05 December 2024',
    termMonths: '48',
    endDate: '04 December 2028',
    netCapital: '£40,645.00',
    capitalCost: '£49,164.00',
    arrangementFee: '£250.00',
    financeInterest: '£21,882.48',
    initialPayment: '£50,334.00',
    monthlyInstallment: '£3,504.26',
    finalPayment: '£0.00',
    totalRepayment: '£218,538.48',
    vehicles: [
      { registration: 'YB24UVD', model: 'CITROEN RELAY 62 H2', netCapital: '£40,645.00' },
      { registration: 'YB24UWV', model: 'CITROEN RELAY 62 H2', netCapital: '£40,645.00' },
      { registration: 'YB24UTN', model: 'CITROEN RELAY 62 H2', netCapital: '£40,645.00' },
      { registration: 'YB24UVG', model: 'CITROEN RELAY 62 H2', netCapital: '£40,645.00' },
    ],
  },
  {
    identifier: 'HSBC 34',
    type: 'Motor Vehicle',
    contractNumber: '335424',
    registrationDoc: 'MA74WXK',
    makeModel: 'RENAULT TRAFFIC LL30 EXTRA 150 EDC',
    startDate: '07 March 2025',
    termMonths: '48',
    endDate: '06 March 2029',
    netCapital: '£37,500.00',
    capitalCost: '£45,390.00',
    arrangementFee: '£0.00',
    financeInterest: '£5,083.20',
    initialPayment: '£11,250.00',
    monthlyInstallment: '£817.15',
    finalPayment: '£0.00',
    totalRepayment: '£50,473.20',
    vehicles: [
      { registration: 'MA74WXK', model: 'RENAULT TRAFFIC LL30 EXTRA 150 EDC', netCapital: '£37,500.00' },
    ],
  },
  {
    identifier: 'HSBC 35',
    type: 'Equipment',
    contractNumber: '333959',
    registrationDoc: '-',
    makeModel: 'Variotec 460 - Tracer gas kit x14; Aquaphone A200x6, etc',
    startDate: '17 February 2025',
    termMonths: '48',
    endDate: '16 March 2029',
    netCapital: '£135,346.00',
    capitalCost: '£162,415.20',
    arrangementFee: '£200.00',
    financeInterest: '£20,686.20',
    initialPayment: '£40,603.80',
    monthlyInstallment: '£2,968.70',
    finalPayment: '£0.00',
    totalRepayment: '£183,101.40',
    vehicles: [
      { registration: 'Equipment', model: 'Variotec 460 Tracer gas kit x14', netCapital: '£135,346.00' },
    ],
  },
  {
    identifier: 'HSBC 36',
    type: 'Motor Vehicle',
    contractNumber: '338638',
    registrationDoc: 'BF25XBN',
    makeModel: 'NISSAN TOWN ICE L1 ACE BEN MY24.5',
    startDate: '01 May 2025',
    termMonths: '48',
    endDate: '30 April 2029',
    netCapital: '£21,510.00',
    capitalCost: '£26,212.00',
    arrangementFee: '£250.00',
    financeInterest: '£11,096.96',
    initialPayment: '£25,812.00',
    monthlyInstallment: '£1,877.77',
    finalPayment: '£0.00',
    totalRepayment: '£115,944.96',
    vehicles: [
      { registration: 'BF25XBN', model: 'NISSAN TOWN ICE L1 ACE BEN MY24.5', netCapital: '£21,510.00' },
      { registration: 'BF25XBP', model: 'NISSAN TOWN ICE L1 ACE BEN MY24.5', netCapital: '£21,510.00' },
      { registration: 'BF25XBS', model: 'NISSAN TOWN ICE L1 ACE BEN MY24.5', netCapital: '£21,510.00' },
      { registration: 'BF25XBW', model: 'NISSAN TOWN ICE L1 ACE BEN MY24.5', netCapital: '£21,510.00' },
    ],
  },
  {
    identifier: 'HSBC 37',
    type: 'Motor Vehicle',
    contractNumber: '338789',
    registrationDoc: 'YA74OSO',
    makeModel: 'TRAFIC LI30 BLUE DCI 130 ADVANCE',
    startDate: '07 May 2025',
    termMonths: '48',
    endDate: '06 May 2029',
    netCapital: '£43,415.00',
    capitalCost: '£52,488.00',
    arrangementFee: '£300.00',
    financeInterest: '£36,904.32',
    initialPayment: '£86,520.00',
    monthlyInstallment: '£6,241.34',
    finalPayment: '£0.00',
    totalRepayment: '£386,104.32',
    vehicles: [
      { registration: 'YA74OSO', model: 'TRAFIC LI30 BLUE DCI 130 ADVANCE', netCapital: '£43,415.00' },
      { registration: 'YA74XGR', model: 'TRAFIC LI30 BLUE DCI 130 ADVANCE', netCapital: '£43,415.00' },
      { registration: 'YAB74SNU', model: 'TRAFIC LI30 BLUE DCI 130 ADVANCE', netCapital: '£33,595.00' },
      { registration: 'YB74SWW', model: 'TRAFIC LI30 BLUE DCI 130 ADVANCE', netCapital: '£33,595.00' },
      { registration: 'YG74UAB', model: 'TRAFIC LI30 BLUE DCI 130 ADVANCE', netCapital: '£33,595.00' },
      { registration: 'YB74STX', model: 'TRAFIC LI30 BLUE DCI 130 ADVANCE', netCapital: '£33,595.00' },
      { registration: 'YB74SWZ', model: 'TRAFIC LI30 BLUE DCI 130 ADVANCE', netCapital: '£33,595.00' },
      { registration: 'YB74XHM', model: 'TRAFIC LI30 BLUE DCI 130 ADVANCE', netCapital: '£33,595.00' },
    ],
  },
  {
    identifier: 'HSBC 38',
    type: 'Motor Vehicle',
    contractNumber: '340004',
    registrationDoc: 'KR25GXN',
    makeModel: 'RENAULY TRAFFIC LL30 BLUE DCI 130 ADVANCE',
    startDate: '12 June 2025',
    termMonths: '48',
    endDate: '11 June 2029',
    netCapital: '£31,665.00',
    capitalCost: '£38,398.00',
    arrangementFee: '£250.00',
    financeInterest: '£16,323.44',
    initialPayment: '£37,998.00',
    monthlyInstallment: '£2,748.28',
    finalPayment: '£0.00',
    totalRepayment: '£169,915.44',
    vehicles: [
      { registration: 'KR25GXN', model: 'RENAULY TRAFFIC LL30 BLUE DCI 130 ADVANCE', netCapital: '£31,665.00' },
      { registration: 'KR25LDJ', model: 'RENAULY TRAFFIC LL30 BLUE DCI 130 ADVANCE', netCapital: '£31,665.00' },
      { registration: 'KR25GCZ', model: 'RENAULY TRAFFIC LL30 BLUE DCI 130 ADVANCE', netCapital: '£31,665.00' },
      { registration: 'KR25GLJ', model: 'RENAULY TRAFFIC LL30 BLUE DCI 130 ADVANCE', netCapital: '£31,665.00' },
    ],
  },
];

// ─── HSBC Leases Tab ──────────────────────────────────────────────────────────
function HSBCLeasesTab() {
  const [expandedLease, setExpandedLease] = useState<string | null>(null);

  const totalCapital = leaseData.reduce((sum, l) => {
    const n = parseFloat(l.capitalCost.replace(/£|,/g, ''));
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const totalVehicles = leaseData.reduce((s, l) => s + l.vehicles.length, 0);

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Leases', value: leaseData.length, color: colors.primary.default },
          { label: 'Total Vehicles', value: totalVehicles, color: colors.support.green },
          { label: 'Total Capital Cost', value: `£${(totalCapital / 1000).toFixed(0)}K`, color: colors.support.orange },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', padding: '20px', borderRadius: '10px', border: `1px solid ${colors.grayscale.border.default}` }}>
            <p style={{ fontSize: '12px', color: colors.grayscale.subtle, marginBottom: '6px', fontFamily: 'MontRegular' }}>{s.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: s.color, fontFamily: 'MontBold' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${colors.grayscale.border.default}` }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: colors.primary.subtle, borderBottom: `2px solid ${colors.grayscale.border.default}` }}>
                {['Identifier', 'Type', 'Contract', 'Agreement Dates', 'Capital Cost', 'Monthly', 'Total Repayment', 'Vehicles', ''].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: (h === 'Capital Cost' || h === 'Monthly' || h === 'Total Repayment') ? 'right' : (h === 'Vehicles' || h === '') ? 'center' : 'left',
                    color: colors.primary.default,
                    fontWeight: '600',
                    fontSize: '13px',
                    fontFamily: 'MontSemiBold',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaseData.map(lease => (
                <React.Fragment key={lease.identifier}>
                  <tr
                    onClick={() => setExpandedLease(expandedLease === lease.identifier ? null : lease.identifier)}
                    style={{
                      borderBottom: `1px solid ${colors.grayscale.border.default}`,
                      background: expandedLease === lease.identifier ? colors.primary.subtle : 'white',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (expandedLease !== lease.identifier) (e.currentTarget as HTMLTableRowElement).style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (expandedLease !== lease.identifier) (e.currentTarget as HTMLTableRowElement).style.background = 'white'; }}
                  >
                    <td style={{ padding: '12px 16px', color: colors.grayscale.title, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold', whiteSpace: 'nowrap' }}>{lease.identifier}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span style={{
                        background: lease.type === 'Equipment' ? colors.warning.subtle : colors.primary.subtle,
                        color: lease.type === 'Equipment' ? colors.warning.darker : colors.primary.darker,
                        padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
                      }}>{lease.type}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>{lease.contractNumber}</td>
                    <td style={{ padding: '12px 16px', color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular', whiteSpace: 'nowrap' }}>{lease.startDate} → {lease.endDate}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.primary.default, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold', whiteSpace: 'nowrap' }}>{lease.capitalCost}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular', whiteSpace: 'nowrap' }}>{lease.monthlyInstallment}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.support.green, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold', whiteSpace: 'nowrap' }}>{lease.totalRepayment}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ background: colors.primary.default, color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>{lease.vehicles.length}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: colors.primary.default }}>
                      {expandedLease === lease.identifier ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </td>
                  </tr>

                  {expandedLease === lease.identifier && (
                    <tr style={{ background: colors.primary.subtle, borderBottom: `1px solid ${colors.grayscale.border.default}` }}>
                      <td colSpan={9} style={{ padding: '24px 16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.grayscale.title, marginBottom: '16px', fontFamily: 'MontSemiBold' }}>Cost Breakdown</h3>
                            {[
                              ['Arrangement Fee', lease.arrangementFee],
                              ['Finance Interest', lease.financeInterest],
                              ['Initial Payment', lease.initialPayment],
                              ['Monthly Installment', lease.monthlyInstallment],
                              ['Final Payment', lease.finalPayment],
                              ['Total Repayment', lease.totalRepayment],
                            ].map(([label, value]) => (
                              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${colors.grayscale.border.default}` }}>
                                <span style={{ color: colors.grayscale.body, fontSize: '13px', fontFamily: 'MontRegular' }}>{label}:</span>
                                <span style={{ color: colors.grayscale.title, fontWeight: '600', fontSize: '13px', fontFamily: 'MontSemiBold' }}>{value}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: colors.grayscale.title, marginBottom: '16px', fontFamily: 'MontSemiBold' }}>Vehicles ({lease.vehicles.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {lease.vehicles.map((vehicle, idx) => (
                                <div key={idx} style={{ background: 'white', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${colors.grayscale.border.default}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ color: colors.grayscale.title, fontWeight: '600', fontSize: '12px', fontFamily: 'MontSemiBold', marginBottom: '2px' }}>{vehicle.registration}</p>
                                    <p style={{ color: colors.grayscale.subtle, fontSize: '12px', fontFamily: 'MontRegular' }}>{vehicle.model}</p>
                                  </div>
                                  <p style={{ color: colors.primary.default, fontWeight: '600', fontSize: '12px', fontFamily: 'MontSemiBold', whiteSpace: 'nowrap' }}>{vehicle.netCapital}</p>
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

      {/* Bottom summary stats */}
      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: `1px solid ${colors.grayscale.border.default}` }}>
          <p style={{ fontSize: '12px', color: colors.grayscale.subtle, marginBottom: '8px', fontFamily: 'MontRegular' }}>Total Leases</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: colors.primary.default, fontFamily: 'MontBold' }}>{leaseData.length}</p>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: `1px solid ${colors.grayscale.border.default}` }}>
          <p style={{ fontSize: '12px', color: colors.grayscale.subtle, marginBottom: '8px', fontFamily: 'MontRegular' }}>Total Vehicles</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: colors.primary.default, fontFamily: 'MontBold' }}>
            {leaseData.reduce((sum, l) => sum + l.vehicles.length, 0)}
          </p>
        </div>
        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: `1px solid ${colors.grayscale.border.default}` }}>
          <p style={{ fontSize: '12px', color: colors.grayscale.subtle, marginBottom: '8px', fontFamily: 'MontRegular' }}>Total Capital Cost</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: colors.support.green, fontFamily: 'MontBold' }}>
            £{(leaseData.reduce((sum, l) => {
              const n = parseFloat(l.capitalCost.replace(/£|,/g, ''));
              return sum + (isNaN(n) ? 0 : n);
            }, 0) / 1000).toFixed(0)}K
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Service Payment Tab ──────────────────────────────────────────────────────
function ServicePaymentTab() {
  const [vehicles, setVehicles] = useState<VehicleCost[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const base = API_BASE_URL || '';
        const res = await fetch(`${base}/api/cost/all-vehicles`);
        if (!res.ok) throw new Error('Failed to fetch vehicle costs');
        const data = await res.json();
        setVehicles(data.vehicles || []);
        setSummary(data.summary || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const avgCost = summary?.average_vehicle_cost ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = [...vehicles].sort((a, b) => b.total_cost - a.total_cost);
    if (!q) return base;
    return base.filter(v =>
      v.van_number?.toLowerCase().includes(q) ||
      v.registration?.toLowerCase().includes(q) ||
      v.name?.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  const getCostColor = (type: string) => COST_COLORS[type] || '#848EA3';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px', flexDirection: 'column', gap: '16px' }}>
        <Loader size={40} className="animate-spin" style={{ color: colors.primary.default }} />
        <p style={{ color: colors.grayscale.subtle, fontFamily: 'MontRegular' }}>Loading service payment data...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '8px', background: colors.error.subtle, borderLeft: `4px solid ${colors.error.default}`, display: 'flex', gap: '12px' }}>
          <AlertCircle size={20} style={{ color: colors.error.default, flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ color: colors.error.darker, fontWeight: 600, fontFamily: 'MontBold', marginBottom: '4px' }}>Error</p>
            <p style={{ color: colors.error.default, fontFamily: 'MontRegular' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Summary Stats - Premium Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Fleet Cost', value: `£${summary.total_fleet_cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`, color: colors.primary.default },
            { label: 'Avg Vehicle Cost', value: `£${summary.average_vehicle_cost.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`, color: colors.support.orange },
            { label: 'Total Vehicles', value: summary.vehicle_count, color: colors.support.green },
            { label: 'Vehicles with Costs', value: summary.vehicles_with_costs, color: colors.primary.light },
          ].map(s => (
            <div 
              key={s.label} 
              style={{ 
                background: 'white', 
                padding: '18px', 
                borderRadius: '8px', 
                border: `1.5px solid ${s.color}15`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                el.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                el.style.transform = 'translateY(0)';
              }}
            >
              <p style={{ fontSize: '11px', color: colors.grayscale.subtle, marginBottom: '8px', fontFamily: 'MontRegular', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</p>
              <p style={{ fontSize: '26px', fontWeight: 'bold', color: s.color, fontFamily: 'MontBold', lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search Box - Premium Style */}
      <div style={{ marginBottom: '20px', position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: colors.grayscale.caption, pointerEvents: 'none' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by van number, registration or name…"
          style={{
            width: '100%',
            padding: '12px 40px 12px 42px',
            borderRadius: '8px',
            border: `1.5px solid ${search ? colors.primary.default : colors.grayscale.border.default}`,
            fontSize: '14px',
            fontFamily: 'MontRegular',
            color: colors.grayscale.title,
            background: 'white',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.2s',
            boxShadow: search ? `0 2px 8px ${colors.primary.default}15` : 'none',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: colors.grayscale.caption, display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search result summary banner */}
      {search && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', background: colors.primary.subtle, borderRadius: '6px', border: `1.5px solid ${colors.border.primary.subtle}` }}>
          <p style={{ color: colors.primary.darker, fontSize: '13px', fontFamily: 'MontSemiBold' }}>
            {filtered.length > 0
              ? `${filtered.length} vehicle${filtered.length > 1 ? 's' : ''} found • Total service cost: £${filtered.reduce((s, v) => s + v.total_cost, 0).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`
              : `No vehicles match "${search}"`}
          </p>
        </div>
      )}

      {/* Vehicle Cards - Premium Style */}
      <Card style={{ backgroundColor: 'white', borderColor: `${colors.primary.default}18`, borderWidth: '1.5px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: '12px' }}>
        <CardHeader style={{ borderBottomWidth: '1px', borderBottomColor: colors.grayscale.border.default, paddingBottom: '16px' }}>
          <CardTitle style={{ color: colors.primary.default, fontFamily: 'MontBold', fontSize: '18px', fontWeight: '700' }}>
            Per-Vehicle Service & Maintenance Cost
            {search && <span style={{ color: colors.grayscale.subtle, fontWeight: 400, fontSize: '14px', marginLeft: '8px' }}>({filtered.length} results)</span>}
          </CardTitle>
          <p style={{ fontSize: '12px', color: colors.grayscale.subtle, margin: '6px 0 0', fontFamily: 'MontRegular' }}>Ranked by Expense</p>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filtered.map((vehicle, idx) => {
                const costAboveAvg = vehicle.total_cost > avgCost;
                const pctAbove = avgCost > 0 ? ((vehicle.total_cost - avgCost) / avgCost * 100).toFixed(0) : 0;
                return (
                  <div
                    key={vehicle.vehicle_id}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: `1px solid ${costAboveAvg ? `${colors.error.default}25` : `${colors.primary.default}15`}`,
                      background: costAboveAvg ? `${colors.error.subtle}` : colors.primary.subtle,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      el.style.borderColor = costAboveAvg ? colors.error.default : colors.primary.default;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.boxShadow = 'none';
                      el.style.borderColor = costAboveAvg ? `${colors.error.default}25` : `${colors.primary.default}15`;
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <p style={{ fontWeight: '700', fontSize: '16px', color: colors.grayscale.title, fontFamily: 'MontBold' }}>
                            {idx + 1}. {vehicle.name || vehicle.van_number}
                          </p>
                          {costAboveAvg && (
                            <span style={{ background: colors.error.default, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>
                              EXPENSIVE (+{pctAbove}%)
                            </span>
                          )}
                        </div>
                        <p style={{ color: colors.grayscale.subtle, fontSize: '12px', marginTop: '2px', fontFamily: 'MontRegular' }}>
                          {vehicle.van_number} • {vehicle.registration} • {vehicle.vehicle_type}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: '22px', fontWeight: 'bold', color: costAboveAvg ? colors.error.default : colors.primary.default, fontFamily: 'MontBold' }}>
                          £{vehicle.total_cost.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
                        </p>
                        <p style={{ color: colors.grayscale.subtle, fontSize: '11px', fontFamily: 'MontRegular' }}>£{vehicle.monthly_average}/month</p>
                      </div>
                    </div>

                    {Object.keys(vehicle.cost_breakdown).length > 0 ? (
                      <div style={{ marginTop: '12px' }}>
                        <p style={{ color: colors.grayscale.subtle, fontSize: '11px', marginBottom: '10px', fontWeight: '600', fontFamily: 'MontSemiBold', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Cost Breakdown</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {Object.entries(vehicle.cost_breakdown)
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, amount]) => {
                              const pct = vehicle.total_cost > 0 ? (amount / vehicle.total_cost * 100).toFixed(1) : '0';
                              return (
                                <div key={type}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: colors.grayscale.body, fontSize: '13px', fontWeight: '500', fontFamily: 'MontRegular' }}>{type}</span>
                                    <span style={{ color: colors.primary.default, fontSize: '13px', fontWeight: '700', fontFamily: 'MontBold' }}>
                                      £{amount.toLocaleString('en-GB', { maximumFractionDigits: 2 })} ({pct}%)
                                    </span>
                                  </div>
                                  <div style={{ height: '6px', background: `${colors.grayscale.disabled}`, borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, background: getCostColor(type), borderRadius: '3px', transition: 'width 0.4s ease' }} />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <p style={{ color: colors.grayscale.caption, fontSize: '12px', marginTop: '8px', fontFamily: 'MontRegular' }}>No cost breakdown data available</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Search size={40} style={{ color: colors.grayscale.disabled, margin: '0 auto 16px' }} />
              <p style={{ color: colors.grayscale.subtle, fontSize: '15px', fontFamily: 'MontRegular' }}>
                {search ? `No vehicles found matching "${search}"` : 'No vehicle cost data available'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
type Tab = 'hsbc' | 'service';

export default function VehicleCostSimple() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('service');

  return (
    <div style={{ minHeight: '100vh', background: colors.grayscale.negative }}>

      {/* ── Hero Header Banner (Compact & Premium) ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '120px',
          backgroundImage: `url('/profile_header.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          overflow: 'hidden',
        }}
      >
        {/* Premium dark overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${colors.primary.darker} 0%, ${colors.primary.default} 60%, rgba(0,0,0,0.5) 100%)`,
          }}
        />

        {/* Content inside banner */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 24px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Premium Logo Container */}
          <div
            style={{
              flexShrink: 0,
              background: 'rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '8px 12px',
              backdropFilter: 'blur(8px)',
              border: `1px solid rgba(255,255,255,0.2)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/aspect-logo-icon.svg"
              alt="ASPECT"
              style={{
                height: '40px',
                width: 'auto',
                display: 'block',
              }}
            />
          </div>

          {/* Divider - slimmer */}
          <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />

          {/* Title block */}
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontFamily: 'MontBold',
                fontWeight: 'bold',
                color: '#ffffff',
                margin: 0,
                letterSpacing: '-0.2px',
                lineHeight: 1.1,
              }}
            >
              Vehicle Cost Analysis
            </h1>
            <p
              style={{
                fontSize: '12px',
                fontFamily: 'MontRegular',
                color: 'rgba(255,255,255,0.8)',
                margin: '4px 0 0',
              }}
            >
              HSBC lease register and service & maintenance cost breakdown
            </p>
          </div>
        </div>
      </div>
      {/* ── End Hero Header ────────────────────────────────────────────────── */}

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px' }}>

        {/* Tab Buttons - Premium Style */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: `2px solid ${colors.grayscale.border.default}` }}>
          {([
            { key: 'service' as Tab, label: '🔧 Service & Maintenance' },
            { key: 'hsbc' as Tab, label: '🏦 HSBC Leases' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                borderRadius: '0',
                border: 'none',
                borderBottom: activeTab === tab.key ? `3px solid ${colors.primary.default}` : '3px solid transparent',
                background: 'transparent',
                color: activeTab === tab.key ? colors.primary.default : colors.grayscale.subtle,
                fontWeight: activeTab === tab.key ? '700' : '600',
                fontSize: '14px',
                fontFamily: 'MontSemiBold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '-2px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'hsbc' ? <HSBCLeasesTab /> : <ServicePaymentTab />}
      </div>
    </div>
  );
}