// src/contexts/ParameterContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { randomizeParameterValue } from '../utils/parameterUtils';

const ParameterContext = createContext(null);

export const ParameterProvider = ({ children }) => {
  const [selectedParameters, setSelectedParameters] = useState([]);
  
  const handleParameterSelect = useCallback((parameter) => {
    // Prevent duplicates
    if (!selectedParameters.some(p => p.id === parameter.id)) {
      setSelectedParameters(prev => [...prev, parameter]);
    }
  }, [selectedParameters]);

  const handleParameterRemove = useCallback((parameter) => {
    setSelectedParameters(prev => prev.filter(p => p.id !== parameter.id));
  }, []);

  const handleParameterValueUpdate = useCallback((parameterId, newValue) => {
    setSelectedParameters(prev =>
      prev.map(param =>
        param.id === parameterId ? { ...param, value: newValue } : param
      )
    );
  }, []);
  
  const randomizeAll = useCallback(() => {
    setSelectedParameters(prev =>
      prev.map(param => ({
        ...param,
        value: randomizeParameterValue(param)
      }))
    );
  }, []);
  
  const randomizeCategory = useCallback((categoryId) => {
    setSelectedParameters(prev =>
      prev.map(param =>
        param.categoryId === categoryId
          ? { ...param, value: randomizeParameterValue(param) }
          : param
      )
    );
  }, []);
  
  const removeAllParameters = useCallback(() => {
    setSelectedParameters([]);
  }, []);
  
  const areAllParametersConfigured = useCallback(() => {
    if (!selectedParameters.length) return false;
    return !selectedParameters.some((p) => p.value == null);
  }, [selectedParameters]);

  return (
    <ParameterContext.Provider
      value={{
        selectedParameters,
        setSelectedParameters,
        handleParameterSelect,
        handleParameterRemove,
        handleParameterValueUpdate,
        randomizeAll,
        randomizeCategory,
        removeAllParameters,
        areAllParametersConfigured,
      }}
    >
      {children}
    </ParameterContext.Provider>
  );
};

export const useParameters = () => {
  const context = useContext(ParameterContext);
  if (context === null) {
    throw new Error('useParameters must be used within a ParameterProvider');
  }
  return context;
};