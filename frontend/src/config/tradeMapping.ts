/**
 * Trade Group Mapping
 * Maps individual trade skills to their parent trade categories
 *
 * Source of truth: get_manager_mapping() + final SOQL exclusions
 * SOQL excludes: Key, Utilities, PM, Test Ops (never reach frontend)
 *
 * james.parkinson  → Gas, HVAC & Electrical  (HVAC, Gas, Electrical only)
 * lee.merryweather → Building Fabric          (Roofing, Multi, Decoration, Building Fabric,
 *                                              Carpentry, General Builders, Vent Hygiene)
 *                  + Environmental Services   (Pest Control, Sanitisation, Waste Clearance)
 * gavin.petty      → LDR                      (Damp, Mould, Drying, Restoration)
 * martin/sam/george/ryan → Drainage & Plumbing
 * marjan/neil      → LDR                      (Leak Detection)
 * paul.mcgee       → Fire Safety
 */

// ─── Restricted Users ────────────────────────────────────────────────────────

export const RESTRICTED_USERS: Record<string, string[]> = {
  'paul.mcgee@aspect.co.uk':       ['Fire Safety'],
  'martin.mackie@aspect.co.uk':    ['Drainage & Plumbing'],
  'james.parkinson@aspect.co.uk':  ['Gas, HVAC & Electrical'],
  'lee.merryweather@aspect.co.uk': ['Building Fabric'],
  'marjan.kola@aspect.co.uk':      ['LDR'],
  'peter.raynsford@aspect.co.uk':  ['Drainage & Plumbing'],
};

// ─── Trade Group Picklist ─────────────────────────────────────────────────────

