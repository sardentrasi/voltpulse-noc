'use client';

import { AuthProvider } from '@/components/AuthContext';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
