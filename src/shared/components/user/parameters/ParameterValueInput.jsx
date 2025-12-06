// src/components/parameters/ParameterValueInput.jsx
import React from 'react';
import { UserSelect as Select, Slider, Switch, Checkbox, Input } from '../../ui';

const ParameterValueInput = ({ parameter, value, onChange }) => {
  // Extract parameter values and config from database format
  const parameterValues = parameter.parameter_values || parameter.values || [];
  const parameterConfig = parameter.parameter_config || parameter.config || {};
  
  switch (parameter.type) {
    case 'select':
    case 'Dropdown':
      return (
        <div className="space-y-2">
          {parameter.description && (
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          )}
          <div className="relative w-full max-w-[400px]">
            <Select
              value={value || parameterValues[0]?.id || parameterValues[0]?.label || parameterValues[0] || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-9 rounded-md border bg-transparent px-3 py-1 text-sm appearance-none"
            >
              <option value="" disabled>
                Select...
              </option>
              {parameterValues.map((option, index) => {
                const optionId = option.id || option.label || option;
                const optionLabel = option.label || option;
                return (
                  <option key={optionId || index} value={optionId}>
                    {optionLabel}
                  </option>
                );
              })}
            </Select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 opacity-70"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      );

    case 'range':
    case 'Slider':
      const min = parameterConfig.min ?? 0;
      const max = parameterConfig.max ?? 100;
      const step = parameterConfig.step ?? 1;
      const defaultValue = parameterConfig.default ?? min;
      const currentValue = value ?? defaultValue;
      
      // Extract min/max labels from parameter_values or parameter_config
      const minLabel = parameterConfig.minLabel || parameterValues?.[0]?.label;
      const maxLabel = parameterConfig.maxLabel || parameterValues?.[1]?.label;

      return (
        <div className="space-y-2 max-w-[400px]">
          {parameter.description && (
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          )}
          <div className="flex justify-between text-sm">
            {minLabel ? (
              <span className="text-xs">{minLabel}</span>
            ) : (
              <span className="text-xs text-muted-foreground">{min}</span>
            )}
            {maxLabel ? (
              <span className="text-xs">{maxLabel}</span>
            ) : (
              <span className="text-xs text-muted-foreground">{max}</span>
            )}
          </div>

          <div className="relative flex items-center h-6">
            <Slider
              min={min}
              max={max}
              step={step}
              value={currentValue}
              onValueChange={(newValue) => onChange(newValue)}
              className="w-full"
            />
          </div>
          
          <div className="text-center">
            <span className="text-xs text-muted-foreground">Current: {currentValue}</span>
          </div>
        </div>
      );

    case 'boolean':
    case 'Toggle Switch':
      // Extract labels from parameter_values object or fallback to defaults
      const onLabel = parameterValues?.on || 'Enabled';
      const offLabel = parameterValues?.off || 'Disabled';
      
      return (
        <div className="space-y-2">
          {parameter.description && (
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm">{value ? onLabel : offLabel}</span>
            <Switch
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
            />
          </div>
        </div>
      );

    case 'checkbox':
    case 'Checkbox':
      return (
        <div className="space-y-2">
          {parameter.description && (
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {parameterValues.map((option, index) => {
              // Handle both {id, label} format and {label} format
              const optionId = option.id || option.label || option || `option-${index}`;
              const optionLabel = option.label || option;
              
              return (
                <div key={optionId} className="flex items-center space-x-2">
                  <Checkbox
                    id={`checkbox-${parameter.id}-${optionId}`}
                    checked={(value || []).includes(optionId)}
                    onChange={(e) => {
                      const currentValue = value || [];
                      const newValue = e.target.checked
                        ? [...currentValue, optionId]
                        : currentValue.filter((v) => v !== optionId);
                      onChange(newValue);
                    }}
                  />
                  <label
                    htmlFor={`checkbox-${parameter.id}-${optionId}`}
                    className="text-sm"
                  >
                    {optionLabel}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'radio':
    case 'Radio':
    case 'Radio Buttons':
      return (
        <div className="space-y-2">
          {parameter.description && (
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {parameterValues.map((option, index) => {
              const optionId = option.id || option.label || option || `option-${index}`;
              const optionLabel = option.label || option;
              
              return (
                <div key={optionId} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`${parameter.id}-${optionId}`}
                    name={parameter.id}
                    value={optionId}
                    checked={value === optionId}
                    onChange={() => onChange(optionId)}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor={`${parameter.id}-${optionId}`}
                    className="text-sm"
                  >
                    {optionLabel}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'text':
    case 'Text':
    case 'Input':
      return (
        <div className="space-y-2 max-w-[400px]">
          {parameter.description && (
            <p className="text-xs text-muted-foreground">{parameter.description}</p>
          )}
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={parameter.description || 'Enter text...'}
            className="w-full"
          />
        </div>
      );

    default:
      return <div>Unsupported parameter type: {parameter.type}</div>;
  }
};

export default ParameterValueInput;