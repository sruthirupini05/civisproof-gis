import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useStore.js';

export default function ProtectedRoute({ children, allowedRoles = ['admin', 'inspector', 'field_staff'] }) {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    // Normal / Unauthenticated users cannot access this feature
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname,
          error: 'Restricted access: Only authorized Field Staff & Inspectors can access this feature. Please login.',
        }}
        replace
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#fffdf9]">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-amber-200 shadow-xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#991b1b] flex items-center justify-center text-2xl mx-auto">
            🚫
          </div>
          <h2 className="text-lg font-black text-stone-900">Access Restricted</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Your account ({user.username} - {user.role}) does not have permission to access this administrative feature. Normal users and unauthorized personnel are restricted.
          </p>
          <button
            onClick={() => window.history.back()}
            className="py-2.5 px-4 bg-[#991b1b] hover:bg-[#7f1d1d] text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}
