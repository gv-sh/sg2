// src/utils/parameterUtils.js

/**
 * Generate a random value for a parameter based on its type
 */
export const randomizeParameterValue = (parameter) => {
    switch (parameter.type) {
        case 'select':
        case 'radio':
            if (parameter.parameter_values?.length) {
                const idx = Math.floor(Math.random() * parameter.parameter_values.length);
                return parameter.parameter_values[idx].id || parameter.parameter_values[idx].label;
            }
            return null;

        case 'range': {
            const config = parameter.parameter_config || {};
            const min = config.min ?? 0;
            const max = config.max ?? 100;
            const step = config.step ?? 1;
            const steps = Math.floor((max - min) / step);
            const randomSteps = Math.floor(Math.random() * (steps + 1));
            return min + randomSteps * step;
        }

        case 'boolean':
            return Math.random() >= 0.5;

        case 'text':
            // For text parameters, we can't really generate random meaningful text
            return '';

        default:
            return null;
    }
};

/**
 * Generate a random year between min and max
 */
export const generateRandomYear = (min = 2025, max = 2100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};