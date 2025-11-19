// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { isMobileDevice } from './utils/deviceUtils';

// Theme and Layout Components
import { ThemeProvider } from './components/theme/theme-provider';
import MainLayout from './components/layout/MainLayout';
import AppRoutes from './routes/AppRoutes';
import { ParameterProvider } from './contexts/ParameterContext';

// Main App Component
function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Router>
        <ParameterProvider>
          <AppContent />
        </ParameterProvider>
      </Router>
    </ThemeProvider>
  );
}

// App Content Component with shared state
function AppContent() {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [selectedParameters, setSelectedParameters] = useState([]);
  const [showTour, setShowTour] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [generationInProgress, setGenerationInProgress] = useState(false);

  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
  }, []);

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="text-xl font-semibold">Desktop Only Application</h2>
          <p>Please access this application from a desktop computer, web browser, or iPad for the best experience.</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout onShowTour={() => setShowTour(true)}>
      <AppRoutes 
        showTour={showTour}
        setShowTour={setShowTour}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedParameters={selectedParameters}
        setSelectedParameters={setSelectedParameters}
        generatedContent={generatedContent}
        setGeneratedContent={setGeneratedContent}
        generationInProgress={generationInProgress}
        setGenerationInProgress={setGenerationInProgress}
      />
    </MainLayout>
  );
}

export default App;