import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/card.tsx';
import { Button, Input } from '../../shared/components/ui/form-controls.js';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../../shared/components/ui/dialog.js';
import { useToast } from '../../shared/contexts/ToastContext.jsx';
import config from '../config.js';

function Database() {
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showContentResetModal, setShowContentResetModal] = useState(false);

  // Database Export (Full Database)
  const handleExportDatabase = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get(`${config.API_URL}/api/system/database/export`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Server returned status ${response.status}`);
      }

      // Create a JSON string from the response data
      const data = response.data.data || {};
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `specgen-database-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Database exported successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to export database.');
    } finally {
      setIsLoading(false);
    }
  };

  // Content Export (Content Only)
  const handleExportContent = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get(`${config.API_URL}/api/system/database/export/content`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Server returned status ${response.status}`);
      }

      // Create a JSON string from the response data
      const data = response.data.data || [];
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `specgen-content-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Content exported successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to export content.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImportDatabase = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first.');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      await axios.post(`${config.API_URL}/api/system/database/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Database imported successfully!');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to import database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${config.API_URL}/api/system/database/reset`);
      toast.success('Database reset successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetContent = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${config.API_URL}/api/system/database/reset/content`);
      toast.success('Generated content cleared successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to clear content.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Database Management</h1>
          <p className="text-muted-foreground mt-1">Backup, restore, or reset your application database.</p>
        </div>
        
        {/* Full Database Operations */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Database Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Export Database</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-40 justify-between">
                <p className="text-sm text-muted-foreground">Download a complete backup of the entire database including categories, parameters, settings, and generated content.</p>
                <Button 
                  onClick={handleExportDatabase}
                  disabled={isLoading}
                  className="mt-4"
                >
                  {isLoading ? 'Exporting...' : 'Export Database'}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Import Database</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-40 justify-between">
                <p className="text-sm text-muted-foreground">Restore the entire database from a backup file. This will replace all current data.</p>
                <div className="space-y-2 mt-auto">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileSelect}
                    disabled={isLoading}
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowImportModal(true)}
                    disabled={!selectedFile || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Importing...' : 'Import Database'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Reset Database</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-40 justify-between">
                <p className="text-sm text-muted-foreground">Reset the database to its initial state with default data. This action cannot be undone.</p>
                <Button
                  variant="destructive"
                  onClick={() => setShowResetModal(true)}
                  disabled={isLoading}
                  className="mt-4"
                >
                  {isLoading ? 'Resetting...' : 'Reset Database'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Content Management */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Content Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Export Content</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-32 justify-between">
                <p className="text-sm text-muted-foreground">Download only the generated stories and images as a backup.</p>
                <Button 
                  onClick={handleExportContent}
                  disabled={isLoading}
                  className="mt-4"
                >
                  {isLoading ? 'Exporting...' : 'Export Content'}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Clear Content</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-32 justify-between">
                <p className="text-sm text-muted-foreground">Delete all generated stories and images. Categories and parameters will remain unchanged.</p>
                <Button
                  variant="destructive"
                  onClick={() => setShowContentResetModal(true)}
                  disabled={isLoading}
                  className="mt-4"
                >
                  {isLoading ? 'Clearing...' : 'Clear Content'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Import Confirmation Modal */}
      <Dialog 
        isOpen={showImportModal} 
        onDismiss={() => setShowImportModal(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Database Import</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">Are you sure you want to import the database from the selected file?</p>
            <p className="text-sm font-medium text-amber-600 mt-2">This will overwrite ALL current data including categories, parameters, settings, and generated content.</p>
            {selectedFile && (
              <div className="mt-4 p-3 bg-muted rounded-md text-xs">
                <p className="font-medium">Selected file:</p>
                <p className="truncate">{selectedFile.name}</p>
                <p><span className="text-muted-foreground">Size:</span> {Math.round(selectedFile.size / 1024)} KB</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setShowImportModal(false);
                handleImportDatabase();
              }}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Database Confirmation Modal */}
      <Dialog 
        isOpen={showResetModal} 
        onDismiss={() => setShowResetModal(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Database Reset</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">Are you sure you want to reset the entire database?</p>
            <p className="text-sm font-medium text-destructive mt-2">This will delete ALL data and restore default settings. This action cannot be undone.</p>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs"><span className="font-medium">The following will be reset:</span></p>
              <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
                <li>All categories and parameters (restored to defaults)</li>
                <li>All application settings (restored to defaults)</li>
                <li>All generated content (permanently deleted)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowResetModal(false);
                handleResetDatabase();
              }}
            >
              Reset Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Content Confirmation Modal */}
      <Dialog 
        isOpen={showContentResetModal} 
        onDismiss={() => setShowContentResetModal(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Clear Content</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">Are you sure you want to clear all generated content?</p>
            <p className="text-sm font-medium text-destructive mt-2">This will permanently delete all stories and images. Categories and parameters will remain unchanged.</p>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs"><span className="font-medium">The following will be deleted:</span></p>
              <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
                <li>All generated stories</li>
                <li>All generated images</li>
                <li>All content metadata</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowContentResetModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowContentResetModal(false);
                handleResetContent();
              }}
            >
              Clear Content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Database;