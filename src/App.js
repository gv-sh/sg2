import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Theme imports
import { ThemeProvider } from './shared/components/user/theme/theme-provider.jsx';

// Admin imports
import AdminApp from './admin/AdminApp.js';

// User imports  
import UserApp from './user/UserApp.js';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="specgen-ui-theme">
      <Router>
        <Routes>
          {/* Admin routes - all admin paths under /admin */}
          <Route path="/admin/*" element={<AdminApp />} />
          
          {/* User routes - everything else */}
          <Route path="/*" element={<UserApp />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;