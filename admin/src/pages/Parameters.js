import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button, Input, Select } from '../components/ui/form-controls';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../components/ui/dialog';
import { Alert } from '../components/ui/alert';
import config from '../config';

function Parameters() {
  const [parameters, setParameters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newParameter, setNewParameter] = useState({
    name: '',
    description: '',
    type: 'Dropdown',
    category_id: '',
    parameter_values: [],
    visibility: 'Basic',
    required: 0,
    sort_order: 0,
    parameter_config: {
      min: 0,
      max: 100,
      step: 1
    }
  });
  const [editingParameter, setEditingParameter] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/categories`);
      setCategories(response.data.data || []);
    } catch (error) {
      // Don't show alert for empty database
      if (error.response && error.response.status !== 404) {
        showAlert('destructive', 'Failed to fetch categories. Please try again.');
      }
    }
  }, []);

  const fetchParameters = useCallback(async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/parameters`);
      setParameters(response.data.data || []);
    } catch (error) {
      // Don't show alert for empty database
      if (error.response && error.response.status !== 404) {
        showAlert('destructive', 'Failed to fetch parameters. Please try again.');
      }
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchParameters();
  }, [fetchCategories, fetchParameters]);

  const handleAddParameter = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await axios.post(`${config.API_URL}/api/parameters`, newParameter);
      setNewParameter({
        name: '',
        description: '',
        type: 'Dropdown',
        category_id: '',
        parameter_values: [],
        visibility: 'Basic',
        required: 0,
        sort_order: 0,
        parameter_config: {
          min: 0,
          max: 100,
          step: 1
        }
      });
      fetchParameters();
      showAlert('default', 'Parameter added successfully');
    } catch (error) {
      showAlert('destructive', 'Failed to add parameter');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateParameter = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await axios.put(`${config.API_URL}/api/parameters/${editingParameter.id}`, editingParameter);
      setShowModal(false);
      setEditingParameter(null);
      fetchParameters();
      showAlert('default', 'Parameter updated successfully');
    } catch (error) {
      showAlert('destructive', 'Failed to update parameter');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteParameter = async (id) => {
    if (window.confirm('Are you sure you want to delete this parameter?')) {
      try {
        setIsLoading(true);
        await axios.delete(`${config.API_URL}/api/parameters/${id}`);
        fetchParameters();
        showAlert('default', 'Parameter deleted successfully');
      } catch (error) {
        showAlert('destructive', 'Failed to delete parameter');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const showAlert = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: '', message: '' }), 5000);
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
          <h1 className="text-2xl font-bold">Parameters</h1>
          <Button onClick={() => {
            setEditingParameter(null);
            setShowModal(true);
          }}>
            Add New Parameter
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="6" className="text-center text-muted-foreground py-12 px-6">
                        <div className="flex flex-col items-center gap-2">
                          <p>No parameters found</p>
                          <p className="text-xs">Click "Add New Parameter" to create one</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    parameters.map((parameter) => (
                      <TableRow key={parameter.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{parameter.name}</TableCell>
                        <TableCell>
                          <span className="text-sm text-secondary-foreground">
                            {parameter.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {parameter.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell>{categories.find(c => c.id === parameter.category_id)?.name}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center text-xs
                            ${parameter.visibility === 'Basic' 
                             ? 'text-slate-600 dark:text-slate-400' 
                             : 'text-indigo-600 dark:text-indigo-400 font-medium'}`}>
                            {parameter.visibility}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setEditingParameter({...parameter});
                                setShowModal(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive-ghost"
                              size="xs"
                              onClick={() => handleDeleteParameter(parameter.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Parameter Modal */}
      <Dialog 
        isOpen={showModal} 
        onDismiss={() => {
          setShowModal(false);
          setEditingParameter(null);
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingParameter ? 'Edit Parameter' : 'Add New Parameter'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingParameter ? handleUpdateParameter : handleAddParameter} className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="parameterName" className="text-sm font-medium">Name</label>
                  <Input
                    id="parameterName"
                    value={editingParameter ? editingParameter.name : newParameter.name}
                    onChange={(e) => {
                      if (editingParameter) {
                        setEditingParameter({ ...editingParameter, name: e.target.value });
                      } else {
                        setNewParameter({ ...newParameter, name: e.target.value });
                      }
                    }}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Enter a descriptive name</p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="parameterType" className="text-sm font-medium">Type</label>
                  <Select
                    id="parameterType"
                    value={editingParameter ? editingParameter.type : newParameter.type}
                    onChange={(e) => {
                      if (editingParameter) {
                        setEditingParameter({ ...editingParameter, type: e.target.value });
                      } else {
                        setNewParameter({ ...newParameter, type: e.target.value });
                      }
                    }}
                    required
                  >
                    <option value="Dropdown">Dropdown</option>
                    <option value="Slider">Slider</option>
                    <option value="Toggle Switch">Toggle Switch</option>
                    <option value="Radio Buttons">Radio Buttons</option>
                    <option value="Checkbox">Checkbox</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose the input type</p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="parameterCategory" className="text-sm font-medium">Category</label>
                  <Select
                    id="parameterCategory"
                    value={editingParameter ? editingParameter.category_id : newParameter.category_id}
                    onChange={(e) => {
                      if (editingParameter) {
                        setEditingParameter({ ...editingParameter, category_id: e.target.value });
                      } else {
                        setNewParameter({ ...newParameter, category_id: e.target.value });
                      }
                    }}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose the category</p>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="parameterVisibility" className="text-sm font-medium">Visibility</label>
                  <Select
                    id="parameterVisibility"
                    value={editingParameter ? editingParameter.visibility : newParameter.visibility}
                    onChange={(e) => {
                      if (editingParameter) {
                        setEditingParameter({ ...editingParameter, visibility: e.target.value });
                      } else {
                        setNewParameter({ ...newParameter, visibility: e.target.value });
                      }
                    }}
                  >
                    <option value="Basic">Basic</option>
                    <option value="Advanced">Advanced</option>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose visibility level</p>
                </div>
              </div>
              
              {/* Right Column - Type-specific settings and description */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="parameterDescription" className="text-sm font-medium">Description</label>
                  <textarea
                    id="parameterDescription"
                    placeholder="Provide a clear description that explains what this parameter controls..."
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editingParameter ? editingParameter.description : newParameter.description}
                    onChange={(e) => {
                      if (editingParameter) {
                        setEditingParameter({ ...editingParameter, description: e.target.value });
                      } else {
                        setNewParameter({ ...newParameter, description: e.target.value });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">A detailed description helps users understand the purpose and impact of this parameter</p>
                </div>
                
                {/* Type-specific Configuration */}
                {(editingParameter?.type === 'Slider' || (!editingParameter && newParameter.type === 'Slider')) && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Slider Configuration</label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="sliderMin" className="text-xs font-medium">Min</label>
                          <Input
                            id="sliderMin"
                            type="number"
                            value={editingParameter ? editingParameter.parameter_config?.min || 0 : newParameter.parameter_config.min}
                            onChange={(e) => {
                              if (editingParameter) {
                                setEditingParameter({
                                  ...editingParameter,
                                  config: {
                                    ...(editingParameter.parameter_config || {}),
                                    min: parseInt(e.target.value, 10)
                                  }
                                });
                              } else {
                                setNewParameter({
                                  ...newParameter,
                                  config: {
                                    ...newParameter.parameter_config,
                                    min: parseInt(e.target.value, 10)
                                  }
                                });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label htmlFor="sliderMax" className="text-xs font-medium">Max</label>
                          <Input
                            id="sliderMax"
                            type="number"
                            value={editingParameter ? editingParameter.parameter_config?.max || 100 : newParameter.parameter_config.max}
                            onChange={(e) => {
                              if (editingParameter) {
                                setEditingParameter({
                                  ...editingParameter,
                                  config: {
                                    ...(editingParameter.parameter_config || {}),
                                    max: parseInt(e.target.value, 10)
                                  }
                                });
                              } else {
                                setNewParameter({
                                  ...newParameter,
                                  config: {
                                    ...newParameter.parameter_config,
                                    max: parseInt(e.target.value, 10)
                                  }
                                });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label htmlFor="sliderStep" className="text-xs font-medium">Step</label>
                          <Input
                            id="sliderStep"
                            type="number"
                            value={editingParameter ? editingParameter.parameter_config?.step || 1 : newParameter.parameter_config.step}
                            onChange={(e) => {
                              if (editingParameter) {
                                setEditingParameter({
                                  ...editingParameter,
                                  config: {
                                    ...(editingParameter.parameter_config || {}),
                                    step: parseInt(e.target.value, 10)
                                  }
                                });
                              } else {
                                setNewParameter({
                                  ...newParameter,
                                  config: {
                                    ...newParameter.parameter_config,
                                    step: parseInt(e.target.value, 10)
                                  }
                                });
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Slider Labels</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="sliderMinLabel" className="text-xs font-medium">Min Label</label>
                          <Input
                            id="sliderMinLabel"
                            placeholder="Label for minimum value"
                            value={
                              editingParameter
                                ? (Array.isArray(editingParameter.parameter_values) && editingParameter.parameter_values[0]?.label) || ''
                                : (Array.isArray(newParameter.parameter_values) && newParameter.parameter_values[0]?.label) || ''
                            }
                            onChange={(e) => {
                              if (editingParameter) {
                                const updatedValues = Array.isArray(editingParameter.parameter_values) 
                                  ? [...editingParameter.parameter_values] 
                                  : [{}, {}];
                                
                                if (!updatedValues[0]) updatedValues[0] = {};
                                if (!updatedValues[1]) updatedValues[1] = {};
                                
                                updatedValues[0].label = e.target.value;
                                
                                setEditingParameter({
                                  ...editingParameter,
                                  values: updatedValues
                                });
                              } else {
                                const updatedValues = Array.isArray(newParameter.parameter_values)
                                  ? [...newParameter.parameter_values]
                                  : [{}, {}];
                                
                                if (!updatedValues[0]) updatedValues[0] = {};
                                if (!updatedValues[1]) updatedValues[1] = {};
                                
                                updatedValues[0].label = e.target.value;
                                
                                setNewParameter({
                                  ...newParameter,
                                  values: updatedValues
                                });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label htmlFor="sliderMaxLabel" className="text-xs font-medium">Max Label</label>
                          <Input
                            id="sliderMaxLabel"
                            placeholder="Label for maximum value"
                            value={
                              editingParameter
                                ? (Array.isArray(editingParameter.parameter_values) && editingParameter.parameter_values[1]?.label) || ''
                                : (Array.isArray(newParameter.parameter_values) && newParameter.parameter_values[1]?.label) || ''
                            }
                            onChange={(e) => {
                              if (editingParameter) {
                                const updatedValues = Array.isArray(editingParameter.parameter_values)
                                  ? [...editingParameter.parameter_values]
                                  : [{}, {}];
                                
                                if (!updatedValues[0]) updatedValues[0] = {};
                                if (!updatedValues[1]) updatedValues[1] = {};
                                
                                updatedValues[1].label = e.target.value;
                                
                                setEditingParameter({
                                  ...editingParameter,
                                  values: updatedValues
                                });
                              } else {
                                const updatedValues = Array.isArray(newParameter.parameter_values)
                                  ? [...newParameter.parameter_values]
                                  : [{}, {}];
                                
                                if (!updatedValues[0]) updatedValues[0] = {};
                                if (!updatedValues[1]) updatedValues[1] = {};
                                
                                updatedValues[1].label = e.target.value;
                                
                                setNewParameter({
                                  ...newParameter,
                                  values: updatedValues
                                });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Labels to display at the min and max positions of the slider</p>
                    </div>
                  </div>
                )}
                
                {((editingParameter && ['Dropdown', 'Radio Buttons', 'Checkbox'].includes(editingParameter.type)) || 
                  (!editingParameter && ['Dropdown', 'Radio Buttons', 'Checkbox'].includes(newParameter.type))) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Values</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a value"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (newValue.trim()) {
                            if (editingParameter) {
                              setEditingParameter({
                                ...editingParameter,
                                values: [
                                  ...(Array.isArray(editingParameter.parameter_values) ? editingParameter.parameter_values : []), 
                                  { label: newValue.trim() }
                                ]
                              });
                            } else {
                              setNewParameter({
                                ...newParameter,
                                values: [...newParameter.parameter_values, { label: newValue.trim() }]
                              });
                            }
                            setNewValue('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    
                    {((editingParameter && Array.isArray(editingParameter.parameter_values) && editingParameter.parameter_values.length > 0) || 
                      (!editingParameter && newParameter.parameter_values.length > 0)) && (
                      <div className="rounded-md border divide-y mt-2 max-h-[150px] overflow-y-auto">
                        {(editingParameter ? editingParameter.parameter_values : newParameter.parameter_values).map((value, index) => (
                          <div key={index} className="flex justify-between items-center p-2">
                            <span>{value.label || value}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (editingParameter) {
                                  setEditingParameter({
                                    ...editingParameter,
                                    values: editingParameter.parameter_values.filter((_, i) => i !== index)
                                  });
                                } else {
                                  setNewParameter({
                                    ...newParameter,
                                    values: newParameter.parameter_values.filter((_, i) => i !== index)
                                  });
                                }
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {((editingParameter && editingParameter.type === 'Toggle Switch') || 
                  (!editingParameter && newParameter.type === 'Toggle Switch')) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Toggle Labels</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="toggleOn" className="text-xs font-medium">On Label</label>
                        <Input
                          id="toggleOn"
                          placeholder="Yes"
                          value={editingParameter ? 
                            (typeof editingParameter.parameter_values === 'object' && !Array.isArray(editingParameter.parameter_values) ? 
                            editingParameter.parameter_values.on || '' : '') : 
                            (typeof newParameter.parameter_values === 'object' ? newParameter.parameter_values.on || '' : '')}
                          onChange={(e) => {
                            if (editingParameter) {
                              setEditingParameter({
                                ...editingParameter,
                                values: {
                                  ...(typeof editingParameter.parameter_values === 'object' && 
                                    !Array.isArray(editingParameter.parameter_values) ? 
                                    editingParameter.parameter_values : {}),
                                  on: e.target.value
                                }
                              });
                            } else {
                              setNewParameter({
                                ...newParameter,
                                values: {
                                  ...(newParameter.parameter_values || {}),
                                  on: e.target.value
                                }
                              });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="toggleOff" className="text-xs font-medium">Off Label</label>
                        <Input
                          id="toggleOff"
                          placeholder="No"
                          value={editingParameter ? 
                            (typeof editingParameter.parameter_values === 'object' && !Array.isArray(editingParameter.parameter_values) ? 
                            editingParameter.parameter_values.off || '' : '') : 
                            (typeof newParameter.parameter_values === 'object' ? newParameter.parameter_values.off || '' : '')}
                          onChange={(e) => {
                            if (editingParameter) {
                              setEditingParameter({
                                ...editingParameter,
                                values: {
                                  ...(typeof editingParameter.parameter_values === 'object' && 
                                    !Array.isArray(editingParameter.parameter_values) ? 
                                    editingParameter.parameter_values : {}),
                                  off: e.target.value
                                }
                              });
                            } else {
                              setNewParameter({
                                ...newParameter,
                                values: {
                                  ...(newParameter.parameter_values || {}),
                                  off: e.target.value
                                }
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingParameter(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (editingParameter ? 'Updating...' : 'Adding...') : (editingParameter ? 'Update' : 'Add Parameter')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Parameters;