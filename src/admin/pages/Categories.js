import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../../shared/components/ui/card.tsx';
import { Button, Input } from '../../shared/components/ui/form-controls.js';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../shared/components/ui/table.js';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../../shared/components/ui/dialog.js';
import { useToast } from '../../shared/contexts/ToastContext.jsx';
import config from '../config.js';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: ''
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${config.API_URL}/api/admin/categories`, newCategory);
      setNewCategory({ name: '', description: '' });
      fetchCategories();
      toast.success('Category added successfully!');
    } catch (error) {
      toast.error('Failed to add category. Please try again.');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${config.API_URL}/api/admin/categories/${editingCategory.id}`, editingCategory);
      setEditingCategory(null);
      setShowModal(false);
      fetchCategories();
      toast.success('Category updated successfully!');
    } catch (error) {
      toast.error('Failed to update category. Please try again.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (deletingId) return; // Prevent multiple delete attempts
    
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        setDeletingId(id);
        await axios.delete(`${config.API_URL}/api/admin/categories/${id}`);
        
        // Add a small delay to ensure cascading deletes complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await fetchCategories();
        toast.success('Category deleted successfully!');
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || 'Failed to delete category';
        toast.error(`Delete failed: ${errorMessage}`);
      } finally {
        setDeletingId(null);
      }
    }
  };


  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Categories</h1>
          <Button onClick={() => setShowModal(true)}>Add New Category</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[220px] text-left">Category</TableHead>
                    <TableHead className="text-left">Description</TableHead>
                    <TableHead className="w-[100px] text-center">Parameters</TableHead>
                    <TableHead className="w-[140px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="4" className="text-center text-muted-foreground py-12 px-6">
                        <div className="flex flex-col items-center gap-2">
                          <p>No categories found</p>
                          <p className="text-xs">Click "Add New Category" to create one</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id} className="hover:bg-muted/30">
                        <TableCell className="whitespace-nowrap text-left">
                          <div className="flex flex-col">
                            <span className="font-medium truncate">{category.name}</span>
                            <code className="text-xs text-muted-foreground font-mono truncate">
                              {category.id}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-left">
                          <span className="text-sm text-muted-foreground truncate block">
                            {category.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              category.parameter_count > 0 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-gray-50 text-gray-500 border border-gray-200'
                            }`}>
                              {category.parameter_count || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setEditingCategory(category);
                                setShowModal(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive-ghost"
                              size="xs"
                              onClick={() => handleDeleteCategory(category.id)}
                              disabled={deletingId === category.id}
                            >
                              {deletingId === category.id ? 'Deleting...' : 'Delete'}
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

      {/* Add/Edit Category Modal */}
      <Dialog isOpen={showModal} onDismiss={() => {
        setShowModal(false);
        setEditingCategory(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="categoryName" className="text-sm font-medium">Name</label>
              <Input
                id="categoryName"
                value={editingCategory ? editingCategory.name : newCategory.name}
                onChange={(e) => {
                  if (editingCategory) {
                    setEditingCategory({ ...editingCategory, name: e.target.value });
                  } else {
                    setNewCategory({ ...newCategory, name: e.target.value });
                  }
                }}
                required
              />
              <p className="text-sm text-muted-foreground">Enter a descriptive name for the category.</p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="categoryDescription" className="text-sm font-medium">Description</label>
              <textarea
                id="categoryDescription"
                placeholder="Describe what types of content this category will generate..."
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                value={editingCategory ? editingCategory.description : newCategory.description}
                onChange={(e) => {
                  if (editingCategory) {
                    setEditingCategory({ ...editingCategory, description: e.target.value });
                  } else {
                    setNewCategory({ ...newCategory, description: e.target.value });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">A detailed description helps users understand what this category is used for</p>
            </div>
            
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingCategory(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? 'Update' : 'Add Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default Categories;