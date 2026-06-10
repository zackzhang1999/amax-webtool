import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Dashboard from '@/pages/Dashboard';
import Models from '@/pages/Models';
import FirmwareDetail from '@/pages/FirmwareDetail';
import Audit from '@/pages/Audit';
import Admin from '@/pages/Admin';
import SoftwareHub from '@/pages/SoftwareHub';
import ISOCenter from '@/pages/ISOCenter';
import Login from '@/pages/Login';
import UserManagement from '@/pages/UserManagement';
import { useAuth } from '@/contexts/AuthContext';
import type { PermissionModule } from '@/types';

/* Permission Guard - wraps routes that require module access */
function ModuleGuard({ module, children }: { module: PermissionModule; children: React.ReactNode }) {
  const { canAccessModule, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccessModule(module)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/* Admin Guard - only super_admin can access */
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-tbase">
      <Navbar />
      {children}
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Login - public */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

      {/* Protected routes */}
      <Route path="/*" element={
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/models" element={<Models />} />
            <Route path="/models/:id" element={<FirmwareDetail />} />
            <Route path="/isos" element={<ISOCenter />} />
            <Route path="/software" element={<SoftwareHub />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/admin" element={<ModuleGuard module="admin"><Admin /></ModuleGuard>} />
            <Route path="/admin/users" element={<AdminGuard><UserManagement /></AdminGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      } />
    </Routes>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
