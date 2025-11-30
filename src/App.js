import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Admin imports
import AdminApp from './admin/AdminApp.js';

// User imports  
import UserApp from './user/UserApp.js';

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin routes - all admin paths under /admin */}
        <Route path="/admin/*" element={<AdminApp />} />
        
        {/* User routes - everything else */}
        <Route path="/*" element={<UserApp />} />
      </Routes>
    </Router>
  );
}

export default App;