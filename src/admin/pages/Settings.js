import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config.js';
import '../../index.css';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/card.tsx';
import { Button, Input, Textarea, Select } from '../../shared/components/ui/form-controls.js';
import { Badge } from '../../shared/components/ui/badge.tsx';
import { useToast } from '../../shared/contexts/ToastContext.jsx';

// Default settings for highlighting
const DEFAULT_SETTINGS = {
  ai: {
    models: { fiction: 'gpt-4o-mini', image: 'dall-e-3' },
    parameters: {
      fiction: { 
        temperature: 1.0, 
        max_tokens: 1000, 
        default_story_length: 500,
        system_prompt: "You are a speculative fiction generator trained to create vivid, original, and thought-provoking stories from the Global South—particularly Africa, Asia, and Latin America, with special focus on India. Your goal is to craft speculative fiction rooted deeply in the region's cultural, ecological, historical, and socio-political realities, while imagining bold, layered futures.\n\nEach story must:\n- Be grounded in the specific cultural and traditional context of the selected region.\n- Establish a logical continuity between the present year (e.g., 2025) and a user-defined future, showing how current realities evolve into future scenarios.\n- Be driven by the world-building parameters provided by the user. These parameters define societal structures, technologies, environments, and ideologies—use them as the foundation for constructing the speculative world.\n- Reflect the narrative parameters to shape voice, tone, style, and structure.\n\nGeneration Guidelines:\n- Begin from a recognizable present or near-present context, then extrapolate plausibly into the future.\n- Translate the user-defined world-building parameters into concrete details—institutions, environments, economies, belief systems, and everyday life.\n- Infuse speculative elements with grounding in local histories, belief systems, and lived realities.\n- Let the narrative parameters guide how the story is told—not just what happens.\n- Avoid Western-centric tropes. Think from within the chosen region's worldview—its languages, philosophies, conflicts, mythologies, and ways of knowing."
      },
      image: { 
        size: '1024x1024', 
        quality: 'standard',
        prompt_suffix: "Create a photorealistic, visually rich and emotionally resonant scene inspired by the story. Include key narrative elements in the composition. Place characters from the story in the foreground with expressive, human-like features, posture, and emotion that reflect their role or experience in the narrative. Design the background to subtly or symbolically represent the setting, mood, or major events of the story. Do not include any text or lettering in the image. Let the image convey the story purely through visual form, composition, and atmosphere."
      }
    }
  },
  instagram: {
    default_caption: '{title}\n\n{intro}\n\nSet in the year {year}\n\nThemes: {themes}\nMood: {mood}\n\nGenerated with AI • Speculative Fiction • Created with Futures of Hope\n\n{hashtags}\n\nWhat future do you envision? Share your thoughts below!\n\n#carousel #story #fiction'
  },
  defaults: { content_type: 'fiction' }
};

