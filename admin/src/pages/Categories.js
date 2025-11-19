import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button, Input, Select } from '../components/ui/form-controls';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '../components/ui/dialog';
import { Alert } from '../components/ui/alert';
import config from '../config';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    visibility: 'Show',
    year: new Date().getFullYear(),
    sort_order: 0
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: '', message: '' });

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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${config.API_URL}/api/categories`, newCategory);
      setNewCategory({ name: '', description: '', visibility: 'Show', year: new Date().getFullYear(), sort_order: 0 });
      fetchCategories();
      showAlert('default', 'Category added successfully!');
    } catch (error) {
      showAlert('destructive', 'Failed to add category. Please try again.');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${config.API_URL}/api/categories/${editingCategory.id}`, editingCategory);
      setEditingCategory(null);
      setShowModal(false);
      fetchCategories();
      showAlert('default', 'Category updated successfully!');
    } catch (error) {
      showAlert('destructive', 'Failed to update category. Please try again.');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await axios.delete(`${config.API_URL}/api/categories/${id}`);
        fetchCategories();
        showAlert('default', 'Category deleted successfully!');
      } catch (error) {
        showAlert('destructive', 'Failed to delete category. Please try again.');
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
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Sort Order</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="6" className="text-center text-muted-foreground py-12 px-6">
                        <div className="flex flex-col items-center gap-2">
                          <p>No categories found</p>
                          <p className="text-xs">Click "Add New Category" to create one</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {category.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {category.year || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {category.sort_order ?? 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center text-xs
                            ${category.visibility === 'Show'
                             ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                             : 'text-slate-600 dark:text-slate-400'}`}>
                            {category.visibility}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
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

            <div className="space-y-2">
              <label htmlFor="categoryYear" className="text-sm font-medium">Year</label>
              <Input
                id="categoryYear"
                type="number"
                value={editingCategory ? editingCategory.year : newCategory.year}
                onChange={(e) => {
                  const yearValue = e.target.value ? parseInt(e.target.value, 10) : '';
                  if (editingCategory) {
                    setEditingCategory({ ...editingCategory, year: yearValue });
                  } else {
                    setNewCategory({ ...newCategory, year: yearValue });
                  }
                }}
                placeholder={new Date().getFullYear().toString()}
                min="1000"
                max="9999"
              />
              <p className="text-xs text-muted-foreground">The year associated with this category</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="categorySortOrder" className="text-sm font-medium">Sort Order</label>
              <Input
                id="categorySortOrder"
                type="number"
                value={editingCategory ? editingCategory.sort_order : newCategory.sort_order}
                onChange={(e) => {
                  const sortValue = e.target.value ? parseInt(e.target.value, 10) : 0;
                  if (editingCategory) {
                    setEditingCategory({ ...editingCategory, sort_order: sortValue });
                  } else {
                    setNewCategory({ ...newCategory, sort_order: sortValue });
                  }
                }}
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in lists</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="categoryVisibility" className="text-sm font-medium">Visibility</label>
              <Select
                id="categoryVisibility"
                value={editingCategory ? editingCategory.visibility : newCategory.visibility}
                onChange={(e) => {
                  if (editingCategory) {
                    setEditingCategory({ ...editingCategory, visibility: e.target.value });
                  } else {
                    setNewCategory({ ...newCategory, visibility: e.target.value });
                  }
                }}
              >
                <option value="Show">Show</option>
                <option value="Hide">Hide</option>
              </Select>
              <p className="text-sm text-muted-foreground">Whether to show or hide this category in the user interface.</p>
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