// src/user/UserApp.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Layout Components
import MainLayout from '../shared/components/user/layout/MainLayout.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { ParameterProvider } from './contexts/ParameterContext.jsx';

// User App Component
function UserApp() {
  return (
    <ParameterProvider>
      <AppContent />
    </ParameterProvider>
  );
}

// App Content Component with shared state
function AppContent() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedParameters, setSelectedParameters] = useState([]);
  const [showTour, setShowTour] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [generationInProgress, setGenerationInProgress] = useState(false);

  // Enhanced tour handler that navigates to parameters page first
  const handleShowTour = () => {
    navigate('/parameters');
    setShowTour(true);
  };

  // Mobile device restriction removed to allow touch screen and mobile access
  // Previously blocked mobile devices with "Desktop Only Application" message

  return (
    <MainLayout onShowTour={handleShowTour}>
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

export default UserApp;