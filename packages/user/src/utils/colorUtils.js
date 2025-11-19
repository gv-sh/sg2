/**
 * Utility function to convert a string to a consistent color
 * We use a simple hash function to generate a number from a string,
 * then use that number to select from a predefined set of colors.
 * 
 * @param {string} str - String to convert to a color
 * @returns {object} - Object with bgColor, textColor, and borderColor properties
 */

// Define a set of color themes
const colorThemes = [
  { bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  { bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
  { bgColor: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
  { bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  { bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', borderColor: 'border-cyan-200' },
  { bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' },
  { bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', borderColor: 'border-indigo-200' },
  { bgColor: 'bg-pink-50', textColor: 'text-pink-700', borderColor: 'border-pink-200' },
  { bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  { bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' },
  { bgColor: 'bg-teal-50', textColor: 'text-teal-700', borderColor: 'border-teal-200' },
  { bgColor: 'bg-lime-50', textColor: 'text-lime-700', borderColor: 'border-lime-200' },
  { bgColor: 'bg-fuchsia-50', textColor: 'text-fuchsia-700', borderColor: 'border-fuchsia-200' },
  { bgColor: 'bg-rose-50', textColor: 'text-rose-700', borderColor: 'border-rose-200' },
  { bgColor: 'bg-sky-50', textColor: 'text-sky-700', borderColor: 'border-sky-200' },
  { bgColor: 'bg-violet-50', textColor: 'text-violet-700', borderColor: 'border-violet-200' }
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
    'Slider': 'bg-amber-50 text-amber-700 border-amber-200',
    'Dropdown': 'bg-blue-50 text-blue-700 border-blue-200',
    'Radio': 'bg-purple-50 text-purple-700 border-purple-200',
    'Radio Buttons': 'bg-purple-50 text-purple-700 border-purple-200',
    'Toggle Switch': 'bg-green-50 text-green-700 border-green-200',
    'Checkbox': 'bg-indigo-50 text-indigo-700 border-indigo-200'
  };
  
  return typeMap[type] || 'bg-gray-100 text-gray-700 border-gray-200';
};
