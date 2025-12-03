// src/routes/AppRoutes.jsx
import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import ResponsiveLayout, { Column } from '../../shared/components/user/layout/ResponsiveLayout';
import GuidedTour from '../../shared/components/user/GuidedTour';
import { randomizeParameterValue } from '../utils/parameterUtils';

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/50 border-t-primary"></div>
  </div>
);

// Lazy load pages for better performance
const Landing = lazy(() => import('../pages/Landing'));
const Categories = lazy(() => import('../pages/Categories'));
const Parameters = lazy(() => import('../pages/Parameters'));
const SelectedParameters = lazy(() => import('../pages/SelectedParameters'));
const Generation = lazy(() => import('../pages/Generation'));
const About = lazy(() => import('../pages/About'));

const AppRoutes = ({ 
  showTour,
  setShowTour,
  selectedCategory,
  setSelectedCategory,
  selectedParameters,
  setSelectedParameters,
  generatedContent,
  setGeneratedContent,
  generationInProgress,
  setGenerationInProgress
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-start tour when visiting /parameters page - DISABLED
  // useEffect(() => {
  //   if (location.pathname === '/parameters') {
  //     setShowTour(true);
  //   }
  // }, [location.pathname, setShowTour]);

  // Clear parameters when navigating to landing page
  const handleClearSession = () => {
    setSelectedParameters([]);
    setSelectedCategory([]);
    sessionStorage.removeItem('specgen-parameters');
    sessionStorage.removeItem('specgen-auto-generate');
  };

  const handleParameterSelect = (parameter) => {
    // Find existing parameter or add new one
    const existingIndex = selectedParameters.findIndex(p => p.id === parameter.id);
    
    if (existingIndex >= 0) {
      // Update existing parameter
      setSelectedParameters(prev =>
        prev.map((p, index) =>
          index === existingIndex ? parameter : p
        )
      );
    } else {
      // Add new parameter
      setSelectedParameters(prev => [...prev, parameter]);
    }
  };

  const handleParameterRemove = (parameterId) => {
    setSelectedParameters(prev => prev.filter(p => p.id !== parameterId));
  };

  const handleParameterValueUpdate = (parameterId, newValue) => {
    setSelectedParameters(prev =>
      prev.map(param =>
        param.id === parameterId ? { ...param, value: newValue } : param
      )
    );
  };

  // Navigation handlers
  const handleNavigateToGenerate = () => {
    // Store generation request details in session storage to handle page refreshes
    if (selectedParameters.length > 0) {
      // Save the current parameters for potential recovery
      sessionStorage.setItem('specgen-parameters', JSON.stringify(selectedParameters));
      sessionStorage.setItem('specgen-auto-generate', 'true');
      setGenerationInProgress(true);
    }
    navigate('/generating');
  };

  return (
    <>
      {/* Tour overlay */}
      {showTour && <GuidedTour onClose={() => setShowTour(false)} />}

      <Routes>
        {/* Landing Page */}
        <Route path="/" element={
          <Suspense fallback={<LoadingSpinner />}>
            <Landing onClearSession={handleClearSession} />
          </Suspense>
        } />

        {/* Parameters Page */}
        <Route path="/parameters" element={
          <ResponsiveLayout>
            {/* Category Selection Column */}
            <Column span={4} mobileOrder={1} tabletSpan={2} position="left">
              <Suspense fallback={<LoadingSpinner />}>
                <Categories
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                />
              </Suspense>
            </Column>

            {/* Parameter List Column */}
            <Column span={4} mobileOrder={3} tabletSpan={2} position="middle">
              <Suspense fallback={<LoadingSpinner />}>
                <Parameters
                  selectedCategory={selectedCategory}
                  selectedParameters={selectedParameters}
                  onParameterSelect={handleParameterSelect}
                />
              </Suspense>
            </Column>

            {/* Selected Parameters Column */}
            <Column span={8} mobileOrder={2} tabletSpan={4} position="right">
              <Suspense fallback={<LoadingSpinner />}>
                <SelectedParameters
                  parameters={selectedParameters}
                  onRemoveParameter={handleParameterRemove}
                  onUpdateParameterValue={handleParameterValueUpdate}
                  onNavigateToGenerate={handleNavigateToGenerate}
                />
              </Suspense>
            </Column>
          </ResponsiveLayout>
        } />

        <Route path="/generating" element={
          <div className="bg-card rounded-md border-l border-r shadow-sm h-full">
            <Suspense fallback={<LoadingSpinner />}>
              <Generation
                setGeneratedContent={setGeneratedContent}
                generatedContent={generatedContent}
                selectedParameters={selectedParameters}
                setSelectedParameters={setSelectedParameters}
                generationInProgress={true}
                setGenerationInProgress={setGenerationInProgress}
                viewMode="generating"
              />
            </Suspense>
          </div>
        } />

        {/* Individual Story Page */}
        <Route path="/story" element={
          <div className="bg-card rounded-md border-l border-r shadow-sm h-full">
            <Suspense fallback={<LoadingSpinner />}>
              <Generation
                setGeneratedContent={setGeneratedContent}
                generatedContent={generatedContent}
                selectedParameters={selectedParameters}
                setSelectedParameters={setSelectedParameters}
                generationInProgress={false}
                setGenerationInProgress={setGenerationInProgress}
                viewMode="story"
              />
            </Suspense>
          </div>
        } />

        {/* Library Page */}
        <Route path="/library" element={
          <div className="bg-card rounded-md border-l border-r shadow-sm h-full">
            <Suspense fallback={<LoadingSpinner />}>
              <Generation
                setGeneratedContent={setGeneratedContent}
                generatedContent={generatedContent}
                selectedParameters={selectedParameters}
                setSelectedParameters={setSelectedParameters}
                generationInProgress={false}
                setGenerationInProgress={setGenerationInProgress}
                viewMode="library"
              />
            </Suspense>
          </div>
        } />
        
        {/* Redirect /generate to /library for backward compatibility */}
        <Route path="/generate" element={<Navigate to="/library" replace />} />

        {/* About Page */}
        <Route path="/about" element={
          <div className="bg-background h-full">
            <Suspense fallback={<LoadingSpinner />}>
              <About />
            </Suspense>
          </div>
        } />
      </Routes>
    </>
  );
};

export default AppRoutes;