import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingBlock } from '../ui/Spinner';

const ProtectedRoute = ({ children, roles = [], permission = null }) => {
  const { user, loading, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <LoadingBlock text="Verifying session…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Signed in with a password an admin set: choose your own first (the API
  // refuses everything else until then, so this only spares the error pages).
  if (user.mustChangePassword && location.pathname !== "/account/password") {
    return <Navigate to="/account/password" replace />;
  }

  // Check roles if specified
  if (roles.length > 0 && !roles.some(role => hasRole(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check permission if specified
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
