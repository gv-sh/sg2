import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/card.tsx';
import { Button, Input, Select, Textarea } from '../../shared/components/ui/form-controls.js';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../shared/components/ui/table.js';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../../shared/components/ui/dialog.js';
import { useToast } from '../../shared/contexts/ToastContext.jsx';
import config from '../config.js';

function Parameters() {
  const [parameters, setParameters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newParameter, setNewParameter] = useState({
    name: '',
    description: '',
    type: 'select',
    category_id: '',
    parameter_values: []
  });
  const [editingParameter, setEditingParameter] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/admin/categories`);
      setCategories(response.data.data || []);
    } catch (error) {
      // Don't show alert for empty database
      if (error.response && error.response.status !== 404) {
        toast.error('Failed to fetch categories. Please try again.');
      }
    }
  }, []);

  const fetchParameters = useCallback(async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/admin/parameters`);
      setParameters(response.data.data || []);
    } catch (error) {
      // Don't show alert for empty database
      if (error.response && error.response.status !== 404) {
        toast.error('Failed to fetch parameters. Please try again.');
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
      await axios.post(`${config.API_URL}/api/admin/parameters`, newParameter);
      setNewParameter({
        name: '',
        description: '',
        type: 'select',
        category_id: '',
        parameter_values: []
      });
      fetchParameters();
      toast.success('Parameter added successfully!');
    } catch (error) {
      toast.error('Failed to add parameter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateParameter = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      // Clean payload: remove undefined values to let backend handle defaults
      const cleanPayload = Object.fromEntries(
        Object.entries(editingParameter).filter(([key, value]) => 
          value !== undefined && key !== 'id' && key !== 'created_at'
        )
      );
      
      console.log('Sending update payload:', cleanPayload);
      
      await axios.put(`${config.API_URL}/api/admin/parameters/${editingParameter.id}`, cleanPayload);
      setShowModal(false);
      setEditingParameter(null);
      fetchParameters();
      toast.success('Parameter updated successfully!');
    } catch (error) {
      console.error('Parameter update failed:', error.response?.data || error);
      toast.error(error.response?.data?.error || 'Failed to update parameter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteParameter = async (id) => {
    if (window.confirm('Are you sure you want to delete this parameter?')) {
      try {
        setIsLoading(true);
        await axios.delete(`${config.API_URL}/api/admin/parameters/${id}`);
        fetchParameters();
        toast.success('Parameter deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete parameter. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };


  return (
    <>
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
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-left w-[200px]">Parameter</TableHead>
                    <TableHead className="text-center w-[80px]">Type</TableHead>
                    <TableHead className="text-left w-[300px]">Description</TableHead>
                    <TableHead className="text-center w-[150px]">Category</TableHead>
                    <TableHead className="w-[140px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="5" className="text-center text-muted-foreground py-12 px-6">
                        <div className="flex flex-col items-center gap-2">
                          <p>No parameters found</p>
                          <p className="text-xs">Click "Add New Parameter" to create one</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    parameters.map((parameter) => (
                      <TableRow key={parameter.id} className="hover:bg-muted/30">
                        <TableCell className="whitespace-nowrap text-left">
                          <div className="flex flex-col">
                            <span className="font-medium truncate">{parameter.name}</span>
                            <code className="text-xs text-muted-foreground font-mono truncate">
                              {parameter.id}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          <span className="text-sm text-secondary-foreground">
                            {parameter.type}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-left max-w-[300px]">
                          <span className="text-sm text-muted-foreground truncate block">
                            {parameter.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center truncate">{categories.find(c => c.id === parameter.category_id)?.name}</TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
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
                      const newType = e.target.value;
                      
                      // For type changes, let the backend initialize appropriate defaults
                      // Don't send conflicting parameter_values during type transitions
                      let typeSpecificData = {};
                      
                      // Only clear parameter_values/config, don't set specific values
                      // This allows the backend to properly initialize defaults
                      switch (newType) {
                        case 'select':
                        case 'radio':
                          // Don't send parameter_values - let backend initialize empty array
                          typeSpecificData = {
                            parameter_config: null
                          };
                          // Remove any existing parameter_values to avoid conflicts
                          break;
                        case 'boolean':
                          // Don't send parameter_values - let backend initialize default labels
                          typeSpecificData = {
                            parameter_config: null
                          };
                          break;
                        case 'range':
                          // Don't send parameter_config - let backend initialize defaults
                          typeSpecificData = {
                            parameter_values: null
                          };
                          break;
                        case 'text':
                        default:
                          // Clear both for simple types
                          typeSpecificData = {
                            parameter_values: null,
                            parameter_config: null
                          };
                          break;
                      }
                      
                      if (editingParameter) {
                        // For existing parameters, remove conflicting values during type changes
                        const updatedParameter = { 
                          ...editingParameter, 
                          type: newType,
                          ...typeSpecificData
                        };
                        
                        // Remove parameter_values if not compatible with new type
                        if ((newType === 'select' || newType === 'radio' || newType === 'boolean') && !typeSpecificData.hasOwnProperty('parameter_values')) {
                          delete updatedParameter.parameter_values;
                        }
                        
                        // Remove parameter_config if not compatible with new type  
                        if (newType === 'range' && !typeSpecificData.hasOwnProperty('parameter_config')) {
                          delete updatedParameter.parameter_config;
                        }
                        
                        setEditingParameter(updatedParameter);
                      } else {
                        setNewParameter({ 
                          ...newParameter, 
                          type: newType,
                          ...typeSpecificData
                        });
                      }
                    }}
                    required
                  >
                    <option value="select">Select (Dropdown)</option>
                    <option value="radio">Radio Buttons</option>
                    <option value="text">Text Input</option>
                    <option value="range">Range Slider</option>
                    <option value="boolean">True/False Toggle</option>
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
                
              </div>
              
              {/* Right Column - Type-specific settings and description */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="parameterDescription" className="text-sm font-medium">Description</label>
                  <Textarea
                    id="parameterDescription"
                    placeholder="Provide a clear description that explains what this parameter controls..."
                    className="min-h-[120px]"
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
                
                
                {((editingParameter && ['select', 'radio'].includes(editingParameter.type)) || 
                  (!editingParameter && ['select', 'radio'].includes(newParameter.type))) && (
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
                                parameter_values: [
                                  ...(Array.isArray(editingParameter.parameter_values) ? editingParameter.parameter_values : []), 
                                  { label: newValue.trim() }
                                ]
                              });
                            } else {
                              setNewParameter({
                                ...newParameter,
                                parameter_values: [...newParameter.parameter_values, { label: newValue.trim() }]
                              });
                            }
                            setNewValue('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    
                    {/* Values list or empty state */}
                    {((editingParameter && Array.isArray(editingParameter.parameter_values) && editingParameter.parameter_values.length > 0) || 
                      (!editingParameter && newParameter.parameter_values.length > 0)) ? (
                      <div className="rounded-none border divide-y mt-2 max-h-[150px] overflow-y-auto bg-muted/30">
                        {(editingParameter ? editingParameter.parameter_values : newParameter.parameter_values).map((value, index) => (
                          <div key={index} className="flex justify-between items-center p-3 hover:bg-muted/50 transition-colors">
                            <span className="text-sm font-medium">{value.label || value}</span>
                            <Button
                              type="button"
                              variant="destructive-ghost"
                              size="xs"
                              onClick={() => {
                                if (editingParameter) {
                                  setEditingParameter({
                                    ...editingParameter,
                                    parameter_values: editingParameter.parameter_values.filter((_, i) => i !== index)
                                  });
                                } else {
                                  setNewParameter({
                                    ...newParameter,
                                    parameter_values: newParameter.parameter_values.filter((_, i) => i !== index)
                                  });
                                }
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-none border mt-2 p-4 bg-muted/20 text-center">
                        <p className="text-sm text-muted-foreground">No values added yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Add values above to create dropdown options</p>
                      </div>
                    )}
                  </div>
                )}
                
                {((editingParameter && editingParameter.type === 'boolean') || 
                  (!editingParameter && newParameter.type === 'boolean')) && (
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
                                parameter_values: {
                                  ...(typeof editingParameter.parameter_values === 'object' && 
                                    !Array.isArray(editingParameter.parameter_values) ? 
                                    editingParameter.parameter_values : {}),
                                  on: e.target.value
                                }
                              });
                            } else {
                              setNewParameter({
                                ...newParameter,
                                parameter_values: {
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
                                parameter_values: {
                                  ...(typeof editingParameter.parameter_values === 'object' && 
                                    !Array.isArray(editingParameter.parameter_values) ? 
                                    editingParameter.parameter_values : {}),
                                  off: e.target.value
                                }
                              });
                            } else {
                              setNewParameter({
                                ...newParameter,
                                parameter_values: {
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
                
                {((editingParameter && editingParameter.type === 'range') || 
                  (!editingParameter && newParameter.type === 'range')) && (
                  <div className="space-y-4">
                    <label className="text-sm font-medium">Range Configuration</label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="rangeMin" className="text-xs font-medium">Min Value</label>
                        <Input
                          id="rangeMin"
                          type="number"
                          placeholder="0"
                          value={editingParameter ? 
                            (typeof editingParameter.parameter_config === 'object' ? 
                            editingParameter.parameter_config?.min || '' : '') : 
                            (typeof newParameter.parameter_config === 'object' ? newParameter.parameter_config?.min || '' : '')}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : Number(e.target.value);
                            if (editingParameter) {
                              setEditingParameter({
                                ...editingParameter,
                                parameter_config: {
                                  ...(typeof editingParameter.parameter_config === 'object' ? 
                                    editingParameter.parameter_config : {}),
                                  min: value
                                }
                              });
                            } else {
                              setNewParameter({
                                ...newParameter,
                                parameter_config: {
                                  ...(newParameter.parameter_config || {}),
                                  min: value
                                }
                              });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="rangeMax" className="text-xs font-medium">Max Value</label>
                        <Input
                          id="rangeMax"
                          type="number"
                          placeholder="100"
                          value={editingParameter ? 
                            (typeof editingParameter.parameter_config === 'object' ? 
                            editingParameter.parameter_config?.max || '' : '') : 
                            (typeof newParameter.parameter_config === 'object' ? newParameter.parameter_config?.max || '' : '')}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : Number(e.target.value);
                            if (editingParameter) {
                              setEditingParameter({
                                ...editingParameter,
                                parameter_config: {
                                  ...(typeof editingParameter.parameter_config === 'object' ? 
                                    editingParameter.parameter_config : {}),
                                  max: value
                                }
                              });
                            } else {
                              setNewParameter({
                                ...newParameter,
                                parameter_config: {
                                  ...(newParameter.parameter_config || {}),
                                  max: value
                                }
                              });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="rangeStep" className="text-xs font-medium">Step</label>
                        <Input
                          id="rangeStep"
                          type="number"
                          placeholder="1"
                          min="0.01"
                          step="0.01"
                          value={editingParameter ? 
                            (typeof editingParameter.parameter_config === 'object' ? 
                            editingParameter.parameter_config?.step || '' : '') : 
                            (typeof newParameter.parameter_config === 'object' ? newParameter.parameter_config?.step || '' : '')}
                          onChange={(e) => {
                            const value = e.target.value === '' ? '' : Number(e.target.value);
                            if (editingParameter) {
                              setEditingParameter({
                                ...editingParameter,
                                parameter_config: {
                                  ...(typeof editingParameter.parameter_config === 'object' ? 
                                    editingParameter.parameter_config : {}),
                                  step: value
                                }
                              });
                            } else {
                              setNewParameter({
                                ...newParameter,
                                parameter_config: {
                                  ...(newParameter.parameter_config || {}),
                                  step: value
                                }
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="rangeMinLabel" className="text-xs font-medium">Min Label</label>
                        <Input
                          id="rangeMinLabel"
                          type="text"
                          placeholder="e.g. Traditional"
                          value={editingParameter
                            ? (typeof editingParameter.parameter_config === 'object' ? editingParameter.parameter_config?.minLabel || '' : '')
                            : (typeof newParameter.parameter_config === 'object' ? newParameter.parameter_config?.minLabel || '' : '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (editingParameter) {
                              setEditingParameter({ ...editingParameter, parameter_config: { ...(typeof editingParameter.parameter_config === 'object' ? editingParameter.parameter_config : {}), minLabel: value } });
                            } else {
                              setNewParameter({ ...newParameter, parameter_config: { ...(newParameter.parameter_config || {}), minLabel: value } });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label htmlFor="rangeMaxLabel" className="text-xs font-medium">Max Label</label>
                        <Input
                          id="rangeMaxLabel"
                          type="text"
                          placeholder="e.g. Charismatic"
                          value={editingParameter
                            ? (typeof editingParameter.parameter_config === 'object' ? editingParameter.parameter_config?.maxLabel || '' : '')
                            : (typeof newParameter.parameter_config === 'object' ? newParameter.parameter_config?.maxLabel || '' : '')}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (editingParameter) {
                              setEditingParameter({ ...editingParameter, parameter_config: { ...(typeof editingParameter.parameter_config === 'object' ? editingParameter.parameter_config : {}), maxLabel: value } });
                            } else {
                              setNewParameter({ ...newParameter, parameter_config: { ...(newParameter.parameter_config || {}), maxLabel: value } });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Configure the range slider limits, step, and optional endpoint labels</p>
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