// src/components/parameters/ParameterValueInput.jsx
import React from 'react';
import { Select } from '../ui/select';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';

const ParameterValueInput = ({ parameter, value, onChange }) => {
  switch (parameter.type) {
    case 'Dropdown':
      return (
        <div className="relative w-full max-w-[400px]">
          <Select
            value={value || parameter.values[0]?.id || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 rounded-md border bg-transparent px-3 py-1 text-sm appearance-none"
          >
            <option value="" disabled>
              Select...
            </option>
            {parameter.values.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
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
      );

    case 'Slider':
      const config = parameter.config || {};
      const min = config.min ?? 0;
      const max = config.max ?? 100;
      const step = config.step ?? 1;
      const defaultValue = config.default ?? min;
      const currentValue = value ?? defaultValue;
      const minLabel = parameter.values?.[0]?.label;
      const maxLabel = parameter.values?.[1]?.label;

      return (
        <div className="space-y-2 max-w-[400px]">
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
        </div>
      );

    case 'Toggle Switch':
      const onLabel = parameter.values?.on || 'Enabled';
      const offLabel = parameter.values?.off || 'Disabled';
      
      return (
        <div className="flex items-center justify-between">
          <span className="text-sm">{value ? onLabel : offLabel}</span>
          <Switch
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>
      );

    case 'Checkbox':
      return (
        <div className="grid grid-cols-2 gap-2">
          {parameter.values.map((option, index) => {
            // Handle both {id, label} format and {label} format
            const optionId = option.id || `option-${index}`;
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
      );

    case 'Radio':
    case 'Radio Buttons':
      return (
        <div className="grid grid-cols-2 gap-2">
          {parameter.values.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`${parameter.id}-${option.id}`}
                name={parameter.id}
                value={option.id}
                checked={value === option.id}
                onChange={() => onChange(option.id)}
                className="h-4 w-4"
              />
              <label
                htmlFor={`${parameter.id}-${option.id}`}
                className="text-sm"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      );

    case 'Text':
    case 'Input':
      return (
        <div className="max-w-[400px]">
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