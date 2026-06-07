/**
 * Formation coordinate maps.
 * Coordinates are { top: '%%', left: '%%' } percentage strings
 * relative to the pitch container. Attacking end at top.
 */
export const FORMATIONS = {
  '4-3-3': {
    GK:  { top: '88%', left: '50%' },
    LB:  { top: '70%', left: '10%' },
    LCB: { top: '70%', left: '30%' },
    RCB: { top: '70%', left: '64%' },
    RB:  { top: '70%', left: '84%' },
    LCM: { top: '50%', left: '22%' },
    CM:  { top: '48%', left: '50%' },
    RCM: { top: '50%', left: '76%' },
    LW:  { top: '20%', left: '10%' },
    ST:  { top: '15%', left: '50%' },
    RW:  { top: '20%', left: '84%' },
  },
  '4-4-2': {
    GK:  { top: '88%', left: '50%' },
    LB:  { top: '70%', left: '10%' },
    LCB: { top: '70%', left: '30%' },
    RCB: { top: '70%', left: '64%' },
    RB:  { top: '70%', left: '84%' },
    LM:  { top: '50%', left: '8%' },
    LCM: { top: '50%', left: '30%' },
    RCM: { top: '50%', left: '64%' },
    RM:  { top: '50%', left: '86%' },
    LST: { top: '18%', left: '30%' },
    RST: { top: '18%', left: '64%' },
  },
  '3-4-3': {
    GK:  { top: '88%', left: '50%' },
    LCB: { top: '70%', left: '20%' },
    CB:  { top: '70%', left: '50%' },
    RCB: { top: '70%', left: '78%' },
    LM:  { top: '50%', left: '8%' },
    LCM: { top: '50%', left: '32%' },
    RCM: { top: '50%', left: '66%' },
    RM:  { top: '50%', left: '88%' },
    LW:  { top: '18%', left: '14%' },
    ST:  { top: '13%', left: '50%' },
    RW:  { top: '18%', left: '82%' },
  },
  '4-2-3-1': {
    GK:   { top: '88%', left: '50%' },
    LB:   { top: '72%', left: '10%' },
    LCB:  { top: '72%', left: '30%' },
    RCB:  { top: '72%', left: '64%' },
    RB:   { top: '72%', left: '84%' },
    LDM:  { top: '57%', left: '34%' },
    RDM:  { top: '57%', left: '60%' },
    LAM:  { top: '36%', left: '14%' },
    CAM:  { top: '34%', left: '50%' },
    RAM:  { top: '36%', left: '80%' },
    ST:   { top: '13%', left: '50%' },
  },
  '3-5-2': {
    GK:  { top: '88%', left: '50%' },
    LCB: { top: '72%', left: '18%' },
    CB:  { top: '72%', left: '50%' },
    RCB: { top: '72%', left: '80%' },
    LWB: { top: '52%', left: '6%' },
    LCM: { top: '50%', left: '28%' },
    CM:  { top: '48%', left: '50%' },
    RCM: { top: '50%', left: '70%' },
    RWB: { top: '52%', left: '90%' },
    LST: { top: '18%', left: '32%' },
    RST: { top: '18%', left: '66%' },
  },
  '5-3-2': {
    GK:  { top: '88%', left: '50%' },
    LWB: { top: '70%', left: '6%' },
    LCB: { top: '70%', left: '24%' },
    CB:  { top: '70%', left: '50%' },
    RCB: { top: '70%', left: '74%' },
    RWB: { top: '70%', left: '90%' },
    LCM: { top: '48%', left: '24%' },
    CM:  { top: '46%', left: '50%' },
    RCM: { top: '48%', left: '74%' },
    LST: { top: '18%', left: '32%' },
    RST: { top: '18%', left: '66%' },
  },
  '4-1-4-1': {
    GK:  { top: '88%', left: '50%' },
    LB:  { top: '72%', left: '10%' },
    LCB: { top: '72%', left: '30%' },
    RCB: { top: '72%', left: '64%' },
    RB:  { top: '72%', left: '84%' },
    DM:  { top: '59%', left: '50%' },
    LM:  { top: '42%', left: '8%' },
    LCM: { top: '40%', left: '30%' },
    RCM: { top: '40%', left: '64%' },
    RM:  { top: '42%', left: '86%' },
    ST:  { top: '13%', left: '50%' },
  },
  '4-4-2 Diamond': {
    GK:  { top: '88%', left: '50%' },
    LB:  { top: '72%', left: '10%' },
    LCB: { top: '72%', left: '30%' },
    RCB: { top: '72%', left: '64%' },
    RB:  { top: '72%', left: '84%' },
    CDM: { top: '58%', left: '50%' },
    LCM: { top: '46%', left: '24%' },
    RCM: { top: '46%', left: '72%' },
    CAM: { top: '32%', left: '50%' },
    LST: { top: '14%', left: '32%' },
    RST: { top: '14%', left: '66%' },
  },
  '3-3-3-1': {
    GK:   { top: '88%', left: '50%' },
    LCB:  { top: '74%', left: '20%' },
    CB:   { top: '74%', left: '50%' },
    RCB:  { top: '74%', left: '78%' },
    LDM:  { top: '60%', left: '22%' },
    CDM:  { top: '59%', left: '50%' },
    RDM:  { top: '60%', left: '76%' },
    LW:   { top: '38%', left: '12%' },
    CAM:  { top: '34%', left: '50%' },
    RW:   { top: '38%', left: '84%' },
    ST:   { top: '13%', left: '50%' },
  },
  '5-4-1': {
    GK:  { top: '88%', left: '50%' },
    LWB: { top: '70%', left: '6%' },
    LCB: { top: '70%', left: '22%' },
    CB:  { top: '70%', left: '50%' },
    RCB: { top: '70%', left: '76%' },
    RWB: { top: '70%', left: '90%' },
    LM:  { top: '48%', left: '10%' },
    LCM: { top: '46%', left: '32%' },
    RCM: { top: '46%', left: '66%' },
    RM:  { top: '48%', left: '84%' },
    ST:  { top: '14%', left: '50%' },
  },
};

