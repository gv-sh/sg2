import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../config';
import '../index.css';
import { Card, CardContent } from '../components/ui/card';
import { Button, Select, Input } from '../components/ui/form-controls';
import { Alert } from '../components/ui/alert';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { PaginationControls } from '../components/ui/pagination';
import { Clipboard, Download, Search, Trash2, CheckSquare, Square } from 'lucide-react';

function Content() {
  // Content and pagination state
  const [filteredContent, setFilteredContent] = useState([]);
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  // Modal and content state
  const [selectedContent, setSelectedContent] = useState(null);
  const [editContent, setEditContent] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Loading and alert state
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFullContent, setIsLoadingFullContent] = useState(false);


  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems(new Set());
    setSelectAll(false);
  }, [contentTypeFilter, yearFilter, debouncedSearchQuery]);

  // Fetch available years for filtering
  const fetchAvailableYears = useCallback(async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/content/years`);
      setAvailableYears(response.data.data || []);
    } catch (error) {
      // Don't show alert for this error as it's not critical
    }
  }, []);

  // Fetch content with pagination and filters
  const fetchContent = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Build URL with query parameters for summary endpoint
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });
      
      if (contentTypeFilter) {
        params.append('type', contentTypeFilter);
      }
      
      if (yearFilter) {
        params.append('year', yearFilter);
      }
      
      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }
      
      const url = `${config.API_URL}/api/content/summary?${params.toString()}`;
      const response = await axios.get(url);
      
      setFilteredContent(response.data.data || []);
      setTotalItems(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.totalPages || 0);
    } catch (error) {
      showAlert('danger', 'Failed to fetch content. Please try again.');
      setFilteredContent([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, contentTypeFilter, yearFilter, debouncedSearchQuery]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    fetchAvailableYears();
  }, [fetchAvailableYears]);

  const handleTypeFilterChange = (e) => {
    setContentTypeFilter(e.target.value);
  };

  const handleYearFilterChange = (e) => {
    setYearFilter(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedItems(new Set());
    setSelectAll(false);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setSelectedItems(new Set());
    setSelectAll(false);
  };

  // Selection handlers
  const handleSelectItem = (itemId) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
    setSelectAll(newSelection.size === filteredContent.length && filteredContent.length > 0);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(filteredContent.map(item => item.id));
      setSelectedItems(allIds);
      setSelectAll(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
    setSelectAll(false);
  };

  const handleBulkDelete = () => {
    if (selectedItems.size > 0) {
      setShowBulkDeleteModal(true);
    }
  };

  const confirmBulkDelete = async () => {
    try {
      setIsLoading(true);
      const deletePromises = Array.from(selectedItems).map(id => 
        axios.delete(`${config.API_URL}/api/content/${id}`)
      );
      
      await Promise.all(deletePromises);
      setShowBulkDeleteModal(false);
      setSelectedItems(new Set());
      setSelectAll(false);
      fetchContent();
      showAlert('success', `Successfully deleted ${selectedItems.size} items`);
    } catch (error) {
      showAlert('danger', 'Failed to delete some items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to determine content type label

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000);
  };

  // Fetch full content for viewing (since summary doesn't include full content)
  const fetchFullContent = async (contentId) => {
    try {
      setIsLoadingFullContent(true);
      const response = await axios.get(`${config.API_URL}/api/content/${contentId}`);
      return response.data.data;
    } catch (error) {
      showAlert('danger', 'Failed to load content details.');
      return null;
    } finally {
      setIsLoadingFullContent(false);
    }
  };

  const handleViewContent = async (content) => {
    const fullContent = await fetchFullContent(content.id);
    if (fullContent) {
      setSelectedContent(fullContent);
      setShowViewModal(true);
    }
  };

  const handleEditClick = async (content) => {
    const fullContent = await fetchFullContent(content.id);
    if (fullContent) {
      setEditContent({ ...fullContent });
      setShowEditModal(true);
    }
  };

  const handleDeleteClick = (content) => {
    setSelectedContent(content);
    setShowDeleteModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsLoading(true);
      const { id, title, fiction_content, image_blob, year, metadata } = editContent;
      const payload = { title };

      // Add validated year to payload
      if (year && year.toString().length === 4) {
        payload.year = parseInt(year, 10);
      }

      // Handle different content types
      if (editContent.type === 'fiction') {
        payload.fiction_content = fiction_content;
      } else if (editContent.type === 'image') {
        payload.image_blob = image_blob;
      } else if (editContent.type === 'combined') {
        // For combined type, include both fiction_content and image_blob
        payload.fiction_content = fiction_content;
        payload.image_blob = image_blob;
      }

      // Always include metadata in payload (even if it's an empty object)
      payload.metadata = metadata || {};

      await axios.put(`${config.API_URL}/api/content/${id}`, payload);
      setShowEditModal(false);
      fetchContent();
      showAlert('success', 'Content updated successfully');
    } catch (error) {
      showAlert('danger', 'Failed to update content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteContent = async () => {
    try {
      setIsLoading(true);
      await axios.delete(`${config.API_URL}/api/content/${selectedContent.id}`);
      setShowDeleteModal(false);
      fetchContent();
      showAlert('success', 'Content deleted successfully');
    } catch (error) {
      showAlert('danger', 'Failed to delete content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleCopyContent = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      showAlert('success', 'Content copied to clipboard');
    } catch (error) {
      showAlert('danger', 'Failed to copy to clipboard');
    }
  };

  const handleDownloadImage = (imageData, title) => {
    try {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${imageData}`;
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showAlert('success', 'Image downloaded successfully');
    } catch (error) {
      showAlert('danger', 'Failed to download image');
    }
  };

  const handleDownloadText = (text, title) => {
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showAlert('success', 'Text downloaded successfully');
    } catch (error) {
      showAlert('danger', 'Failed to download text');
    }
  };

  return (
    <>
      {/* Alert Messages */}
      {alert.show && (
        <div className="mb-6">
          <Alert
            variant={alert.type === 'success' ? 'default' : alert.type === 'danger' ? 'destructive' : 'info'}
            onDismiss={() => setAlert({ show: false, type: '', message: '' })}
          >
            {alert.message}
          </Alert>
        </div>
      )}

      <div className="space-y-6 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generated Content</h2>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10 w-64"
                placeholder="Search content..."
                value={searchQuery}
                onChange={handleSearchChange}
                aria-label="Search content"
              />
            </div>
            
            <Select
              className="w-40"
              value={contentTypeFilter}
              onChange={handleTypeFilterChange}
              aria-label="Filter content by type"
            >
              <option value="">All Content</option>
              <option value="fiction">Fiction Only</option>
              <option value="image">Images Only</option>
              <option value="combined">Combined Only</option>
            </Select>
            
            <Select
              className="w-40"
              value={yearFilter}
              onChange={handleYearFilterChange}
              aria-label="Filter content by year"
            >
              <option value="">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Select>
          </div>
        </div>
        
        {/* Bulk operations */}
        {selectedItems.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{selectedItems.size} item(s) selected</span>
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Clear selection
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">
                        <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[200px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: itemsPerPage }, (_, i) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted animate-pulse rounded" style={{ width: `${Math.random() * 40 + 60}%` }}></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-12 bg-muted animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <div className="inline-block h-6 w-12 bg-muted animate-pulse rounded"></div>
                          <div className="inline-block h-6 w-12 bg-muted animate-pulse rounded"></div>
                          <div className="inline-block h-6 w-16 bg-muted animate-pulse rounded"></div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : filteredContent.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {searchQuery || contentTypeFilter || yearFilter 
                  ? 'No content found matching your filters. Try adjusting your search criteria.'
                  : 'No content found. Generate content through the main application.'}
              </p>
              {(searchQuery || contentTypeFilter || yearFilter) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setContentTypeFilter('');
                    setYearFilter('');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center justify-center w-5 h-5"
                        aria-label={selectAll ? "Deselect all" : "Select all"}
                      >
                        {selectAll ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContent.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell>
                        <button
                          onClick={() => handleSelectItem(item.id)}
                          className="flex items-center justify-center w-5 h-5"
                          aria-label={`Select ${item.title}`}
                        >
                          {selectedItems.has(item.id) ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 text-xs rounded-md inline-flex items-center
                          ${item.type === 'fiction'
                            ? 'text-blue-600 dark:text-blue-400'
                            : item.type === 'image'
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-green-600 dark:text-green-400'}`}>
                          {item.type === 'fiction' ? 'Fiction' : item.type === 'image' ? 'Image' : 'Combined'}
                        </span>
                      </TableCell>
                      <TableCell>{item.year || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(item.created_at)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleViewContent(item)}
                          aria-label={`View ${item.title}`}
                          disabled={isLoadingFullContent}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleEditClick(item)}
                          aria-label={`Edit ${item.title}`}
                          disabled={isLoadingFullContent}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive-ghost"
                          size="xs"
                          onClick={() => handleDeleteClick(item)}
                          aria-label={`Delete ${item.title}`}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-6">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Content Modal - unchanged */}
      {showViewModal && selectedContent && (
        <Dialog isOpen={showViewModal} onDismiss={() => setShowViewModal(false)}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{selectedContent.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Created {formatDate(selectedContent.created_at)}
                {selectedContent.year && <span> • Year: {selectedContent.year}</span>}
              </p>
            </DialogHeader>

            <div className="py-6">
              {selectedContent.type === 'fiction' ? (
                <div className="fiction-content">
                  <div className="flex justify-end space-x-2 mb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 rounded-md px-3 py-1 h-8 text-xs bg-background/80 hover:bg-background"
                      onClick={() => handleCopyContent(selectedContent.fiction_content)}
                    >
                      <Clipboard className="h-3.5 w-3.5 opacity-70" /> Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 rounded-md px-3 py-1 h-8 text-xs bg-background/80 hover:bg-background"
                      onClick={() => handleDownloadText(selectedContent.fiction_content, selectedContent.title)}
                    >
                      <Download className="h-3.5 w-3.5 opacity-70" /> Download
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none rounded-lg border border-border/50 p-4 bg-transparent">
                    <p className="text-sm whitespace-pre-line text-foreground/90">{selectedContent.fiction_content}</p>
                  </div>
                </div>
              ) : selectedContent.type === 'image' ? (
                <div className="image-content">
                  {selectedContent.image_blob ? (
                    <>
                      <div className="flex justify-end space-x-2 mb-6">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 rounded-md px-3 py-1 h-8 text-xs bg-background/80 hover:bg-background"
                          onClick={() => handleCopyContent(`data:image/png;base64,${selectedContent.image_blob}`)}
                        >
                          <Clipboard className="h-3.5 w-3.5 opacity-70" /> Copy Data URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 rounded-md px-3 py-1 h-8 text-xs bg-background/80 hover:bg-background"
                          onClick={() => handleDownloadImage(selectedContent.image_blob, selectedContent.title)}
                        >
                          <Download className="h-3.5 w-3.5 opacity-70" /> Download
                        </Button>
                      </div>
                      <div className="flex justify-center p-4 rounded-lg border border-border/50 bg-transparent">
                        <img
                          src={`data:image/png;base64,${selectedContent.image_blob}`}
                          alt={selectedContent.title}
                          className="rounded-md max-w-full mx-auto shadow-md"
                          style={{ maxHeight: '500px' }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 rounded-lg border border-border/50 bg-transparent">
                      <p className="text-sm text-muted-foreground">No image data available</p>
                    </div>
                  )}
                </div>
              ) : (
                // Handle combined type (both fiction and image)
                <div className="combined-content space-y-8">
                  {/* Fiction Part */}
                  <div className="fiction-content">
                    <h3 className="text-md font-semibold mb-2">Story Content</h3>
                    <div className="flex justify-end space-x-2 mb-6">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 rounded-md px-3 py-1 h-8 text-xs bg-background/80 hover:bg-background"
                        onClick={() => handleCopyContent(selectedContent.fiction_content)}
                      >
                        <Clipboard className="h-3.5 w-3.5 opacity-70" /> Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 rounded-md px-3 py-1 h-8 text-xs bg-background/80 hover:bg-background"
                        onClick={() => handleDownloadText(selectedContent.fiction_content, selectedContent.title)}
                      >
                        <Download className="h-3.5 w-3.5 opacity-70" /> Download Text
                      </Button>
                    </div>
                    <div className="prose prose-sm max-w-none rounded-lg border border-border/50 p-4 bg-transparent">
                      <p className="text-sm whitespace-pre-line text-foreground/90">{selectedContent.fiction_content}</p>
                    </div>
                  </div>
                  
                  {/* Image Part */}
                  <div className="image-content">
                    <h3 className="text-md font-semibold mb-2">Accompanying Image</h3>
                    {selectedContent.image_blob ? (
                      <>
                        <div className="flex justify-end space-x-2 mb-6">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 rounded-md px-3 py-1 h-8 text-xs bg-background/80 hover:bg-background"
                            onClick={() => handleCopyContent(`data:image/png;base64,${selectedContent.image_blob}`)}
                          >
                            <Clipboard className="h-3.5 w-3.5 opacity-70" /> Copy Data URL
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 rounded-md px-3 py-1 h-8 text-xs bg-background/80 hover:bg-background"
                            onClick={() => handleDownloadImage(selectedContent.image_blob, selectedContent.title)}
                          >
                            <Download className="h-3.5 w-3.5 opacity-70" /> Download Image
                          </Button>
                        </div>
                        <div className="flex justify-center p-4 rounded-lg border border-border/50 bg-transparent">
                          <img
                            src={`data:image/png;base64,${selectedContent.image_blob}`}
                            alt={selectedContent.title}
                            className="rounded-md max-w-full mx-auto shadow-md"
                            style={{ maxHeight: '500px' }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 rounded-lg border border-border/50 bg-transparent">
                        <p className="text-sm text-muted-foreground">No image data available</p>
                      </div>
                    )}
                  </div>

                  {/* Download Both Option */}
                  {selectedContent.fiction_content && selectedContent.image_blob && (
                    <div className="combined-download border-t pt-4">
                      <div className="flex justify-center">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex items-center gap-1 rounded-md px-4 py-2 h-10 text-sm"
                          onClick={() => {
                            // Download both text and image
                            handleDownloadText(selectedContent.fiction_content, `${selectedContent.title}-text`);
                            handleDownloadImage(selectedContent.image_blob, `${selectedContent.title}-image`);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" /> Download Both Files
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Generation Parameters</h4>
                  <div className="rounded-lg border border-border/50 p-3 h-[200px] overflow-y-auto bg-transparent">
                    <pre className="text-xs text-foreground/80">{JSON.stringify(selectedContent.prompt_data, null, 2)}</pre>
                  </div>
                </div>

                {selectedContent.metadata && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">Metadata</h4>
                    <div className="rounded-lg border border-border/50 p-3 h-[200px] overflow-y-auto bg-transparent">
                      <pre className="text-xs text-foreground/80">{JSON.stringify(selectedContent.metadata, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md text-xs"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Content Modal */}
      {showEditModal && editContent && (
        <Dialog isOpen={showEditModal} onDismiss={() => setShowEditModal(false)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit {editContent.type === 'fiction' ? 'Fiction' : 'Image'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <label htmlFor="contentTitle" className="text-sm font-medium">Title</label>
                <Input
                  id="contentTitle"
                  value={editContent.title}
                  onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="contentYear" className="text-sm font-medium">Year of Generation</label>
                <Input
                  id="contentYear"
                  type="number"
                  value={editContent.year || new Date().getFullYear()}
                  onChange={(e) => {
                    const yearValue = e.target.value;
                    // Only update if empty or valid number
                    if (!yearValue || (yearValue.length <= 4 && /^\d+$/.test(yearValue))) {
                      setEditContent({ ...editContent, year: yearValue });
                    }
                  }}
                  placeholder={new Date().getFullYear().toString()}
                  className="bg-background/50"
                  min="1000"
                  max="9999"
                />
                {editContent.year && (editContent.year.toString().length !== 4 || editContent.year < 1000 || editContent.year > 9999) && (
                  <p className="text-xs text-destructive">Please enter a valid four-digit year</p>
                )}
              </div>

              {editContent.type === 'fiction' && (
                <div className="space-y-2">
                  <label htmlFor="contentText" className="text-sm font-medium">Content</label>
                  <textarea
                    className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 min-h-[250px]"
                    id="contentText"
                    value={editContent.fiction_content}
                    onChange={(e) => setEditContent({ ...editContent, fiction_content: e.target.value })}
                  />
                </div>
              )}

              {editContent.type === 'image' && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Image Preview</p>
                  {editContent.image_blob ? (
                    <div className="rounded-lg border border-border/50 bg-transparent p-4 flex justify-center">
                      <img
                        src={`data:image/png;base64,${editContent.image_blob}`}
                        alt={editContent.title}
                        className="rounded-md max-w-full mx-auto shadow-md"
                        style={{ maxHeight: '300px' }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-10 rounded-lg border border-border/50 bg-transparent">
                      <p className="text-sm text-muted-foreground">No image data available</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    The image data is stored as a base64 encoded string and cannot be directly edited.
                  </p>
                </div>
              )}

              {/* Add Metadata Editing Section */}
              <div className="space-y-2">
                <label htmlFor="contentMetadata" className="text-sm font-medium">Metadata</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 min-h-[150px]"
                  id="contentMetadata"
                  value={JSON.stringify(editContent.metadata || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditContent({ ...editContent, metadata: parsed });
                    } catch (error) {
                      // Allow invalid JSON during editing, but will validate before saving
                      // We're keeping the potentially invalid text in the textarea
                      // This approach allows users to continue typing even when syntax is temporarily invalid
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Edit metadata in JSON format. Changes will be validated before saving.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md text-xs"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="rounded-md text-xs"
                onClick={handleSaveEdit}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedContent && (
        <Dialog isOpen={showDeleteModal} onDismiss={() => setShowDeleteModal(false)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Confirm Delete</DialogTitle>
              <DialogDescription className="pt-2 text-muted-foreground">
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">
                  Are you sure you want to delete <span className="font-semibold">"{selectedContent.title}"</span>?
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md text-xs"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-md text-xs"
                onClick={handleDeleteContent}
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <Dialog isOpen={showBulkDeleteModal} onDismiss={() => setShowBulkDeleteModal(false)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Confirm Bulk Delete</DialogTitle>
              <DialogDescription className="pt-2 text-muted-foreground">
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">
                  Are you sure you want to delete <span className="font-semibold">{selectedItems.size}</span> selected items?
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="rounded-md text-xs"
                onClick={() => setShowBulkDeleteModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="rounded-md text-xs"
                onClick={confirmBulkDelete}
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete All'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default Content;