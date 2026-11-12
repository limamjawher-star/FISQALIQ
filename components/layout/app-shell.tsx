'use client';

import React from 'react';

export interface AppShellProps {
  title?: string;
  children: React.ReactNode;
}

/**
 * AppShell is now mounted once at the route-group level in app/(app)/layout.tsx.
 * This wrapper acts as a transparent fragment to prevent duplicate shells while preserving page props.
 */
export function AppShell({ children }: AppShellProps) {
  return <>{children}</>;
}
