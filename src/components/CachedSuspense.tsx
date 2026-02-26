'use client';

import { Suspense, ReactNode, useMemo } from 'react';

interface CachedSuspenseProps {
  cached?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export default function CachedSuspense({ cached = false, fallback, children }: CachedSuspenseProps) {
  const content = useMemo(() => children, cached ? [] : [children]);
  
  return <Suspense fallback={fallback}>{content}</Suspense>;
}
