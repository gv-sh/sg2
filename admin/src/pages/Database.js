import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button, Input } from '../components/ui/form-controls';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../components/ui/dialog';
import { Alert } from '../components/ui/alert';
import config from '../config';

function Database() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedGenerationsFile, setSelectedGenerationsFile] = useState(null);
  const fileInputRef = useRef(null);
  const generationsFileInputRef = useRef(null);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showGenerationsRestoreModal, setShowGenerationsRestoreModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showGenerationsResetModal, setShowGenerationsResetModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);

  const showAlertMessage = (variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: '', message: '' }), 5000);
  };

  const handleDownloadCategories = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get(`${config.API_URL}/api/database/download`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Server returned status ${response.status}`);
      }

      // Create a JSON string from the response data
      // If the database is empty, use an empty object as the default
      const data = response.data || {};
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'database.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showAlertMessage('success', 'Database downloaded successfully');
    } catch (err) {
      showAlertMessage('danger', err.response?.data?.error || 'Failed to download database');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownloadGenerations = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get(`${config.API_URL}/api/database/generations/download`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Server returned status ${response.status}`);
      }

      // Create a JSON string from the response data
      // If the database is empty, use an empty object as the default
      const data = response.data || {};
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'generations.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showAlertMessage('success', 'Generations database downloaded successfully');
    } catch (err) {
      showAlertMessage('danger', err.response?.data?.error || 'Failed to download generations database');
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
  
  const handleGenerationsFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedGenerationsFile(file);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      showAlertMessage('danger', 'Please select a file first');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      await axios.post(`${config.API_URL}/api/database/restore`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      showAlertMessage('success', 'Database restored successfully');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      showAlertMessage('danger', err.response?.data?.error || 'Failed to restore database');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerationsRestore = async () => {
    if (!selectedGenerationsFile) {
      showAlertMessage('danger', 'Please select a file first');
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', selectedGenerationsFile);

      await axios.post(`${config.API_URL}/api/database/generations/restore`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      showAlertMessage('success', 'Generations database restored successfully');
      setSelectedGenerationsFile(null);
      if (generationsFileInputRef.current) {
        generationsFileInputRef.current.value = '';
      }
    } catch (err) {
      showAlertMessage('danger', err.response?.data?.error || 'Failed to restore generations database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${config.API_URL}/api/database/reset`);
      showAlertMessage('success', 'Database reset successfully');
    } catch (err) {
      showAlertMessage('danger', err.response?.data?.error || 'Failed to reset database');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerationsReset = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${config.API_URL}/api/database/generations/reset`);
      showAlertMessage('success', 'Generations database reset successfully');
    } catch (err) {
      showAlertMessage('danger', err.response?.data?.error || 'Failed to reset generations database');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResetAll = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${config.API_URL}/api/database/reset-all`);
      showAlertMessage('success', 'All databases reset successfully');
    } catch (err) {
      showAlertMessage('danger', err.response?.data?.error || 'Failed to reset all databases');
    } finally {
      setIsLoading(false);
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
        <div>
          <h1 className="text-2xl font-bold">Database Management</h1>
          <p className="text-muted-foreground mt-1">Backup, restore, or reset your application databases.</p>
        </div>
        
        {/* Categories & Parameters Database */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Categories & Parameters Database</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Download Database</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-40 justify-between">
                <p className="text-sm text-muted-foreground">Download a complete backup of the categories and parameters database.</p>
                <Button 
                  onClick={handleDownloadCategories}
                  disabled={isLoading}
                  className="mt-4"
                >
                  {isLoading ? 'Downloading...' : 'Download Database'}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Restore Database</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-40 justify-between">
                <p className="text-sm text-muted-foreground">Restore the categories and parameters database from a backup file.</p>
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
                    onClick={() => setShowRestoreModal(true)}
                    disabled={!selectedFile || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Restoring...' : 'Restore Database'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Reset Database</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-40 justify-between">
                <p className="text-sm text-muted-foreground">Reset the categories and parameters database to its initial state. This action cannot be undone.</p>
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
        
        {/* Generations Database */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Generations Database</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Download Generations</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-40 justify-between">
                <p className="text-sm text-muted-foreground">Download a complete backup of the generations database.</p>
                <Button 
                  onClick={handleDownloadGenerations}
                  disabled={isLoading}
                  className="mt-4"
                >
                  {isLoading ? 'Downloading...' : 'Download Generations'}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Restore Generations</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-40 justify-between">
                <p className="text-sm text-muted-foreground">Restore the generations database from a backup file.</p>
                <div className="space-y-2 mt-auto">
                  <Input
                    type="file"
                    ref={generationsFileInputRef}
                    accept=".json"
                    onChange={handleGenerationsFileSelect}
                    disabled={isLoading}
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowGenerationsRestoreModal(true)}
                    disabled={!selectedGenerationsFile || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Restoring...' : 'Restore Generations'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Reset Generations</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-40 justify-between">
                <p className="text-sm text-muted-foreground">Reset the generations database to its initial state. This action cannot be undone.</p>
                <Button
                  variant="destructive"
                  onClick={() => setShowGenerationsResetModal(true)}
                  disabled={isLoading}
                  className="mt-4"
                >
                  {isLoading ? 'Resetting...' : 'Reset Generations'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Reset All */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Databases</h2>
          <div className="grid grid-cols-1 gap-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Reset All Databases</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-between">
                <p className="text-sm text-muted-foreground">Reset all databases to their initial state. This action cannot be undone and will affect both the categories/parameters database and the generations database.</p>
                <Button
                  variant="destructive"
                  onClick={() => setShowResetAllModal(true)}
                  disabled={isLoading}
                  className="mt-4 w-full md:w-auto"
                >
                  {isLoading ? 'Resetting...' : 'Reset All Databases'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <Dialog 
        isOpen={showRestoreModal} 
        onDismiss={() => setShowRestoreModal(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Restore</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">Are you sure you want to restore the categories & parameters database from the selected file?</p>
            <p className="text-sm font-medium text-amber-600 mt-2">This will overwrite all current categories & parameters data.</p>
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
              onClick={() => setShowRestoreModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setShowRestoreModal(false);
                handleRestore();
              }}
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Generations Restore Confirmation Modal */}
      <Dialog 
        isOpen={showGenerationsRestoreModal} 
        onDismiss={() => setShowGenerationsRestoreModal(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Generations Restore</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">Are you sure you want to restore the generations database from the selected file?</p>
            <p className="text-sm font-medium text-amber-600 mt-2">This will overwrite all current generations data.</p>
            {selectedGenerationsFile && (
              <div className="mt-4 p-3 bg-muted rounded-md text-xs">
                <p className="font-medium">Selected file:</p>
                <p className="truncate">{selectedGenerationsFile.name}</p>
                <p><span className="text-muted-foreground">Size:</span> {Math.round(selectedGenerationsFile.size / 1024)} KB</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGenerationsRestoreModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setShowGenerationsRestoreModal(false);
                handleGenerationsRestore();
              }}
            >
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Modal */}
      <Dialog 
        isOpen={showResetModal} 
        onDismiss={() => setShowResetModal(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Reset</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">Are you sure you want to reset the categories & parameters database?</p>
            <p className="text-sm font-medium text-destructive mt-2">This will delete all categories & parameters data and cannot be undone.</p>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs"><span className="font-medium">The following will be cleared:</span></p>
              <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
                <li>All categories</li>
                <li>All parameters</li>
                <li>All custom settings</li>
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
                handleReset();
              }}
            >
              Reset Database
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Generations Reset Confirmation Modal */}
      <Dialog 
        isOpen={showGenerationsResetModal} 
        onDismiss={() => setShowGenerationsResetModal(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Generations Reset</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">Are you sure you want to reset the generations database?</p>
            <p className="text-sm font-medium text-destructive mt-2">This will delete all generations data and cannot be undone.</p>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs"><span className="font-medium">The following will be cleared:</span></p>
              <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
                <li>All generated content</li>
                <li>All content metadata</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGenerationsResetModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowGenerationsResetModal(false);
                handleGenerationsReset();
              }}
            >
              Reset Generations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reset All Confirmation Modal */}
      <Dialog 
        isOpen={showResetAllModal} 
        onDismiss={() => setShowResetAllModal(false)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Reset All</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">Are you sure you want to reset ALL databases?</p>
            <p className="text-sm font-medium text-destructive mt-2">This will delete ALL data from both databases and cannot be undone.</p>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs"><span className="font-medium">The following will be cleared:</span></p>
              <ul className="text-xs mt-1 space-y-1 list-disc pl-4">
                <li>All categories</li>
                <li>All parameters</li>
                <li>All custom settings</li>
                <li>All generated content</li>
                <li>All content metadata</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetAllModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowResetAllModal(false);
                handleResetAll();
              }}
            >
              Reset All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Database;