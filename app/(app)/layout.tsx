import React from 'react';
import { SharedShell } from '@/components/layout/shared-shell';

export default function AppRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SharedShell variant="app">{children}</SharedShell>;
}
