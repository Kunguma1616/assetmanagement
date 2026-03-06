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
  'martin.mackie@aspect.co.uk': ['Drainage', 'Plumbing'],
  'james.parkinson@aspect.co.uk': ['HVAC', 'Electrical', 'Gas'],
  'lee.merryweather@aspect.co.uk': ['Roofing', 'Windows & Doors', 'General Builders', 'Multi'],
  'marjan@aspect.co.uk': ['Leak Detection', 'Damp & Mould'],
  'peter.raynsford@aspect.co.uk': ['Drainage', 'Plumbing'],
};

/**
 * Trade Group Picklist - All available trade groups for UI dropdowns
 * Matches Salesforce Trade_Lookup__c picklist values
 */
export const TRADE_GROUP_PICKLIST: string[] = [
  'Utilities',
  'Drainage',
  'Key',
  'Gas',
  'Leak Detection',
  'Electrical',
  'Windows & Doors',
  'Fire Safety',
  'Roofing',
  'General Builders',
  'Plumbing',
  'Damp & Mould',
  'Multi',
  'Waste Clearance',
  'HVAC',
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
  // Direct mapping to Salesforce Trade_Lookup__c values (ordered by user's picklist)
  'Utilities': 'Utilities',
  'utilities': 'Utilities',
  'Ultilities': 'Utilities',
  'ultilities': 'Utilities',
  'ULUITLITIES': 'Utilities',

  'Drainage': 'Drainage',
  'drainage': 'Drainage',

  'Key': 'Key',
  'key': 'Key',
  'Key Account': 'Key',
  'Key Accounts': 'Key',
  'key account': 'Key',
  'key acoount': 'Key',
  'key accounts': 'Key',
  'Insurance': 'Key',
  'Manager for Insurance': 'Key',
  'manager for insurance': 'Key',
  'insurance': 'Key',

  'Gas': 'Gas',
  'gas': 'Gas',

  'Leak Detection': 'Leak Detection',
  'leak detection': 'Leak Detection',
  'Leak detection': 'Leak Detection',
  'Restoration': 'Leak Detection',

  'Electrical': 'Electrical',
  'electrical': 'Electrical',

  'Windows & Doors': 'Windows & Doors',
  'Windows and Doors': 'Windows & Doors',
  'windows and doors': 'Windows & Doors',
  'windows and dors': 'Windows & Doors',
  'Windows': 'Windows & Doors',
  'Doors': 'Windows & Doors',
  'Carpenter': 'Windows & Doors',
  'CARPTERNER': 'Windows & Doors',

  'Fire Safety': 'Fire Safety',
  'fire safety': 'Fire Safety',

  'Roofing': 'Roofing',
  'roofing': 'Roofing',

  'General Builders': 'General Builders',
  'general builders': 'General Builders',
  'Building': 'General Builders',
  'Building Fabric': 'General Builders',
  'Building and Fabric': 'General Builders',
  'Building and fabric': 'General Builders',
  'buiding and fabric': 'General Builders',
  'Building n fabric': 'General Builders',
  'BUILDING n fabric': 'General Builders',
  'building and fabric': 'General Builders',
  'Decoration': 'General Builders',
  'Bathroom Refurbishment': 'General Builders',
  'Project Manager': 'General Builders',
  'project manager': 'General Builders',

  'Plumbing': 'Plumbing',
  'plumbling': 'Plumbing',
  'plumbing': 'Plumbing',

  'Damp & Mould': 'Damp & Mould',
  'Damp and Mould': 'Damp & Mould',
  'Damp': 'Damp & Mould',
  'Damp and mould': 'Damp & Mould',
  'damp and mould': 'Damp & Mould',
  'damp mould': 'Damp & Mould',

  'Multi': 'Multi',
  'multi': 'Multi',

  'Waste Clearance': 'Waste Clearance',
  'waste clearance': 'Waste Clearance',
  'Rubbish Removal': 'Waste Clearance',
  'Gardening': 'Waste Clearance',
  'Pest Control': 'Waste Clearance',
  'Pest Proofing': 'Waste Clearance',
  'Sanitisation & specialist cleaning': 'Waste Clearance',

  'HVAC': 'HVAC',
  'hvac': 'HVAC',
  'Heating': 'HVAC',
  'Ventilation': 'HVAC',
  'Air Conditioning': 'HVAC',
};

/**
 * Get the parent trade group for a trade
 * Uses exact match, then case-insensitive, then substring matching
 * Returns the trade value itself as fallback if not found in mapping
 */
export const getTradeGroup = (trade: string): string => {
  if (!trade || trade === 'N/A' || trade.trim() === '') {
    return 'N/A';
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

  // Fallback: return the actual trade value if not found in mapping
  // This helps debug what values are actually in Salesforce
  return tradeTrimmed;
};

/**
 * Get all unique parent trade groups (7 groups from picklist)
 */
export const getAllTradeGroups = (): string[] => {
  return TRADE_GROUP_PICKLIST;
};
