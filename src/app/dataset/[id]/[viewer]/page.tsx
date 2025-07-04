'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DatasetViewerPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.id as string;
  const viewer = params.viewer as string;

  useEffect(() => {
    // Validate viewer type and redirect to the base dataset page with viewer state
    if (viewer === 'tabular' || viewer === 'basic' || viewer === 'image') {
      // Redirect to the main dataset page - the state will be handled there
      router.replace(`/dataset/${datasetId}?viewer=${viewer}`);
    } else {
      // Invalid viewer, redirect to default tabular view
      router.replace(`/dataset/${datasetId}?viewer=tabular`);
    }
  }, [datasetId, viewer, router]);

  return null; // This component just handles redirects
}