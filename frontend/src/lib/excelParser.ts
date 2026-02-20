import * as XLSX from 'xlsx';

export interface VehicleRecord {
  vanNumber: string;
  regNo: string;
  status: string;
  vehicleType: string;
  tradeGroup: string;
  motDueDate?: Date;
  serviceCost: number;
  maintenanceCost: number;
  taxCost: number;
  ulezCost: number;
  congestionCost: number;
  dartChargeCost: number;
  motCost: number;
  insuranceCost: number;
  rentingBuyingCost: number;
  otherPayments: number;
  transmission?: string;
  vehicleOwnership?: string;
  registrationDate?: Date;
}

export interface ParsedFleetData {
  vehicles: VehicleRecord[];
  statusCounts: Record<string, number>;
  tradeGroupCounts: Record<string, number>;
  vehicleTypeCounts: Record<string, Record<string, number>>;
  motDueIn30Days: number;
  totalVehicles: number;
  allocatedVehicles: number;
  spareVehicles: number;
  garageVehicles: number;
  writtenOffVehicles: number;
  reservedVehicles: number;
}

const parseGBP = (value: string | number | undefined): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const cleaned = value.toString().replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
};

const parseDate = (value: string | number | Date | undefined): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  
  // Handle Excel date serial numbers
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }
  
  // Handle string dates in various formats
  const dateStr = value.toString();
  
  // Try DD/MM/YYYY format
  const ddmmyyyy = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyy) {
    return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
  }
  
  // Try ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;
  
  return undefined;
};

const normalizeColumnName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
};

const findColumn = (headers: string[], ...searchTerms: string[]): number => {
  for (const term of searchTerms) {
    const normalizedTerm = normalizeColumnName(term);
    const index = headers.findIndex(h => normalizeColumnName(h).includes(normalizedTerm));
    if (index !== -1) return index;
  }
  return -1;
};

