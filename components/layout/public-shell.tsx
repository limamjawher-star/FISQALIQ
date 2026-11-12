'use client';

import React from 'react';

/**
 * PublicShell is now mounted once at the route-group level in app/(public)/layout.tsx.
 * This wrapper acts as a transparent fragment to prevent duplicate shells while preserving page props.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
