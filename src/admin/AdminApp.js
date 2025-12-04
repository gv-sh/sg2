import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Categories from './pages/Categories.js';
import Parameters from './pages/Parameters.js';
import Content from './pages/Content.js';
import Settings from './pages/Settings.js';
import Database from './pages/Database.js';
import { Layout } from '../shared/components/admin/layout/index.js';
import GlobalFooter from '../shared/components/layout/GlobalFooter.jsx';
import Navbar from '../shared/components/ui/Navbar.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../shared/components/ui/card.tsx';
import { Button } from '../shared/components/ui/form-controls.js';
import { ToastProvider } from '../shared/contexts/ToastContext.jsx';

function AdminApp() {

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        
        <main className="flex-1 bg-background">
          <Layout>
            <Routes>
              <Route path="categories" element={<Categories />} />
              <Route path="parameters" element={<Parameters />} />
              <Route path="content" element={<Content />} />
              <Route path="settings" element={<Settings />} />
              <Route path="database" element={<Database />} />
              <Route path="/" element={
                <div className="h-[calc(100vh-8rem)] flex flex-col justify-center items-center py-10">
                  <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">FOH Behind the Scenes</h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                      Administration dashboard for fiction and image generation management.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
                    <Card className="hover:shadow-md transition-shadow flex flex-col h-full">
                      <CardHeader>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>Manage fiction categories like Science Fiction, Fantasy, etc.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 flex-grow flex flex-col justify-end">
                        <Link to="/admin/categories" className="w-full">
                          <Button variant="default" className="w-full">Manage Categories</Button>
                        </Link>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-md transition-shadow flex flex-col h-full">
                      <CardHeader>
                        <CardTitle>Parameters</CardTitle>
                        <CardDescription>Configure generation parameters for each category.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 flex-grow flex flex-col justify-end">
                        <Link to="/admin/parameters" className="w-full">
                          <Button variant="default" className="w-full">Manage Parameters</Button>
                        </Link>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-md transition-shadow flex flex-col h-full">
                      <CardHeader>
                        <CardTitle>Content</CardTitle>
                        <CardDescription>View and manage generated fiction and images.</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4 flex-grow flex flex-col justify-end">
                        <Link to="/admin/content" className="w-full">
                          <Button variant="default" className="w-full">Manage Content</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                  
                </div>
              } />
            </Routes>
          </Layout>
        </main>
        
        <GlobalFooter />
      </div>
    </ToastProvider>
  );
}

export default AdminApp;