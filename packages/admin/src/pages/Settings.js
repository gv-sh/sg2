import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config, { updateApiUrl } from '../config';
import '../index.css';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button, Input, Textarea, Select } from '../components/ui/form-controls';
import { Badge } from '../components/ui/badge';
import { Alert } from '../components/ui/alert';

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
  defaults: { content_type: 'fiction' }
};

function Settings() {
  const [settings, setSettings] = useState({
    ai: {
      models: {
        fiction: '',
        image: ''
      },
      parameters: {
        fiction: {
          temperature: 0,
          max_tokens: 0,
          default_story_length: 0,
          system_prompt: ''
        },
        image: {
          size: '',
          quality: '',
          prompt_suffix: ''
        }
      }
    },
    defaults: {
      content_type: ''
    }
  });
  const [apiUrl, setApiUrl] = useState(config.API_URL);
  const [serverStatus, setServerStatus] = useState('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${config.API_URL}/api/settings`);
      setSettings(response.data.data);
    } catch (error) {
      showAlert('danger', 'Failed to fetch settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    
    // Test connection on initial load
    const checkServerStatus = async () => {
      try {
        const pingUrl = `${config.API_URL}/api/health/ping`;
        const response = await axios.get(pingUrl, { timeout: 3000 });
        
        if (response.status === 200 && response.data && response.data.message === 'pong') {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (error) {
        setServerStatus('offline');
      }
    };
    
    checkServerStatus();
  }, [fetchSettings]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await axios.put(`${config.API_URL}/api/settings`, settings);
      showAlert('success', 'Settings updated successfully');
    } catch (error) {
      showAlert('danger', 'Failed to update settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      try {
        setIsLoading(true);
        const response = await axios.post(`${config.API_URL}/api/settings/reset`);
        setSettings(response.data.data);
        showAlert('success', 'Settings reset to defaults');
      } catch (error) {
        showAlert('danger', 'Failed to reset settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const testConnection = async (e) => {
    e.preventDefault();
    setIsTesting(true);
    try {
      const pingUrl = `${apiUrl}/api/health/ping`;
      const response = await axios.get(pingUrl, { timeout: 5000 });
      
      if (response.status === 200 && response.data && response.data.message === 'pong') {
        setServerStatus('online');
        showAlert('success', 'Successfully connected to the API server!');
      } else {
        setServerStatus('offline');
        showAlert('danger', 'Server responded but with unexpected data');
      }
    } catch (error) {
      setServerStatus('offline');
      showAlert('danger', `Failed to connect to API server: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const saveConnection = (e) => {
    e.preventDefault();
    if (updateApiUrl(apiUrl)) {
      showAlert('success', 'API URL updated successfully');
      // Force reload to apply the new API URL to all components
      window.location.reload();
    } else {
      showAlert('danger', 'Failed to update API URL');
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  return (
    <>
      {/* Alert Messages */}
      {alert.show && (
        <Alert 
          variant={alert.type === 'success' ? 'default' : alert.type === 'danger' ? 'destructive' : 'secondary'} 
          onDismiss={() => setAlert({ show: false, type: '', message: '' })}
          className="mb-6"
        >
          {alert.message}
        </Alert>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Server Connection Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>API Server Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label htmlFor="apiUrl" className="text-sm font-medium">API Server URL</label>
                  <div className="flex space-x-2">
                    <Input
                      id="apiUrl"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="http://localhost:3000"
                      className="flex-1"
                    />
                    <Button 
                      type="button"
                      variant={serverStatus === 'online' ? 'default' : serverStatus === 'offline' ? 'destructive' : 'secondary'}
                      onClick={testConnection}
                      disabled={isTesting}
                    >
                      {isTesting ? 'Testing...' : 'Test'}
                    </Button>
                    <Button 
                      type="button"
                      onClick={saveConnection}
                      disabled={isTesting || apiUrl === config.API_URL}
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the base URL of your API server without /api (e.g., http://localhost:3000)
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Server Status</label>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={serverStatus === 'online' ? 'default' : serverStatus === 'offline' ? 'destructive' : 'secondary'}
                      className="p-2"
                    >
                      {serverStatus === 'online' ? 'Connected' : 
                       serverStatus === 'offline' ? 'Disconnected' : 
                       'Unknown'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {serverStatus === 'online' ? 'API server is reachable' : 
                       serverStatus === 'offline' ? 'Cannot reach API server' : 
                       'Connection status unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Models Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>AI Models</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="fictionModel" className="text-sm font-medium">Fiction Model</label>
                  <Input
                    id="fictionModel"
                    value={settings.ai.models.fiction}
                    onChange={(e) => handleSettingsChange('ai', 'models', 'fiction', e.target.value)}
                    className={settings.ai.models.fiction !== DEFAULT_SETTINGS.ai.models.fiction ? 'border border-yellow-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI model used for fiction generation (e.g., "gpt-4o-mini")
                  </p>
                </div>
                <div className="space-y-2">
                  <label htmlFor="imageModel" className="text-sm font-medium">Image Model</label>
                  <Input
                    id="imageModel"
                    value={settings.ai.models.image}
                    onChange={(e) => handleSettingsChange('ai', 'models', 'image', e.target.value)}
                    className={settings.ai.models.image !== DEFAULT_SETTINGS.ai.models.image ? 'border border-yellow-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI model used for image generation (e.g., "dall-e-3")
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
                    className={settings.ai.parameters.fiction.temperature !== DEFAULT_SETTINGS.ai.parameters.fiction.temperature ? 'border border-yellow-500' : ''}
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
                    className={settings.ai.parameters.fiction.max_tokens !== DEFAULT_SETTINGS.ai.parameters.fiction.max_tokens ? 'border border-yellow-500' : ''}
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
                    className={settings.ai.parameters.fiction.default_story_length !== DEFAULT_SETTINGS.ai.parameters.fiction.default_story_length ? 'border border-yellow-500' : ''}
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
                    className={settings.ai.parameters.fiction.system_prompt !== DEFAULT_SETTINGS.ai.parameters.fiction.system_prompt ? 'border border-yellow-500' : ''}
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
                    className={settings.ai.parameters.image.prompt_suffix !== DEFAULT_SETTINGS.ai.parameters.image.prompt_suffix ? 'border border-yellow-500' : ''}
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
                    className={settings.ai.parameters.image.size !== DEFAULT_SETTINGS.ai.parameters.image.size ? 'border border-yellow-500' : ''}
                  >
                    <option value="256x256">256x256</option>
                    <option value="512x512">512x512</option>
                    <option value="1024x1024">1024x1024</option>
                    <option value="1792x1024">1792x1024</option>
                    <option value="1024x1792">1024x1792</option>
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
                    className={settings.ai.parameters.image.quality !== DEFAULT_SETTINGS.ai.parameters.image.quality ? 'border border-yellow-500' : ''}
                  >
                    <option value="standard">Standard</option>
                    <option value="hd">HD</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Quality of generated images
                  </p>
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