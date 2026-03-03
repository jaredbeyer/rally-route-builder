'use client';

import dynamic from 'next/dynamic';
import type { Project } from '@/lib/types';

// Leaflet must only load on the client side (no SSR)
const MapEditor = dynamic(() => import('@/components/MapEditor'), { ssr: false });

export default function MapEditorWrapper({ project }: { project: Project }) {
  return <MapEditor project={project} />;
}
