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
  'Project Manager': 'Building Fabric',
  'project manager': 'Building Fabric',

  // Environmental Services
  'Gardening': 'Environmental Services',
  'Pest Control': 'Environmental Services',
  'Rubbish Removal': 'Environmental Services',
  'Pest Proofing': 'Environmental Services',
  'Sanitisation & specialist cleaning': 'Environmental Services',
  'Environmental Service': 'Environmental Services',
  'Environmental service': 'Environmental Services',
  'environmental service': 'Environmental Services',
  'Environmental Services': 'Environmental Services',
  'Environmental Science': 'Environmental Services',
  'environmental science': 'Environmental Services',

  // Drainage & Plumbing
  'Drainage': 'Drainage & Plumbing',
  'Plumbing': 'Drainage & Plumbing',
  'plumbling': 'Drainage & Plumbing',
  'drainage': 'Drainage & Plumbing',

  // Key Account
  'Key Account': 'Key Account',
  'Key Accounts': 'Key Account',
  'key account': 'Key Account',
  'key acoount': 'Key Account',
  'key accounts': 'Key Account',
  'key': 'Key Account',
  'Key': 'Key Account',
  'Insurance': 'Key Account',
  'Manager for Insurance': 'Key Account',
  'manager for insurance': 'Key Account',
  'insurance': 'Key Account',
};

/**
 * Get the parent trade group for a trade
 * Uses exact match, then case-insensitive, then substring matching
 * Returns 'Building Fabric' as fallback for unmapped trades (catch-all)
 */
export const getTradeGroup = (trade: string): string => {
  if (!trade || trade === 'N/A' || trade.trim() === '') {
    return 'Building Fabric';
  }

  const tradeTrimmed = trade.trim();

  if (TRADE_MAPPING[tradeTrimmed]) {
    return TRADE_MAPPING[tradeTrimmed];
  }

  const tradeLower = tradeTrimmed.toLowerCase();
  for (const [key, value] of Object.entries(TRADE_MAPPING)) {
    if (key.toLowerCase() === tradeLower) {
      return value;
    }
  }

  for (const [key, value] of Object.entries(TRADE_MAPPING)) {
    if (tradeLower.includes(key.toLowerCase()) || key.toLowerCase().includes(tradeLower)) {
      return value;
    }
  }

  return 'Building Fabric';
};

/**
 * Get all unique parent trade groups (6 groups only)
 */
export const getAllTradeGroups = (): string[] => {
  return Array.from(new Set(Object.values(TRADE_MAPPING))).sort();
};
