import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Receipts } from './pages/Receipts';
import { Deliveries } from './pages/Deliveries';
import { Transfers } from './pages/Transfers';
import { Adjustments } from './pages/Adjustments';
import { MoveHistory } from './pages/MoveHistory';
import { Warehouses } from './pages/Warehouses';
import { Profile } from './pages/Profile';
import { Reports } from './pages/Reports';
import { Reorder } from './pages/Reorder';
import { CopilotDrawer } from './components/CopilotDrawer';

const ProtectedLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Outlet />
      </div>
      <CopilotDrawer />
    </div>
  );
};

export const App = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected App Routes */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/reorder" element={<Reorder />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/operations/receipts" element={<Receipts />} />
        <Route path="/operations/deliveries" element={<Deliveries />} />
        <Route path="/operations/transfers" element={<Transfers />} />
        <Route path="/operations/adjustments" element={<Adjustments />} />
        <Route path="/operations/move-history" element={<MoveHistory />} />
        <Route path="/settings/warehouses" element={<Warehouses />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