export const VALID_NATIONS = [
  'France', 'Spain', 'England', 'Germany', 'Brazil', 'Portugal',
  'Argentina', 'Belgium', 'Uruguay', 'Croatia', 'Netherlands', 'Morocco',
];

export const NATION_COLORS = {
  France:      '#003189',
  Spain:       '#c60b1e',
  England:     '#cf081f',
  Germany:     '#2a2a2a',
  Brazil:      '#009c3b',
  Portugal:    '#006600',
  Argentina:   '#4a8fd4',
  Belgium:     '#ef3340',
  Uruguay:     '#4a9fc4',
  Croatia:     '#cc2222',
  Netherlands: '#e55a00',
  Morocco:     '#b01f24',
};

export const NATION_FLAGS = {
  France:      '🇫🇷',
  Spain:       '🇪🇸',
  England:     '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Germany:     '🇩🇪',
  Brazil:      '🇧🇷',
  Portugal:    '🇵🇹',
  Argentina:   '🇦🇷',
  Belgium:     '🇧🇪',
  Uruguay:     '🇺🇾',
  Croatia:     '🇭🇷',
  Netherlands: '🇳🇱',
  Morocco:     '🇲🇦',
};

/**
 * ISO 3166-1 alpha-2 codes for flagcdn.com image URLs.
 * Usage: https://flagcdn.com/24x18/{code}.png
 */
export const NATION_FLAG_CODES = {
  France:      'fr',
  Spain:       'es',
  England:     'gb-eng',
  Germany:     'de',
  Brazil:      'br',
  Portugal:    'pt',
  Argentina:   'ar',
  Belgium:     'be',
  Uruguay:     'uy',
  Croatia:     'hr',
  Netherlands: 'nl',
  Morocco:     'ma',
};

/**
 * Returns a flagcdn.com URL for a nation.
 * @param {string} nation
 * @param {number} w width (16 | 20 | 24 | 32 | 48 | 64 | 96 | 160 | 240 | 320 | 640 | 1280 | 2560)
 */
export function flagUrl(nation, w = 32) {
  const code = NATION_FLAG_CODES[nation];
  if (!code) return null;
  const h = Math.round(w * 0.75);
  return `https://flagcdn.com/${w}x${h}/${code}.png`;
}