function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState({ fiction: [], image: [] });
  const toast = useToast();

  // Unflatten settings from backend format
  const unflattenSettings = (flatSettings) => {
    const settings = {
      ai: {
        models: {
          fiction: flatSettings['ai.models.fiction'] || DEFAULT_SETTINGS.ai.models.fiction,
          image: flatSettings['ai.models.image'] || DEFAULT_SETTINGS.ai.models.image
        },
        parameters: {
          fiction: {
            temperature: flatSettings['ai.parameters.fiction.temperature'] ?? DEFAULT_SETTINGS.ai.parameters.fiction.temperature,
            max_tokens: flatSettings['ai.parameters.fiction.max_tokens'] ?? DEFAULT_SETTINGS.ai.parameters.fiction.max_tokens,
            default_story_length: flatSettings['ai.parameters.fiction.default_story_length'] ?? DEFAULT_SETTINGS.ai.parameters.fiction.default_story_length,
            system_prompt: flatSettings['ai.parameters.fiction.system_prompt'] || DEFAULT_SETTINGS.ai.parameters.fiction.system_prompt
          },
          image: {
            size: flatSettings['ai.parameters.image.size'] || DEFAULT_SETTINGS.ai.parameters.image.size,
            quality: flatSettings['ai.parameters.image.quality'] || DEFAULT_SETTINGS.ai.parameters.image.quality,
            prompt_suffix: flatSettings['ai.parameters.image.prompt_suffix'] || DEFAULT_SETTINGS.ai.parameters.image.prompt_suffix
          }
        }
      },
      instagram: {
        default_caption: flatSettings['instagram.default_caption'] || DEFAULT_SETTINGS.instagram.default_caption
      },
      defaults: {
        content_type: flatSettings['defaults.content_type'] || DEFAULT_SETTINGS.defaults.content_type
      }
    };
    return settings;
  };

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${config.API_URL}/api/admin/settings`);
      
      // Backend returns flat key-value pairs
      const fetchedSettings = response.data?.data || {};
      const structuredSettings = unflattenSettings(fetchedSettings);
      
      setSettings(structuredSettings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      // On error, use default settings instead of leaving undefined
      setSettings(DEFAULT_SETTINGS);
      toast.error('Failed to fetch settings. Using default values.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailableModels = useCallback(async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/admin/models`);
      setAvailableModels(response.data?.data || { fiction: [], image: [] });
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      toast.error('Failed to load available models.');
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchAvailableModels();
  }, [fetchSettings, fetchAvailableModels]);

  const handleSettingsChange = (section, subsection, field, value) => {
    if (subsection) {
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [field]: value
          }
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    }
  };

  // Flatten settings for backend API
  const flattenSettings = (settingsObj) => {
    const flattened = {};
    
    // AI models
    flattened['ai.models.fiction'] = settingsObj.ai.models.fiction;
    flattened['ai.models.image'] = settingsObj.ai.models.image;
    
    // AI parameters - fiction
    flattened['ai.parameters.fiction.temperature'] = settingsObj.ai.parameters.fiction.temperature;
    flattened['ai.parameters.fiction.max_tokens'] = settingsObj.ai.parameters.fiction.max_tokens;
    flattened['ai.parameters.fiction.default_story_length'] = settingsObj.ai.parameters.fiction.default_story_length;
    flattened['ai.parameters.fiction.system_prompt'] = settingsObj.ai.parameters.fiction.system_prompt;
    
    // AI parameters - image
    flattened['ai.parameters.image.size'] = settingsObj.ai.parameters.image.size;
    flattened['ai.parameters.image.quality'] = settingsObj.ai.parameters.image.quality;
    flattened['ai.parameters.image.prompt_suffix'] = settingsObj.ai.parameters.image.prompt_suffix;
    
    // Instagram settings
    flattened['instagram.default_caption'] = settingsObj.instagram.default_caption;
    
    // Defaults
    flattened['defaults.content_type'] = settingsObj.defaults.content_type;
    
    return flattened;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const flatSettings = flattenSettings(settings);
      await axios.put(`${config.API_URL}/api/admin/settings`, flatSettings);
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        // Reset to defaults locally since no reset API endpoint exists
        setSettings(DEFAULT_SETTINGS);
        
        // Optionally save the defaults to backend
        const flatDefaults = flattenSettings(DEFAULT_SETTINGS);
        await axios.put(`${config.API_URL}/api/admin/settings`, flatDefaults);
        
        toast.success('Settings reset to defaults successfully!');
      } catch (error) {
        // If save fails, still keep local defaults
        toast.warning('Settings reset locally, but failed to save to server.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Get available sizes for selected image model
  const getAvailableSizes = () => {
    const currentModel = settings.ai.models.image;
    const modelSpec = availableModels.image.find(model => model.id === currentModel);
    return modelSpec?.sizes || ['1024x1024', '1024x1792', '1792x1024'];
  };

  // Get available qualities for selected image model
  const getAvailableQualities = () => {
    const currentModel = settings.ai.models.image;
    const modelSpec = availableModels.image.find(model => model.id === currentModel);
    return modelSpec?.qualities || ['standard'];
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* AI Models Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>AI Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="fictionModel" className="text-sm font-medium">Fiction Model</label>
                  <Select
                    id="fictionModel"
                    value={settings.ai.models.fiction}
                    onChange={(e) => handleSettingsChange('ai', 'models', 'fiction', e.target.value)}
                    className={settings.ai.models.fiction !== DEFAULT_SETTINGS.ai.models.fiction ? 'border border-destructive' : ''}
                  >
                    {availableModels.fiction.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The AI model used for fiction generation
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="imageModel" className="text-sm font-medium">Image Model</label>
                  <Select
                    id="imageModel"
                    value={settings.ai.models.image}
                    onChange={(e) => handleSettingsChange('ai', 'models', 'image', e.target.value)}
                    className={settings.ai.models.image !== DEFAULT_SETTINGS.ai.models.image ? 'border border-destructive' : ''}
                  >
                    {availableModels.image.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The AI model used for image generation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fiction Generation Parameters Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Fiction Generation Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="temperature" className="text-sm font-medium">Temperature</label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={settings.ai.parameters.fiction.temperature}
                    onChange={(e) => handleSettingsChange('ai', 'parameters', 'fiction', {
                      ...settings.ai.parameters.fiction,
                      temperature: parseFloat(e.target.value)
                    })}
                    className={settings.ai.parameters.fiction.temperature !== DEFAULT_SETTINGS.ai.parameters.fiction.temperature ? 'border border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Controls randomness (0.0 to 2.0)
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="maxTokens" className="text-sm font-medium">Max Tokens</label>
                  <Input
                    id="maxTokens"
                    type="number"
                    step="100"
                    min="100"
                    value={settings.ai.parameters.fiction.max_tokens}
                    onChange={(e) => handleSettingsChange('ai', 'parameters', 'fiction', {
                      ...settings.ai.parameters.fiction,
                      max_tokens: parseInt(e.target.value, 10)
                    })}
                    className={settings.ai.parameters.fiction.max_tokens !== DEFAULT_SETTINGS.ai.parameters.fiction.max_tokens ? 'border border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum tokens to generate
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="storyLength" className="text-sm font-medium">Default Story Length</label>
                  <Input
                    id="storyLength"
                    type="number"
                    step="100"
                    min="100"
                    value={settings.ai.parameters.fiction.default_story_length}
                    onChange={(e) => handleSettingsChange('ai', 'parameters', 'fiction', {
                      ...settings.ai.parameters.fiction,
                      default_story_length: parseInt(e.target.value, 10)
                    })}
                    className={settings.ai.parameters.fiction.default_story_length !== DEFAULT_SETTINGS.ai.parameters.fiction.default_story_length ? 'border border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default story length in words
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Prompts Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>System Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="systemPrompt" className="text-sm font-medium">Fiction Generation System Prompt</label>
                  <Textarea
                    id="systemPrompt"
                    rows={8}
                    value={settings.ai.parameters.fiction.system_prompt || ''}
                    onChange={(e) => handleSettingsChange('ai', 'parameters', 'fiction', {
                      ...settings.ai.parameters.fiction,
                      system_prompt: e.target.value
                    })}
                    className={settings.ai.parameters.fiction.system_prompt !== DEFAULT_SETTINGS.ai.parameters.fiction.system_prompt ? 'border border-destructive' : ''}
                    placeholder="Enter the system prompt that guides the AI's fiction generation behavior..."
                  />
                  <p className="text-xs text-muted-foreground">
                    This prompt defines how the AI should behave when generating fiction content. It sets the tone, style, and approach for story generation.
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="imagePromptSuffix" className="text-sm font-medium">Image Generation Prompt Suffix</label>
                  <Textarea
                    id="imagePromptSuffix"
                    rows={4}
                    value={settings.ai.parameters.image.prompt_suffix || ''}
                    onChange={(e) => handleSettingsChange('ai', 'parameters', 'image', {
                      ...settings.ai.parameters.image,
                      prompt_suffix: e.target.value
                    })}
                    className={settings.ai.parameters.image.prompt_suffix !== DEFAULT_SETTINGS.ai.parameters.image.prompt_suffix ? 'border border-destructive' : ''}
                    placeholder="Enter the suffix added to all image generation prompts..."
                  />
                  <p className="text-xs text-muted-foreground">
                    This text is automatically added to the end of all image generation prompts to ensure consistent style and quality.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image Generation Parameters Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Image Generation Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="imageSize" className="text-sm font-medium">Image Size</label>
                  <Select
                    id="imageSize"
                    value={settings.ai.parameters.image.size}
                    onChange={(e) => handleSettingsChange('ai', 'parameters', 'image', {
                      ...settings.ai.parameters.image,
                      size: e.target.value
                    })}
                    className={settings.ai.parameters.image.size !== DEFAULT_SETTINGS.ai.parameters.image.size ? 'border border-destructive' : ''}
                  >
                    {getAvailableSizes().map(size => (
                      <option key={size} value={size}>
                        {size.replace('x', '×')}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Size of generated images
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="imageQuality" className="text-sm font-medium">Image Quality</label>
                  <Select
                    id="imageQuality"
                    value={settings.ai.parameters.image.quality}
                    onChange={(e) => handleSettingsChange('ai', 'parameters', 'image', {
                      ...settings.ai.parameters.image,
                      quality: e.target.value
                    })}
                    className={settings.ai.parameters.image.quality !== DEFAULT_SETTINGS.ai.parameters.image.quality ? 'border border-destructive' : ''}
                  >
                    {getAvailableQualities().map(quality => (
                      <option key={quality} value={quality}>
                        {quality.charAt(0).toUpperCase() + quality.slice(1)}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Quality of generated images
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instagram Settings Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Instagram Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="instagramCaption" className="text-sm font-medium">Default Instagram Caption Template</label>
                  <Textarea
                    id="instagramCaption"
                    rows={10}
                    value={settings.instagram.default_caption || ''}
                    onChange={(e) => handleSettingsChange('instagram', null, 'default_caption', e.target.value)}
                    className={settings.instagram.default_caption !== DEFAULT_SETTINGS.instagram.default_caption ? 'border border-destructive' : ''}
                    placeholder="Enter the default caption template for Instagram posts..."
                  />
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        This template is used when sharing stories to Instagram. Use template variables for dynamic content:
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1 pl-2">
                        <div><code className="bg-muted px-1 rounded text-xs">{'{title}'}</code> - Story title</div>
                        <div><code className="bg-muted px-1 rounded text-xs">{'{intro}'}</code> - Thematic introduction</div>
                        <div><code className="bg-muted px-1 rounded text-xs">{'{year}'}</code> - Story year</div>
                        <div><code className="bg-muted px-1 rounded text-xs">{'{themes}'}</code> - Comma-separated themes</div>
                        <div><code className="bg-muted px-1 rounded text-xs">{'{mood}'}</code> - Story mood</div>
                        <div><code className="bg-muted px-1 rounded text-xs">{'{hashtags}'}</code> - Generated hashtags</div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <span className={settings.instagram.default_caption?.length > 2000 ? 'text-destructive' : ''}>
                        {settings.instagram.default_caption?.length || 0}/2200
                      </span>
                      <div className="text-xs mt-1">characters</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleReset} 
              disabled={isLoading}
            >
              Reset to Defaults
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}

export default Settings;