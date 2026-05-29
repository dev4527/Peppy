import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard'; // <--- Imports your new Kanban board page

// Security Guard component for frontend routing layers
const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  // If the employee session doesn't exist, route them immediately to sign-in terminal
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public corporate onboarding pathways */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected workspace area */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard /> {/* <--- Injects the functional Asana Kanban tracks here */}
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback route handles misdirected paths */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;