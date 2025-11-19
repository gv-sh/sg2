// src/utils/parameterUtils.js

/**
 * Generate a random value for a parameter based on its type
 */
export const randomizeParameterValue = (parameter) => {
    switch (parameter.type) {
        case 'Dropdown':
        case 'Radio':
        case 'Radio Buttons':
            if (parameter.values?.length) {
                const idx = Math.floor(Math.random() * parameter.values.length);
                return parameter.values[idx].id;
            }
            return null;

        case 'Slider': {
            const config = parameter.config || {};
            const min = config.min ?? 0;
            const max = config.max ?? 100;
            const step = config.step ?? 1;
            const steps = Math.floor((max - min) / step);
            const randomSteps = Math.floor(Math.random() * (steps + 1));
            return min + randomSteps * step;
        }

        case 'Toggle Switch':
            return Math.random() >= 0.5;

        case 'Checkbox': {
            if (parameter.values?.length) {
                const result = [];
                parameter.values.forEach((opt) => {
                    if (Math.random() >= 0.5) result.push(opt.id);
                });
                if (!result.length) {
                    const idx = Math.floor(Math.random() * parameter.values.length);
                    result.push(parameter.values[idx].id);
                }
                return result;
            }
            return [];
        }

        default:
            return null;
    }
};

/**
 * Generate a random year between min and max
 */
export const generateRandomYear = (min = 2050, max = 2150) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};