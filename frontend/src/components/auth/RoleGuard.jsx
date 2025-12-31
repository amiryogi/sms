import React from 'react';
import { useAuth } from '../../context/AuthContext';

const RoleGuard = ({ roles = [], children, fallback = null }) => {
  const { user, hasRole } = useAuth();

  if (!user) return fallback;

  const hasAccess = roles.length === 0 || roles.some(role => hasRole(role));

  return hasAccess ? children : fallback;
};

export default RoleGuard;