export const TRADE_GROUP_PICKLIST: string[] = [
  'Building Fabric',
  'Drainage & Plumbing',
  'Environmental Services',
  'Fire Safety',
  'Gas, HVAC & Electrical',
  'LDR',
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export const getAvailableTradeGroups = (userEmail?: string): string[] => {
  if (!userEmail) return TRADE_GROUP_PICKLIST;
  const normalizedEmail = userEmail.toLowerCase().trim();
  const restrictedGroups = RESTRICTED_USERS[normalizedEmail];
  if (restrictedGroups && restrictedGroups.length > 0) return restrictedGroups;
  return TRADE_GROUP_PICKLIST;
};

export const isUserRestricted = (userEmail?: string): boolean => {
  if (!userEmail) return false;
  return userEmail.toLowerCase().trim() in RESTRICTED_USERS;
};

export const getDefaultTradeGroup = (userEmail?: string): string | null => {
  if (!userEmail) return null;
  const groups = RESTRICTED_USERS[userEmail.toLowerCase().trim()];
  return groups && groups.length > 0 ? groups[0] : null;
};

// ─── Trade → Category Map ─────────────────────────────────────────────────────
// NOTE: Key, Utilities, PM, Test Ops excluded by SOQL — intentionally not mapped.

export const TRADE_TO_CATEGORY: Record<string, string> = {

  // ── Building Fabric (lee.merryweather) ────────────────────────────────────
  'Bathroom Refurbishment':  'Building Fabric',
  'bathroom refurbishment':  'Building Fabric',
  'Building':                'Building Fabric',
  'building':                'Building Fabric',
  'Building and Fabric':     'Building Fabric',
  'building and fabric':     'Building Fabric',
  'Building Fabric':         'Building Fabric',
  'Building n fabric':       'Building Fabric',
  'BUILDING n fabric':       'Building Fabric',
  'Building and fabric':     'Building Fabric',
  'buiding and fabric':      'Building Fabric',
  'Carpentry':               'Building Fabric',
  'carpentry':               'Building Fabric',
  'Carpenter':               'Building Fabric',
  'carpenter':               'Building Fabric',
  'CARPTERNER':              'Building Fabric',
  'Decoration':              'Building Fabric',
  'decoration':              'Building Fabric',
  'Decorating':              'Building Fabric',
  'decorating':              'Building Fabric',
  'General Builders':        'Building Fabric',
  'general builders':        'Building Fabric',
  'Multi':                   'Building Fabric',
  'multi':                   'Building Fabric',
  
  'Roofing':                 'Building Fabric',
  'roofing':                 'Building Fabric',
  'Vent Hygiene':            'Building Fabric',
  'vent hygiene':            'Building Fabric',
  'Windows':                 'Building Fabric',
  'windows':                 'Building Fabric',
  'Windows & Doors':         'Building Fabric',
  'windows & doors':         'Building Fabric',
  'Windows and Doors':       'Building Fabric',
  'windows and doors':       'Building Fabric',
  'windows and dors':        'Building Fabric',
  'Doors':                   'Building Fabric',
  'doors':                   'Building Fabric',

  // ── Drainage & Plumbing (martin/sam/george/ryan) ──────────────────────────
  'Drainage':                'Drainage & Plumbing',
  'drainage':                'Drainage & Plumbing',
  'Plumbing':                'Drainage & Plumbing',
  'plumbing':                'Drainage & Plumbing',
  'plumbling':               'Drainage & Plumbing',

  // ── Environmental Services (lee.merryweather subset) ─────────────────────
  'Environmental Services':             'Environmental Services',
  'environmental services':             'Environmental Services',
  'Gardening':                          'Environmental Services',
  'gardening':                          'Environmental Services',
  'Pest Control':                       'Environmental Services',
  'pest control':                       'Environmental Services',
  'Pest Proofing':                      'Environmental Services',
  'pest proofing':                      'Environmental Services',
  'Rubbish Removal':                    'Environmental Services',
  'rubbish removal':                    'Environmental Services',
  'Sanitisation':                       'Environmental Services',
  'sanitisation':                       'Environmental Services',
  'Sanitisation & specialist cleaning': 'Environmental Services',
  'sanitisation & specialist cleaning': 'Environmental Services',
  'Waste Clearance':                    'Environmental Services',
  'waste clearance':                    'Environmental Services',

  // ── Fire Safety (paul.mcgee) ──────────────────────────────────────────────
  'Fire Safety':             'Fire Safety',
  'fire safety':             'Fire Safety',

  // ── Gas, HVAC & Electrical (james.parkinson: Gas, HVAC, Electrical ONLY) ─
  'Air Conditioning':        'Gas, HVAC & Electrical',
  'air conditioning':        'Gas, HVAC & Electrical',
  'Electrical':              'Gas, HVAC & Electrical',
  'electrical':              'Gas, HVAC & Electrical',
  'Gas':                     'Gas, HVAC & Electrical',
  'gas':                     'Gas, HVAC & Electrical',
  'Heating':                 'Gas, HVAC & Electrical',
  'heating':                 'Gas, HVAC & Electrical',
  'HVAC':                    'Gas, HVAC & Electrical',
  'hvac':                    'Gas, HVAC & Electrical',
  'Ventilation':             'Gas, HVAC & Electrical',
  'ventilation':             'Gas, HVAC & Electrical',

  // ── LDR (marjan/neil: Leak Detection + gavin.petty: Damp/Mould/Drying/Restoration)
  'Damp':                    'LDR',
  'damp':                    'LDR',
  'Damp & Mould':            'LDR',
  'Damp and Mould':          'LDR',
  'Damp and mould':          'LDR',
  'damp and mould':          'LDR',
  'damp mould':              'LDR',
  'Drying':                  'LDR',
  'drying':                  'LDR',
  'Leak Detection':          'LDR',
  'leak detection':          'LDR',
  'Leak detection':          'LDR',
  'Mould':                   'LDR',
  'mould':                   'LDR',
  'Restoration':             'LDR',
  'restoration':             'LDR',
};

// ─── getTradeGroup ────────────────────────────────────────────────────────────

export const getTradeGroup = (trade: string): string => {
  if (!trade || trade === 'N/A' || trade.trim() === '') return 'N/A';

  const tradeTrimmed = trade.trim();

  // Exact match
  if (TRADE_TO_CATEGORY[tradeTrimmed]) return TRADE_TO_CATEGORY[tradeTrimmed];

  // Case-insensitive match
  const tradeLower = tradeTrimmed.toLowerCase();
  for (const [key, value] of Object.entries(TRADE_TO_CATEGORY)) {
    if (key.toLowerCase() === tradeLower) return value;
  }

  // Substring match
  for (const [key, value] of Object.entries(TRADE_TO_CATEGORY)) {
    if (tradeLower.includes(key.toLowerCase()) || key.toLowerCase().includes(tradeLower)) return value;
  }

  return tradeTrimmed;
};

export const getAllTradeGroups = (): string[] => TRADE_GROUP_PICKLIST;