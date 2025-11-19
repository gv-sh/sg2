import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button, Input, Select } from '../components/ui/form-controls';
import { Badge } from '../components/ui/badge';
import { Alert } from '../components/ui/alert';
import config from '../config';

function Generate() {
  const [categories, setCategories] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [contentType, setContentType] = useState('fiction');
  const [year, setYear] = useState('');
  const [title, setTitle] = useState('');
  const [parameterValues, setParameterValues] = useState({});
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${config.API_URL}/api/categories`);
        setCategories(response.data.data || []);
      } catch (error) {
        showAlert('destructive', 'Failed to fetch categories. Please try again.');
      }
    };

    fetchCategories();
  }, []);

  // Fetch parameters when category changes
  useEffect(() => {
    const fetchParameters = async () => {
      if (!selectedCategory) {
        setParameters([]);
        setParameterValues({});
        return;
      }

      try {
        const response = await axios.get(`${config.API_URL}/api/parameters?categoryId=${selectedCategory}`);
        setParameters(response.data.data || []);
        
        // Initialize parameter values
        const initialValues = {};
        response.data.data.forEach(param => {
          if (param.type === 'Toggle Switch') {
            initialValues[param.id] = false;
          } else if (param.type === 'Slider') {
            initialValues[param.id] = param.parameter_config?.min || 0;
          } else if (param.type === 'Checkbox') {
            initialValues[param.id] = [];
          } else {
            initialValues[param.id] = param.parameter_values && param.parameter_values.length > 0 ? 
              (param.parameter_values[0].id || param.parameter_values[0].label) : '';
          }
        });

        setParameterValues(initialValues);
      } catch (error) {
        showAlert('destructive', 'Failed to fetch parameters. Please try again.');
      }
    };

    fetchParameters();
  }, [selectedCategory]);

  const handleParameterChange = (paramId, value) => {
    setParameterValues(prev => ({
      ...prev,
      [paramId]: value
    }));
  };

  const handleGenerate = async () => {
    if (!selectedCategory) {
      showAlert('destructive', 'Please select a category');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setResult(null);
      
      const payload = {
        parameterValues: {
          [selectedCategory]: parameterValues
        },
        contentType
      };
      
      if (year) {
        payload.year = parseInt(year, 10);
      }
      
      if (title) {
        payload.title = title;
      }
      
      const response = await axios.post(`${config.API_URL}/api/generate`, payload);
      setResult(response.data);
      showAlert('default', 'Content generated successfully! Saving...');
      
      // Automatically save the generated content
      try {
        setIsSaving(true);
        
        // Prepare the content object to save
        const contentToSave = {
          title: title || response.data.title || 'Generated Content',
          prompt_data: {
            [selectedCategory]: parameterValues
          }
        };

        if (year) {
          contentToSave.year = parseInt(year, 10);
        }

        if (contentType === 'fiction' || contentType === 'combined') {
          contentToSave.fiction_content = response.data.fiction_content || response.data.content;
        }

        if (contentType === 'image' || contentType === 'combined') {
          contentToSave.image_blob = response.data.image_blob || response.data.imageData;
        }

        if (response.data.metadata) {
          contentToSave.metadata = response.data.metadata;
        }
        
        // Save to content collection
        await axios.post(`${config.API_URL}/api/content`, contentToSave);
        showAlert('default', 'Content generated and saved successfully!');

      } catch (saveError) {
        showAlert('destructive', 'Content generated but could not be saved automatically.');
      } finally {
        setIsSaving(false);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to generate content. Please try again.');
      showAlert('destructive', 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // This function is no longer used as content is saved automatically after generation
  // Keeping the function stub here for potential future use

  const showAlert = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: '', message: '' }), 5000);
  };

  const renderParameterInput = (param) => {
    switch (param.type) {
      case 'Dropdown':
        return (
          <Select
            id={`param-${param.id}`}
            value={parameterValues[param.id] || ''}
            onChange={(e) => handleParameterChange(param.id, e.target.value)}
            className="w-full"
          >
            {param.parameter_values && param.parameter_values.map((value, index) => (
              <option key={value.id || index} value={value.id || value.label}>
                {value.label}
              </option>
            ))}
          </Select>
        );
      
      case 'Slider':
        return (
          <div className="space-y-2">
            <Input
              id={`param-${param.id}`}
              type="range"
              min={param.parameter_config?.min || 0}
              max={param.parameter_config?.max || 100}
              step={param.parameter_config?.step || 1}
              value={parameterValues[param.id] || param.parameter_config?.min || 0}
              onChange={(e) => handleParameterChange(param.id, parseInt(e.target.value, 10))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{param.parameter_config?.min || 0}</span>
              <span>{parameterValues[param.id] || param.parameter_config?.min || 0}</span>
              <span>{param.parameter_config?.max || 100}</span>
            </div>
          </div>
        );
      
      case 'Toggle Switch':
        return (
          <div className="flex items-center space-x-2">
            <input
              id={`param-${param.id}`}
              type="checkbox"
              checked={!!parameterValues[param.id]}
              onChange={(e) => handleParameterChange(param.id, e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">
              {parameterValues[param.id] ? 
                (param.parameter_values && param.parameter_values.on ? param.parameter_values.on : 'Yes') : 
                (param.parameter_values && param.parameter_values.off ? param.parameter_values.off : 'No')}
            </span>
          </div>
        );
      
      case 'Radio Buttons':
        return (
          <div className="space-y-2">
            {param.parameter_values && param.parameter_values.map((value, index) => (
              <div key={value.id || index} className="flex items-center space-x-2">
                <input
                  id={`param-${param.id}-${value.id || index}`}
                  type="radio"
                  name={`param-${param.id}`}
                  value={value.id || value.label}
                  checked={(parameterValues[param.id] || '') === (value.id || value.label)}
                  onChange={(e) => handleParameterChange(param.id, e.target.value)}
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor={`param-${param.id}-${value.id || index}`} className="text-sm">
                  {value.label}
                </label>
              </div>
            ))}
          </div>
        );
      
      case 'Checkbox':
        return (
          <div className="space-y-2">
            {param.parameter_values && param.parameter_values.map((value, index) => (
              <div key={value.id || index} className="flex items-center space-x-2">
                <input
                  id={`param-${param.id}-${value.id || index}`}
                  type="checkbox"
                  value={value.id || value.label}
                  checked={Array.isArray(parameterValues[param.id]) && 
                    parameterValues[param.id].includes(value.id || value.label)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(parameterValues[param.id]) ? 
                      [...parameterValues[param.id]] : [];
                    
                    if (e.target.checked) {
                      handleParameterChange(param.id, [...currentValues, e.target.value]);
                    } else {
                      handleParameterChange(
                        param.id, 
                        currentValues.filter(v => v !== e.target.value)
                      );
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor={`param-${param.id}-${value.id || index}`} className="text-sm">
                  {value.label}
                </label>
              </div>
            ))}
          </div>
        );
      
      default:
        return <Input id={`param-${param.id}`} value={parameterValues[param.id] || ''} readOnly />;
    }
  };

  return (
    <>
      {/* Alert Messages */}
      {alert.show && (
        <Alert variant={alert.variant} onDismiss={() => setAlert({ show: false, variant: '', message: '' })}>
          {alert.message}
        </Alert>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Generate Content</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Generation Form */}
          <div className="md:col-span-1">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Generation Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">Category</label>
                  <Select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="contentType" className="text-sm font-medium">Content Type</label>
                  <Select
                    id="contentType"
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full"
                  >
                    <option value="fiction">Fiction</option>
                    <option value="image">Image</option>
                    <option value="combined">Combined (Fiction + Image)</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">Title (Optional)</label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for your content"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="year" className="text-sm font-medium">Year (Optional)</label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2085"
                  />
                  <p className="text-xs text-muted-foreground">
                    Specify the year for setting the story
                  </p>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={generating || !selectedCategory}
                  className="w-full"
                >
                  {generating ? 'Generating...' : 'Generate Content'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Parameters */}
          <div className="md:col-span-1">
            <Card className="shadow-sm h-full">
              <CardHeader>
                <CardTitle>Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 overflow-y-auto max-h-[550px] pr-2">
                {!selectedCategory ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a category to see parameters
                  </div>
                ) : parameters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No parameters found for this category
                  </div>
                ) : (
                  parameters.map((param) => (
                    <div key={param.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label htmlFor={`param-${param.id}`} className="text-sm font-medium">
                          {param.name}
                        </label>
                        <Badge variant="outline" className="text-xs">
                          {param.visibility}
                        </Badge>
                      </div>
                      {param.description && (
                        <p className="text-xs text-muted-foreground">{param.description}</p>
                      )}
                      {renderParameterInput(param)}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="md:col-span-1">
            <Card className="shadow-sm h-full">
              <CardHeader>
                <CardTitle>Generated Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <p className="text-sm">{error}</p>
                  </Alert>
                )}

                {generating || isSaving ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {generating ? 'Generating content...' : 'Saving content...'}
                    </p>
                  </div>
                ) : result ? (
                  <div className="space-y-6">
                    <div className="rounded-md bg-primary/10 border border-primary/25 p-3 mb-2">
                      <p className="text-sm text-primary/80">
                        Content has been generated and automatically saved to your content library.
                      </p>
                    </div>

                    {(contentType === 'fiction' || contentType === 'combined') && result.content && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Fiction Content</h3>
                        <div className="border rounded-md p-3 bg-muted/20 max-h-[300px] overflow-y-auto">
                          <p className="text-sm whitespace-pre-line">{result.content}</p>
                        </div>
                      </div>
                    )}

                    {(contentType === 'image' || contentType === 'combined') && result.imageData && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Generated Image</h3>
                        <div className="border rounded-md p-3 flex justify-center bg-muted/20">
                          <img 
                            src={`data:image/png;base64,${result.imageData}`} 
                            alt="Generated" 
                            className="max-w-full max-h-[300px] object-contain rounded-md"
                          />
                        </div>
                      </div>
                    )}

                    {result.metadata && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium">Metadata</h3>
                        <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto bg-muted/20">
                          <pre className="text-xs">{JSON.stringify(result.metadata, null, 2)}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Generated content will appear here
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default Generate;