export const parseExcelFile = async (file: File): Promise<ParsedFleetData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get raw data as array of arrays
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
        
        // Find the header row (look for rows with expected column names)
        let headerRowIndex = -1;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
          const row = rawData[i];
          if (!row) continue;
          
          const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
          if (rowStr.includes('status') || rowStr.includes('van number') || rowStr.includes('reg no') || rowStr.includes('vehicle type')) {
            headerRowIndex = i;
            headers = row.map(c => String(c || ''));
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          // Fallback: use first non-empty row as headers
          for (let i = 0; i < rawData.length; i++) {
            if (rawData[i] && rawData[i].length > 3) {
              headerRowIndex = i;
              headers = rawData[i].map(c => String(c || ''));
              break;
            }
          }
        }
        
        // Find column indices
        const colIndices = {
          vanNumber: findColumn(headers, 'Van Number', 'VAN', 'VEH'),
          regNo: findColumn(headers, 'Reg No', 'Registration', 'Reg'),
          status: findColumn(headers, 'Status'),
          vehicleType: findColumn(headers, 'Vehicle Type', 'VehicleType'),
          tradeGroup: findColumn(headers, 'Trade Group', 'TradeGroup'),
          motDueDate: findColumn(headers, 'MOT Due', 'MOTDue', 'MOT'),
          serviceCost: findColumn(headers, 'Service Cost', 'ServiceCost'),
          maintenanceCost: findColumn(headers, 'Maintenance Cost', 'MaintenanceCost'),
          taxCost: findColumn(headers, 'Tax Cost', 'TaxCost'),
          ulezCost: findColumn(headers, 'ULEZ Cost', 'ULEZCost'),
          congestionCost: findColumn(headers, 'Congestion Cost', 'CongestionCost'),
          dartChargeCost: findColumn(headers, 'Dart Charge Cost', 'DartChargeCost'),
          motCost: findColumn(headers, 'MOT Cost', 'MOTCost'),
          insuranceCost: findColumn(headers, 'Insurance Cost', 'InsuranceCost'),
          rentingBuyingCost: findColumn(headers, 'Renting/Buying Cost', 'RentingBuyingCost'),
          otherPayments: findColumn(headers, 'Other Payments', 'OtherPayments'),
          transmission: findColumn(headers, 'Transmission'),
          vehicleOwnership: findColumn(headers, 'Vehicle Ownership', 'VehicleOwnership'),
          registrationDate: findColumn(headers, 'Registration Date', 'RegistrationDate'),
        };
        
        // Parse data rows
        const vehicles: VehicleRecord[] = [];
        const statusCounts: Record<string, number> = {};
        const tradeGroupCounts: Record<string, number> = {};
        const vehicleTypeCounts: Record<string, Record<string, number>> = {};
        
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        let motDueIn30Days = 0;
        
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          // Skip subtotal/summary rows
          const firstCell = String(row[0] || '').toLowerCase();
          if (firstCell.includes('subtotal') || firstCell.includes('total') || firstCell.includes('count') || firstCell.includes('sum')) {
            continue;
          }
          
          const getValue = (index: number): string => {
            if (index === -1 || !row[index]) return '';
            return String(row[index]).trim();
          };
          
          const regNo = getValue(colIndices.regNo);
          const vanNumber = getValue(colIndices.vanNumber);
          
          // Skip rows without registration number and van number
          if (!regNo && !vanNumber) continue;
          
          const status = getValue(colIndices.status) || 'Unknown';
          const vehicleType = getValue(colIndices.vehicleType) || 'Unknown';
          const tradeGroup = getValue(colIndices.tradeGroup) || 'Unassigned';
          
          // Skip Written Off and Sold from active counts
          if (status.toLowerCase().includes('written off') || status.toLowerCase().includes('sold')) {
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            continue;
          }
          
          const motDueDate = colIndices.motDueDate !== -1 ? parseDate(row[colIndices.motDueDate]) : undefined;
          
          // Check MOT due in 30 days
          if (motDueDate && motDueDate >= now && motDueDate <= thirtyDaysFromNow) {
            motDueIn30Days++;
          }
          
          const vehicle: VehicleRecord = {
            vanNumber,
            regNo,
            status,
            vehicleType,
            tradeGroup,
            motDueDate,
            serviceCost: parseGBP(row[colIndices.serviceCost]),
            maintenanceCost: parseGBP(row[colIndices.maintenanceCost]),
            taxCost: parseGBP(row[colIndices.taxCost]),
            ulezCost: parseGBP(row[colIndices.ulezCost]),
            congestionCost: parseGBP(row[colIndices.congestionCost]),
            dartChargeCost: parseGBP(row[colIndices.dartChargeCost]),
            motCost: parseGBP(row[colIndices.motCost]),
            insuranceCost: parseGBP(row[colIndices.insuranceCost]),
            rentingBuyingCost: parseGBP(row[colIndices.rentingBuyingCost]),
            otherPayments: parseGBP(row[colIndices.otherPayments]),
            transmission: getValue(colIndices.transmission),
            vehicleOwnership: getValue(colIndices.vehicleOwnership),
            registrationDate: colIndices.registrationDate !== -1 ? parseDate(row[colIndices.registrationDate]) : undefined,
          };
          
          vehicles.push(vehicle);
          
          // Count by status
          statusCounts[status] = (statusCounts[status] || 0) + 1;
          
          // Count by trade group
          if (tradeGroup && tradeGroup !== 'Unknown') {
            tradeGroupCounts[tradeGroup] = (tradeGroupCounts[tradeGroup] || 0) + 1;
          }
          
          // Count by vehicle type and status
          if (vehicleType && vehicleType !== 'Unknown') {
            if (!vehicleTypeCounts[vehicleType]) {
              vehicleTypeCounts[vehicleType] = { allocated: 0, spare: 0, garage: 0, reserved: 0 };
            }
            const normalizedStatus = status.toLowerCase();
            if (normalizedStatus.includes('allocated')) {
              vehicleTypeCounts[vehicleType].allocated++;
            } else if (normalizedStatus.includes('spare') || normalizedStatus.includes('available')) {
              vehicleTypeCounts[vehicleType].spare++;
            } else if (normalizedStatus.includes('garage') || normalizedStatus.includes('repair')) {
              vehicleTypeCounts[vehicleType].garage++;
            } else if (normalizedStatus.includes('reserved')) {
              vehicleTypeCounts[vehicleType].reserved++;
            } else {
              vehicleTypeCounts[vehicleType].allocated++;
            }
          }
        }
        
        // Calculate summary counts
        const allocatedVehicles = Object.entries(statusCounts)
          .filter(([status]) => status.toLowerCase().includes('allocated'))
          .reduce((sum, [, count]) => sum + count, 0);
          
        const spareVehicles = Object.entries(statusCounts)
          .filter(([status]) => status.toLowerCase().includes('spare') || status.toLowerCase().includes('available'))
          .reduce((sum, [, count]) => sum + count, 0);
          
        const garageVehicles = Object.entries(statusCounts)
          .filter(([status]) => status.toLowerCase().includes('garage') || status.toLowerCase().includes('repair'))
          .reduce((sum, [, count]) => sum + count, 0);
          
        const writtenOffVehicles = Object.entries(statusCounts)
          .filter(([status]) => status.toLowerCase().includes('written off') || status.toLowerCase().includes('sold'))
          .reduce((sum, [, count]) => sum + count, 0);
          
        const reservedVehicles = Object.entries(statusCounts)
          .filter(([status]) => status.toLowerCase().includes('reserved'))
          .reduce((sum, [, count]) => sum + count, 0);
        
        resolve({
          vehicles,
          statusCounts,
          tradeGroupCounts,
          vehicleTypeCounts,
          motDueIn30Days,
          totalVehicles: vehicles.length,
          allocatedVehicles,
          spareVehicles,
          garageVehicles,
          writtenOffVehicles,
          reservedVehicles,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const mergeFleetData = (datasets: ParsedFleetData[]): ParsedFleetData => {
  const merged: ParsedFleetData = {
    vehicles: [],
    statusCounts: {},
    tradeGroupCounts: {},
    vehicleTypeCounts: {},
    motDueIn30Days: 0,
    totalVehicles: 0,
    allocatedVehicles: 0,
    spareVehicles: 0,
    garageVehicles: 0,
    writtenOffVehicles: 0,
    reservedVehicles: 0,
  };
  
  const seenVehicles = new Set<string>();
  
  for (const data of datasets) {
    for (const vehicle of data.vehicles) {
      const key = vehicle.regNo || vehicle.vanNumber;
      if (key && !seenVehicles.has(key)) {
        seenVehicles.add(key);
        merged.vehicles.push(vehicle);
      }
    }
    
    // Merge counts
    for (const [status, count] of Object.entries(data.statusCounts)) {
      merged.statusCounts[status] = (merged.statusCounts[status] || 0) + count;
    }
    
    for (const [group, count] of Object.entries(data.tradeGroupCounts)) {
      merged.tradeGroupCounts[group] = (merged.tradeGroupCounts[group] || 0) + count;
    }
    
    for (const [type, counts] of Object.entries(data.vehicleTypeCounts)) {
      if (!merged.vehicleTypeCounts[type]) {
        merged.vehicleTypeCounts[type] = { allocated: 0, spare: 0, garage: 0, reserved: 0 };
      }
      merged.vehicleTypeCounts[type].allocated += counts.allocated;
      merged.vehicleTypeCounts[type].spare += counts.spare;
      merged.vehicleTypeCounts[type].garage += counts.garage;
      merged.vehicleTypeCounts[type].reserved += counts.reserved;
    }
    
    merged.motDueIn30Days += data.motDueIn30Days;
  }
  
  // Recalculate totals from merged vehicles
  merged.totalVehicles = merged.vehicles.length;
  merged.allocatedVehicles = merged.vehicles.filter(v => v.status.toLowerCase().includes('allocated')).length;
  merged.spareVehicles = merged.vehicles.filter(v => v.status.toLowerCase().includes('spare') || v.status.toLowerCase().includes('available')).length;
  merged.garageVehicles = merged.vehicles.filter(v => v.status.toLowerCase().includes('garage') || v.status.toLowerCase().includes('repair')).length;
  merged.reservedVehicles = merged.vehicles.filter(v => v.status.toLowerCase().includes('reserved')).length;
  
  return merged;
};
