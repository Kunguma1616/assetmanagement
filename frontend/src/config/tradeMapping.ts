/**
 * Trade Group Mapping
 * Maps individual trade skills to their parent trade categories
 *
 * Source of truth: get_manager_mapping() + final SOQL exclusions
 * SOQL excludes: Key, Utilities, PM, Test Ops (never reach frontend)
 *
 * james.parkinson  → Gas, HVAC & Electrical  (HVAC, Gas, Electrical only)
 * lee.merryweather → Building Fabric + Environmental Services
 *                    - Building Fabric:        (Roofing, Decoration, Building Fabric, Carpentry, General Builders, Multi)
 *                    - Environmental Services: (Pest Control, Sanitisation, Waste Clearance, Environmental Services)
 * gavin.petty      → LDR                      (Damp, Mould, Drying, Restoration)
 * martin/sam/george/ryan → Drainage & Plumbing
 * marjan/neil      → LDR                      (Leak Detection)
 * paul.mcgee       → Fire Safety
 */

// ─── Restricted Users ────────────────────────────────────────────────────────

export const RESTRICTED_USERS: Record<string, string[]> = {
  'paul.mcgee@aspect.co.uk':       ['Fire Safety'],
  'martin.mackie@aspect.co.uk':    ['Drainage', 'Plumbing'],
  'james.parkinson@aspect.co.uk':  ['HVAC', 'Gas', 'Electrical'],
  'lee.merryweather@aspect.co.uk': [
    // Building Fabric
    'Roofing', 'Multi', 'Decoration', 'Building Fabric', 'Carpentry', 'General Builders',
    // Environmental Services
    'Environmental Services', 'Pest Control', 'Sanitisation', 'Waste Clearance',
  ],
  'marjan.kola@aspect.co.uk':      ['Leak Detection', 'Damp & Mould', 'Restoration'],
  'peter.raynsford@aspect.co.uk':  ['Drainage', 'Plumbing'],
};

// ─── Trade Group Picklist ─────────────────────────────────────────────────────
// 6 Main Trade Categories (each user can access one or more)
// 
// Lee Merryweather:       Building Fabric + Environmental Services
// James Parkinson:        Gas, HVAC & Electrical
// Martin Mackie:          Drainage & Plumbing
// Paul McGee:             Fire Safety
// Marjan Kola:            LDR (Leak Detection & Restoration)
// Others:                 All 6 categories

export const TRADE_GROUP_PICKLIST: string[] = [
  'Building Fabric & Environmental',  // Combined: Building Fabric + Environmental Services + Roofing
  'Drainage & Plumbing',
  'Fire Safety',
  'Gas, HVAC & Electrical',
  'LDR',
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

// Users whose trades map to both Building Fabric AND Environmental Services
// get the combined picklist entry instead of two separate ones.
const LEE_COMBINED_EMAILS = ['lee.merryweather@aspect.co.uk'];

// Returns the trade GROUP categories accessible to this user (for dropdowns/UI).
// Maps individual trades in RESTRICTED_USERS → their parent categories.
export const getAvailableTradeGroups = (userEmail?: string): string[] => {
  if (!userEmail) return TRADE_GROUP_PICKLIST;
  const normalizedEmail = userEmail.toLowerCase().trim();
  if (LEE_COMBINED_EMAILS.includes(normalizedEmail)) return ['Building Fabric & Environmental'];
  const allowedTrades = RESTRICTED_USERS[normalizedEmail];
  if (!allowedTrades || allowedTrades.length === 0) return TRADE_GROUP_PICKLIST;
  const groups = [...new Set(allowedTrades.map(t => TRADE_TO_CATEGORY[t] || TRADE_TO_CATEGORY[t.toLowerCase()] || t))];
  return groups.filter(g => TRADE_GROUP_PICKLIST.includes(g));
};

export const isUserRestricted = (userEmail?: string): boolean => {
  if (!userEmail) return false;
  return userEmail.toLowerCase().trim() in RESTRICTED_USERS;
};

// Returns the first allowed trade GROUP category for a user (used as default filter).
export const getDefaultTradeGroup = (userEmail?: string): string | null => {
  if (!userEmail) return null;
  const groups = getAvailableTradeGroups(userEmail);
  return groups.length > 0 ? groups[0] : null;
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
  'Gas, HVAC & Electrical':  'Gas, HVAC & Electrical',

  // ── LDR (marjan/neil: Leak Detection + gavin.petty: Damp/Mould/Drying/Restoration)
  'Damp':                    'LDR',
  'damp':                    'LDR',
  'Damp & Mould':            'LDR',
  'damp & mould':            'LDR',
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

// ─── Excluded Trades (never shown in UI) ─────────────────────────────────────
// Vent Hygiene: removed from service. Key/Utilities/PM/Test Ops: excluded by SOQL + frontend guard.

export const EXCLUDED_TRADES: string[] = [
  'Vent Hygiene', 'vent hygiene',
  'Key', 'key',
  'Utilities', 'utilities',
  'PM', 'pm',
  'Test Ops', 'test ops',
];

export const isExcludedTrade = (trade?: string): boolean => {
  if (!trade) return false;
  const t = trade.trim().toLowerCase();
  if (t === 'excluded') return true;
  return EXCLUDED_TRADES.some(e => e.toLowerCase() === t);
};

// ─── getTradeGroup ────────────────────────────────────────────────────────────

export const getTradeGroup = (trade: string): string => {
  if (!trade || trade === 'N/A' || trade.trim() === '') return 'N/A';

  const tradeTrimmed = trade.trim();

  // Never map excluded trades — return sentinel so they get filtered out
  if (isExcludedTrade(tradeTrimmed)) return 'EXCLUDED';

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