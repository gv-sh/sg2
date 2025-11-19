// Updated exportUtils.js

/**
 * Download text content as a file
 * @param {string} content - Content to download
 * @param {string} filename - Name of the file
 * @param {string} type - MIME type of the file
 */
export const downloadTextFile = (content, filename, type = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Download an image from a data URL
 * @param {string} dataUrl - Image data URL
 * @param {string} filename - Name of the file
 */
export const downloadImage = (dataUrl, filename) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
};

/**
 * Share content using Web Share API
 * @param {Object} shareData - Data to share
 */
export const shareContent = async (shareData) => {
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch (err) {
      console.error('Error sharing:', err);
      return false;
    }
  } else {
    console.warn('Web Share API not supported');
    return false;
  }
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    // Could add notification that content was copied
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    // Fallback method
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.error('Fallback copy failed: ', fallbackErr);
      document.body.removeChild(textArea);
      return false;
    }
  }
};