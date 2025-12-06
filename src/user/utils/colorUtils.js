/**
 * Utility function to convert a string to a consistent color
 * We use a simple hash function to generate a number from a string,
 * then use that number to select from a predefined set of colors.
 * 
 * @param {string} str - String to convert to a color
 * @returns {object} - Object with bgColor, textColor, and borderColor properties
 */

// Define a set of color themes based on Quest Alliance brand colors
const colorThemes = [
  { bgColor: 'bg-primary/10', textColor: 'text-primary', borderColor: 'border-primary/20' },
  { bgColor: 'bg-secondary/10', textColor: 'text-secondary', borderColor: 'border-secondary/20' },
  { bgColor: 'bg-accent/10', textColor: 'text-accent', borderColor: 'border-accent/20' },
  { bgColor: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-200' },
  { bgColor: 'bg-emerald-50', textColor: 'text-emerald-600', borderColor: 'border-emerald-200' },
  { bgColor: 'bg-purple-50', textColor: 'text-purple-600', borderColor: 'border-purple-200' },
  { bgColor: 'bg-pink-50', textColor: 'text-pink-600', borderColor: 'border-pink-200' },
  { bgColor: 'bg-red-50', textColor: 'text-red-600', borderColor: 'border-red-200' },
  { bgColor: 'bg-orange-50', textColor: 'text-orange-600', borderColor: 'border-orange-200' },
  { bgColor: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-200' },
  { bgColor: 'bg-cyan-50', textColor: 'text-cyan-600', borderColor: 'border-cyan-200' },
  { bgColor: 'bg-teal-50', textColor: 'text-teal-600', borderColor: 'border-teal-200' },
  { bgColor: 'bg-indigo-50', textColor: 'text-indigo-600', borderColor: 'border-indigo-200' },
  { bgColor: 'bg-violet-50', textColor: 'text-violet-600', borderColor: 'border-violet-200' },
  { bgColor: 'bg-slate-50', textColor: 'text-slate-600', borderColor: 'border-slate-200' },
  { bgColor: 'bg-gray-50', textColor: 'text-gray-600', borderColor: 'border-gray-200' }
];

/**
 * Simple string hash function to generate a deterministic number from a string
 * 
 * @param {string} str - String to hash
 * @returns {number} - Hash value
 */
const hashString = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash);
};

/**
 * Convert a string to a color theme
 * 
 * @param {string} str - String to convert to a color
 * @returns {object} - Object with bgColor, textColor, and borderColor properties
 */
export const stringToColor = (str) => {
  if (!str) return colorThemes[0];
  
  const hash = hashString(str);
  const index = hash % colorThemes.length;
  
  return colorThemes[index];
};

/**
 * Get color theme for parameter type
 * 
 * @param {string} type - Parameter type
 * @returns {string} - CSS classes for the specified type
 */
export const getTypeColor = (type) => {
  const typeMap = {
    'Slider': 'bg-primary/10 text-primary border-primary/20',
    'Dropdown': 'bg-secondary/10 text-secondary border-secondary/20',
    'Radio': 'bg-accent/10 text-accent border-accent/20',
    'Radio Buttons': 'bg-accent/10 text-accent border-accent/20',
    'Toggle Switch': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'Checkbox': 'bg-purple-50 text-purple-600 border-purple-200'
  };
  
  return typeMap[type] || 'bg-muted text-muted-foreground border-border';
};
