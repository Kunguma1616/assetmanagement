/**
 * Trade Group Mapping
 * Maps individual trade skills to their parent trade categories
 */

/**
 * User Trade Group Restrictions
 * Maps specific user emails to their allowed trade groups
 * Restricted users can ONLY see their assigned trade group
 * Unrestricted users can see all trade groups
 */
export const RESTRICTED_USERS: Record<string, string[]> = {
  'paul.mcgee@aspect.co.uk': ['Fire Safety'],
  'martin.mackie@aspect.co.uk': ['Drainage & Plumbing'],
  'james.parkinson@aspect.co.uk': ['HVAC & Electrical'],
  'lee.merryweather@aspect.co.uk': ['Building Fabric'],
  'marjan@aspect.co.uk': ['LDR'],
  'peter.raynsford@aspect.co.uk': ['Drainage & Plumbing'],
};

/**
 * Trade Group Picklist - All available trade groups for UI dropdowns
 */
export const TRADE_GROUP_PICKLIST: string[] = [
  'Fire Safety',
  'LDR',
  'HVAC & Electrical',
  'Building Fabric',
  'Environmental Services',
  'Drainage & Plumbing',
  'Key Account',
];

/**
 * Get available trade groups for a user
 * If user is restricted, return only their assigned trade group
 * Otherwise, return all trade groups
 */
export const getAvailableTradeGroups = (userEmail?: string): string[] => {
  if (!userEmail) {
    console.warn('⚠️ No email provided to getAvailableTradeGroups');
    return TRADE_GROUP_PICKLIST;
  }
  
  const normalizedEmail = userEmail.toLowerCase().trim();
  const restrictedGroups = RESTRICTED_USERS[normalizedEmail];
  
  console.log(`🔍 getAvailableTradeGroups called:`, {
    originalEmail: userEmail,
    normalizedEmail: normalizedEmail,
    isInRestrictedUsers: normalizedEmail in RESTRICTED_USERS,
    restrictedGroups: restrictedGroups,
    availableTradeGroups: restrictedGroups && restrictedGroups.length > 0 ? restrictedGroups : TRADE_GROUP_PICKLIST
  });
  
  if (restrictedGroups && restrictedGroups.length > 0) {
    console.log(`✅ User ${normalizedEmail} restricted to:`, restrictedGroups);
    return restrictedGroups;
  }
  
  console.log(`✅ User ${normalizedEmail} has full access to all trade groups`);
  return TRADE_GROUP_PICKLIST;
};

/**
 * Check if user is restricted to specific trade groups
 */
export const isUserRestricted = (userEmail?: string): boolean => {
  if (!userEmail) return false;
  const normalizedEmail = userEmail.toLowerCase().trim();
  const isRestricted = normalizedEmail in RESTRICTED_USERS;
  console.log(`🔍 Checking restriction for ${normalizedEmail}: ${isRestricted}`);
  return isRestricted;
};

/**
 * Get the default (and only) trade group for a restricted user
 */
export const getDefaultTradeGroup = (userEmail?: string): string | null => {
  if (!userEmail) return null;
  const normalizedEmail = userEmail.toLowerCase().trim();
  const groups = RESTRICTED_USERS[normalizedEmail];
  if (groups && groups.length > 0) {
    console.log(`🔐 Default trade group for ${normalizedEmail}: ${groups[0]}`);
    return groups[0];
  }
  return null;
};

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
  'Gas': 'HVAC & Electrical',
  'Electrical': 'HVAC & Electrical',
  'Heating': 'HVAC & Electrical',
  'Ventilation': 'HVAC & Electrical',
  'Air Conditioning': 'HVAC & Electrical',
  'HVAC': 'HVAC & Electrical',
  'Utilities': 'HVAC & Electrical',
  'utilities': 'HVAC & Electrical',
  'Ultilities': 'HVAC & Electrical',
  'ultilities': 'HVAC & Electrical',
  'ULUITLITIES': 'HVAC & Electrical',

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
   * Get all unique parent trade groups (7 groups from picklist)
   */
  export const getAllTradeGroups = (): string[] => {
    return TRADE_GROUP_PICKLIST;  };