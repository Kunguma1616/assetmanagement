/**
 * Trade Group Mapping
 * Maps individual trade skills to their parent trade categories
 */

export const TRADE_MAPPING: Record<string, string> = {
  // Fire Safety
  'Fire Safety': 'Fire Safety',
  'fire safety': 'Fire Safety',

  // LDR (Leak Detection & Restoration)
  'Leak Detection': 'LDR',
  'Damp': 'LDR',
  'Damp and Mould': 'LDR',
  'Damp and mould': 'LDR',
  'Damp mould': 'LDR',
  'damp and mould': 'LDR',
  'damp mould': 'LDR',
  'Restoration': 'LDR',

  // Gas, HVAC & Electrical
  'Gas': 'Gas, HVAC & Electrical',
  'Electrical': 'Gas, HVAC & Electrical',
  'Heating': 'Gas, HVAC & Electrical',
  'Ventilation': 'Gas, HVAC & Electrical',
  'Air Conditioning': 'Gas, HVAC & Electrical',
  'HVAC': 'Gas, HVAC & Electrical',
  'Utilities': 'Gas, HVAC & Electrical',
  'utilities': 'Gas, HVAC & Electrical',
  'Ultilities': 'Gas, HVAC & Electrical',
  'ultilities': 'Gas, HVAC & Electrical',
  'ULUITLITIES': 'Gas, HVAC & Electrical',

  // Building Fabric
  'Roofing': 'Building Fabric',
  'Multi': 'Building Fabric',
  'Decoration': 'Building Fabric',
  'Bathroom Refurbishment': 'Building Fabric',
  'Building': 'Building Fabric',
  'Building Fabric': 'Building Fabric',
  'Building and Fabric': 'Building Fabric',
  'Building and fabric': 'Building Fabric',
  'buiding and fabric': 'Building Fabric',
  'Building n fabric': 'Building Fabric',
  'BUILDING n fabric': 'Building Fabric',
  'Windows and Doors': 'Building Fabric',
  'windows and dors': 'Building Fabric',
  'Windows': 'Building Fabric',
  'Doors': 'Building Fabric',
  'Carpenter': 'Building Fabric',
  'CARPTERNER': 'Building Fabric',
  'building and fabric': 'Building Fabric',

  // Environmental Services
  'Gardening': 'Environmental Services',
  'Pest Control': 'Environmental Services',
  'Rubbish Removal': 'Environmental Services',
  'Pest Proofing': 'Environmental Services',
  'Sanitisation & specialist cleaning': 'Environmental Services',
  'Environmental service': 'Environmental Services',
  'environmental service': 'Environmental Services',
  'Environmental Services': 'Environmental Services',
  'Environmental science': 'Environmental Services',
  'environmental science': 'Environmental Services',

  // Drainage & Plumbing
  'Drainage': 'Drainage & Plumbing',
  'Plumbing': 'Drainage & Plumbing',
  'plumbling': 'Drainage & Plumbing',
  'drainage': 'Drainage & Plumbing',

  // Key Account (Primary trade group)
  'Key Account': 'Key Account',
  'Key Accounts': 'Key Account',
  'key account': 'Key Account',
  'key acoount': 'Key Account',
  'key accounts': 'Key Account',
  'key': 'Key Account',
  'Key': 'Key Account',

  // Building Fabric (includes project manager, environmental services)
  'Project Manager': 'Building Fabric',
  'project manager': 'Building Fabric',
  'Insurance': 'Key Account',
  'Manager for Insurance': 'Key Account',
  'manager for insurance': 'Key Account',
  'insurance': 'Key Account',
  'Environmental Service': 'Building Fabric',
  'Environmental service': 'Building Fabric',
  'environmental service': 'Building Fabric',
  'Environmental Science': 'Building Fabric',
  'environmental science': 'Building Fabric',
};

/**
 * Get the parent trade group for a trade
 * Uses exact match, then case-insensitive, then substring matching
 * Returns 'Building Fabric' as fallback for unmapped trades (catch-all)
 */
export const getTradeGroup = (trade: string): string => {
  if (!trade || trade === 'N/A' || trade.trim() === '') {
    return 'Building Fabric'; // Default fallback
  }

  const tradeTrimmed = trade.trim();
  
  // Try exact match first (fast path)
  if (TRADE_MAPPING[tradeTrimmed]) {
    return TRADE_MAPPING[tradeTrimmed];
  }

  // Try case-insensitive match
  const tradeLower = tradeTrimmed.toLowerCase();
  for (const [key, value] of Object.entries(TRADE_MAPPING)) {
    if (key.toLowerCase() === tradeLower) {
      return value;
    }
  }

  // Try substring matching (e.g., "ULTILITIES" contains "utilities")
  for (const [key, value] of Object.entries(TRADE_MAPPING)) {
    if (tradeLower.includes(key.toLowerCase()) || key.toLowerCase().includes(tradeLower)) {
      return value;
    }
  }

  // Fallback: return 'Building Fabric' for anything not in mapping
  return 'Building Fabric';
};

/**
 * Get all unique parent trade groups (6 groups only)
 */
export const getAllTradeGroups = (): string[] => {
  return Array.from(new Set(Object.values(TRADE_MAPPING))).sort();
};
