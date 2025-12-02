import { useState, useCallback } from 'react';
import axios from 'axios';
import config from '../config.js';

/**
 * Custom hook for standardized API calls with consistent error handling
 * 
 * @returns {Object} { request, loading, error, clearError }
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (method, endpoint, data = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `${config.API_URL}/api/admin${endpoint}`;
      const response = await axios[method](url, data);
      return response.data;
    } catch (err) {
      // Extract meaningful error message from server response
      let errorMessage = 'An unexpected error occurred';
      
      if (err.response) {
        // Server responded with error - API contract format: {success: boolean, error?: string, message?: string}
        if (err.response.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else {
          // Fallback to status-based messages
          switch (err.response.status) {
            case 400:
              errorMessage = 'Invalid request data';
              break;
            case 401:
              errorMessage = 'Authentication required';
              break;
            case 403:
              errorMessage = 'Access denied';
              break;
            case 404:
              errorMessage = 'Resource not found';
              break;
            case 409:
              errorMessage = 'Resource already exists';
              break;
            case 422:
              errorMessage = 'Validation failed';
              break;
            case 500:
              errorMessage = 'Server error - please try again';
              break;
            default:
              errorMessage = `Server error (${err.response.status})`;
          }
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'Unable to connect to server';
      } else {
        // Something else went wrong
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { 
    request, 
    loading, 
    error, 
    clearError 
  };
}

/**
 * Custom hook for public API calls (content, etc.)
 * 
 * @returns {Object} { request, loading, error, clearError }
 */
export function usePublicApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (method, endpoint, data = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `${config.API_URL}/api${endpoint}`;
      const response = await axios[method](url, data);
      return response.data;
    } catch (err) {
      // Extract meaningful error message from server response
      let errorMessage = 'An unexpected error occurred';
      
      if (err.response) {
        // Public API also follows same contract format: {success: boolean, error?: string, message?: string}
        if (err.response.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else {
          errorMessage = `Server error (${err.response.status})`;
        }
      } else if (err.request) {
        errorMessage = 'Unable to connect to server';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { 
    request, 
    loading, 
    error, 
    clearError 
  };
}

export default useApi;