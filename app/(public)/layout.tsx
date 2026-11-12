import React from 'react';
import { SharedShell } from '@/components/layout/shared-shell';

export default function PublicRouteGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SharedShell variant="public">{children}</SharedShell>;
}
