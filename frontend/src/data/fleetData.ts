// Fleet data extracted from Excel files
export interface VehicleRecord {
  vanNumber: string;
  regNo: string;
  status: string;
  vehicleType: string;
  tradeGroup: string;
  serviceCost: string;
  maintenanceCost: string;
  transmission?: string;
  vehicleOwnership?: string;
  garageStatus?: string;
  vehicleReturnDate?: string;
}

// All Available Vehicles (Current Vehicles) - from 15.4_All_Available_Vehicles
export const allVehicles: VehicleRecord[] = [
  { vanNumber: "407", regNo: "FX23DHL", status: "Allocated", vehicleType: "Long wheel base high roof", tradeGroup: "Environmental Services", serviceCost: "GBP 0.00", maintenanceCost: "GBP 214.08", transmission: "Manual", vehicleOwnership: "" },
  { vanNumber: "433", regNo: "BG75VBF", status: "Allocated", vehicleType: "Short wheel base", tradeGroup: "Environmental Services", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "412", regNo: "BN75XZE", status: "Allocated", vehicleType: "Short wheel base", tradeGroup: "Office", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "Veh-411", regNo: "BN75PZE", status: "Allocated", vehicleType: "Short wheel base", tradeGroup: "Office", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "384", regNo: "YC74 ZPK", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Fire Safety", serviceCost: "GBP 750.86", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "435", regNo: "BD75FHW", status: "Reserved", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 205.50", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "432", regNo: "BK75CLJ", status: "Allocated", vehicleType: "Short wheel base", tradeGroup: "Environmental Services", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "404", regNo: "YA25NBX", status: "Allocated", vehicleType: "Long wheel base high roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "446", regNo: "BD75HJE", status: "Allocated", vehicleType: "Short wheel base", tradeGroup: "Office", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "402", regNo: "YA25EUL", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "373", regNo: "DY24HZC", status: "Allocated", vehicleType: "Long wheel base high roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 1,070.03", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "372", regNo: "DY24HZD", status: "Allocated", vehicleType: "Long wheel base high roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 0.00", maintenanceCost: "GBP 420.53", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "374", regNo: "DY24HZA", status: "Allocated", vehicleType: "Long wheel base high roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 501.06", maintenanceCost: "GBP 270.61", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "371", regNo: "DY24HZE", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 722.28", maintenanceCost: "GBP 318.10", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "999", regNo: "TEST999", status: "Allocated", vehicleType: "Long wheel base high roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Aspect Owned" },
  { vanNumber: "369", regNo: "YB73RHX", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Fire Safety", serviceCost: "GBP 654.64", maintenanceCost: "GBP 468.86", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "370", regNo: "YB73PYO", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "361", regNo: "HV73 XZR", status: "Allocated", vehicleType: "Cars", tradeGroup: "Office", serviceCost: "GBP 0.00", maintenanceCost: "GBP 375.46", transmission: "Automatic", vehicleOwnership: "Via HSBC" },
  { vanNumber: "362", regNo: "BD73DYO", status: "Allocated", vehicleType: "Short wheel base", tradeGroup: "Office", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Automatic", vehicleOwnership: "Via HSBC" },
  { vanNumber: "364", regNo: "YF73 OYG", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "365", regNo: "YF73 ETR", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 218.87", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "366", regNo: "YF73ETO", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 835.46", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "363", regNo: "YF73 RVM", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 1,578.37", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "367", regNo: "YF73ZVS", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 553.57", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "368", regNo: "HN73PFO", status: "Allocated", vehicleType: "Cars", tradeGroup: "Office", serviceCost: "GBP 95.70", maintenanceCost: "GBP 1,218.21", transmission: "Automatic", vehicleOwnership: "Via HSBC" },
  { vanNumber: "406", regNo: "YA25JKJ", status: "Allocated", vehicleType: "Long wheel base high roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "380", regNo: "YB24UVG", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Fire Safety", serviceCost: "GBP 208.03", maintenanceCost: "GBP 968.79", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "388", regNo: "YB74STX", status: "Allocated", vehicleType: "Long wheel base high roof", tradeGroup: "HVAC & Electrical", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "403", regNo: "YA25NKT", status: "Allocated", vehicleType: "Long wheel base high roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "382", regNo: "YB24UWV", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "HVAC & Electrical", serviceCost: "GBP 0.00", maintenanceCost: "GBP 783.26", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "381", regNo: "YB24UVD", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "HVAC & Electrical", serviceCost: "GBP 256.66", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "383", regNo: "YG74ZJZ", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 0.00", maintenanceCost: "GBP 29.70", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "353", regNo: "YE72AHJ", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 375.09", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "351", regNo: "YF72OVO", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 605.74", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "352", regNo: "YF72OVS", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "358", regNo: "YE72AHK", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 898.73", maintenanceCost: "GBP 258.91", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "354", regNo: "YE72AHL", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 0.00", maintenanceCost: "GBP 651.79", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "355", regNo: "YE72AHP", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "HVAC & Electrical", serviceCost: "GBP 0.00", maintenanceCost: "GBP 1,036.18", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "356", regNo: "YE72KNF", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 0.00", maintenanceCost: "GBP 1,302.36", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "359", regNo: "YE72AHN", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 2,762.16", maintenanceCost: "GBP 1,647.58", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "357", regNo: "YE72AHO", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "HVAC & Electrical", serviceCost: "GBP 0.00", maintenanceCost: "GBP 525.80", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "360", regNo: "YE72BKN", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "346", regNo: "YF72UAU", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 1,300.92", maintenanceCost: "GBP 242.29", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "347", regNo: "YF72TEU", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 557.08", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "348", regNo: "LJ72BZN", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "349", regNo: "YF72TTV", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "HVAC & Electrical", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
  { vanNumber: "350", regNo: "LJ72BZM", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 346.00", maintenanceCost: "GBP 0.00", transmission: "Manual", vehicleOwnership: "Via HSBC" },
];

// Allocated Vehicles - from 15.5_Allocated_Vehicles
export const allocatedVehicles: VehicleRecord[] = allVehicles.filter(v => v.status === "Allocated");

// Garage Vehicles - from Garage_Vehicles_Breakdown
export const garageVehicles: VehicleRecord[] = [
  { vanNumber: "VEH-00256", regNo: "FN19NWK", status: "In Garage", vehicleType: "Long wheel base low roof", tradeGroup: "HVAC & Electrical", serviceCost: "GBP 195.00", maintenanceCost: "GBP 25.20", garageStatus: "Awaiting Quote" },
  { vanNumber: "VEH-00241", regNo: "LO67TUU", status: "In Garage", vehicleType: "Long wheel base low roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 195.00", maintenanceCost: "GBP 672.22", garageStatus: "In Progress" },
];

// Written Off Vehicles (simulated based on the user's requirements - 21 vehicles)
export const writtenOffVehicles: VehicleRecord[] = [
  { vanNumber: "VEH-00101", regNo: "AB12CDE", status: "Written Off", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00102", regNo: "CD34EFG", status: "Written Off", vehicleType: "Short wheel base", tradeGroup: "HVAC & Electrical", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00103", regNo: "EF56GHI", status: "Written Off", vehicleType: "Long wheel base high roof", tradeGroup: "Drainage & Plumbing", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00104", regNo: "GH78IJK", status: "Written Off", vehicleType: "Cars", tradeGroup: "Office", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00105", regNo: "IJ90KLM", status: "Written Off", vehicleType: "Long wheel base low roof", tradeGroup: "Fire Safety", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00106", regNo: "KL12MNO", status: "Written Off", vehicleType: "Short wheel base", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00107", regNo: "MN34OPQ", status: "Written Off", vehicleType: "Long wheel base high roof", tradeGroup: "Environmental Services", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00108", regNo: "OP56QRS", status: "Written Off", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00109", regNo: "QR78STU", status: "Written Off", vehicleType: "Short wheel base", tradeGroup: "HVAC & Electrical", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00110", regNo: "ST90UVW", status: "Written Off", vehicleType: "Long wheel base high roof", tradeGroup: "Drainage & Plumbing", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00111", regNo: "UV12WXY", status: "Written Off", vehicleType: "Cars", tradeGroup: "Office", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00112", regNo: "WX34YZA", status: "Written Off", vehicleType: "Long wheel base low roof", tradeGroup: "Fire Safety", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00113", regNo: "YZ56ABC", status: "Written Off", vehicleType: "Short wheel base", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00114", regNo: "AB78CDE", status: "Written Off", vehicleType: "Long wheel base high roof", tradeGroup: "Environmental Services", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00115", regNo: "CD90EFG", status: "Written Off", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00116", regNo: "EF12GHI", status: "Written Off", vehicleType: "Short wheel base", tradeGroup: "HVAC & Electrical", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00117", regNo: "GH34IJK", status: "Written Off", vehicleType: "Long wheel base high roof", tradeGroup: "Drainage & Plumbing", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00118", regNo: "IJ56KLM", status: "Written Off", vehicleType: "Cars", tradeGroup: "Office", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00119", regNo: "KL78MNO", status: "Written Off", vehicleType: "Long wheel base low roof", tradeGroup: "Fire Safety", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00120", regNo: "MN90OPQ", status: "Written Off", vehicleType: "Short wheel base", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "N/A", maintenanceCost: "N/A" },
  { vanNumber: "VEH-00121", regNo: "OP12QRS", status: "Written Off", vehicleType: "Long wheel base high roof", tradeGroup: "Environmental Services", serviceCost: "N/A", maintenanceCost: "N/A" },
];

// MOT Due in 30 Days - from Vehicles_with_Road_Tax_Due_in_30_Days
export const motDueVehicles: VehicleRecord[] = [
  { vanNumber: "366", regNo: "YF73ETO", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 835.46", maintenanceCost: "GBP 0.00" },
  { vanNumber: "365", regNo: "YF73 ETR", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 218.87", maintenanceCost: "GBP 0.00" },
  { vanNumber: "364", regNo: "YF73 OYG", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00" },
  { vanNumber: "363", regNo: "YF73 RVM", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 1,578.37" },
  { vanNumber: "367", regNo: "YF73ZVS", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 553.57", maintenanceCost: "GBP 0.00" },
  { vanNumber: "368", regNo: "HN73PFO", status: "Allocated", vehicleType: "Cars", tradeGroup: "Office", serviceCost: "GBP 95.70", maintenanceCost: "GBP 1,218.21" },
  { vanNumber: "369", regNo: "YB73RHX", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Fire Safety", serviceCost: "GBP 654.64", maintenanceCost: "GBP 468.86" },
  { vanNumber: "370", regNo: "YB73PYO", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00" },
];

// Spare Vans Ready - from Spare_Vans_Ready
export const spareVehicles: VehicleRecord[] = [
  { vanNumber: "VEH-00350", regNo: "LJ72BZM", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "Drainage & Plumbing", serviceCost: "GBP 346.00", maintenanceCost: "GBP 0.00" },
  { vanNumber: "VEH-00349", regNo: "YF72TTV", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "HVAC & Electrical", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00" },
  { vanNumber: "Veh-422", regNo: "BK75UZL", status: "Spare", vehicleType: "Short wheel base", tradeGroup: "Building Fabric", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00" },
  { vanNumber: "VEH-00332", regNo: "BK21EVV", status: "Spare", vehicleType: "Long wheel base high roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 4,879.31", maintenanceCost: "GBP 6,498.69" },
  { vanNumber: "Veh-426", regNo: "BG75KMJ", status: "Spare", vehicleType: "Short wheel base", tradeGroup: "Building Fabric", serviceCost: "GBP 0.00", maintenanceCost: "GBP 0.00" },
  { vanNumber: "VEH-00198", regNo: "BX64UGL", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "Environmental Services", serviceCost: "GBP 7,276.21", maintenanceCost: "GBP 506.12" },
  { vanNumber: "VEH-00139", regNo: "LV62OPO", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 4,541.96", maintenanceCost: "GBP 2,379.33" },
  { vanNumber: "VEH-00323", regNo: "YH71WND", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 195.00", maintenanceCost: "GBP 494.20" },
  { vanNumber: "VEH-00290", regNo: "YC21MKK", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 195.00", maintenanceCost: "GBP 1,869.75" },
  { vanNumber: "VEH-00157", regNo: "BJ13GFE", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 195.00", maintenanceCost: "GBP 1,925.88" },
  { vanNumber: "VEH-00149", regNo: "LX13ORK", status: "Spare", vehicleType: "Long wheel base low roof", tradeGroup: "Building Fabric", serviceCost: "GBP 1,178.80", maintenanceCost: "GBP 229.20" },
  { vanNumber: "VEH-00173", regNo: "OV63CPZ", status: "Spare", vehicleType: "Short wheel base", tradeGroup: "Office", serviceCost: "GBP 195.00", maintenanceCost: "GBP 446.90" },
];

// Leavers Vehicles - from Leavers_Vehicles
export const leaversVehicles: VehicleRecord[] = [
  { vanNumber: "351", regNo: "YF72OVO", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 605.74", maintenanceCost: "GBP 0.00", vehicleReturnDate: "" },
  { vanNumber: "346", regNo: "YF72UAU", status: "Allocated", vehicleType: "Long wheel base low roof", tradeGroup: "Leak Detection, Damp & Restoration", serviceCost: "GBP 1,300.92", maintenanceCost: "GBP 242.29", vehicleReturnDate: "" },
];

// Vehicles to Service (simulated - 29 vehicles needing service soon)
export const serviceVehicles: VehicleRecord[] = allVehicles
  .filter(v => {
    const serviceCostNum = parseFloat(v.serviceCost.replace(/[^0-9.-]/g, '')) || 0;
    const maintenanceCostNum = parseFloat(v.maintenanceCost.replace(/[^0-9.-]/g, '')) || 0;
    return serviceCostNum > 500 || maintenanceCostNum > 500;
  })
  .slice(0, 29);

// Trade Group Chart Data - from All_Vehicles_by_Trade_Group
export const tradeGroupChartData = [
  { name: "Office", allocated: 21, spare: 1, reserved: 1, spareNotAvailable: 0 },
  { name: "Leak Detection, Damp & Restoration", allocated: 71, spare: 3, reserved: 1, spareNotAvailable: 2 },
  { name: "Drainage & Plumbing", allocated: 39, spare: 2, reserved: 0, spareNotAvailable: 1 },
  { name: "HVAC & Electrical", allocated: 21, spare: 1, reserved: 0, spareNotAvailable: 0 },
  { name: "Building Fabric", allocated: 51, spare: 3, reserved: 2, spareNotAvailable: 1 },
  { name: "Fire Safety", allocated: 14, spare: 1, reserved: 0, spareNotAvailable: 0 },
  { name: "Environmental Services", allocated: 6, spare: 2, reserved: 0, spareNotAvailable: 0 },
];

// Vehicle Type Chart Data - from All_Vehicles_by_Vehicle_Type
export const vehicleTypeChartData = [
  { name: "Office", lwbHighRoof: 12, lwbLowRoof: 0, swb: 9, cars: 1, tippers: 0, lutonBox: 0 },
  { name: "Leak Detection, Damp & Restoration", lwbHighRoof: 2, lwbLowRoof: 53, swb: 18, cars: 3, tippers: 0, lutonBox: 1 },
  { name: "Drainage & Plumbing", lwbHighRoof: 8, lwbLowRoof: 29, swb: 3, cars: 0, tippers: 2, lutonBox: 0 },
  { name: "HVAC & Electrical", lwbHighRoof: 5, lwbLowRoof: 14, swb: 2, cars: 1, tippers: 0, lutonBox: 0 },
  { name: "Building Fabric", lwbHighRoof: 3, lwbLowRoof: 44, swb: 7, cars: 0, tippers: 3, lutonBox: 0 },
  { name: "Fire Safety", lwbHighRoof: 1, lwbLowRoof: 12, swb: 1, cars: 1, tippers: 0, lutonBox: 0 },
  { name: "Environmental Services", lwbHighRoof: 3, lwbLowRoof: 3, swb: 2, cars: 0, tippers: 0, lutonBox: 0 },
];

// Spare Vans by Trade Group - from Spare_Vans_Ready
export const spareVansByTradeGroup = [
  { name: "Office", count: 1 },
  { name: "Leak Detection, Damp & Restoration", count: 2 },
  { name: "Drainage & Plumbing", count: 1 },
  { name: "Building Fabric", count: 3 },
];

// Leavers by Van Number - from Leavers_Vehicles
export const leaversByVanNumber = [
  { vanNumber: "346", count: 1 },
  { vanNumber: "351", count: 1 },
];
