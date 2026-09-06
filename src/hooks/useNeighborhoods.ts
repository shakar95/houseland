import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface Neighborhood {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

let cachedNeighborhoods: Neighborhood[] | null = null;
let fetchPromise: Promise<Neighborhood[]> | null = null;

export function useNeighborhoods() {
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>(cachedNeighborhoods || []);
  const [loading, setLoading] = useState(!cachedNeighborhoods);

  useEffect(() => {
    if (cachedNeighborhoods) {
      setNeighborhoods(cachedNeighborhoods);
      setLoading(false);
      return;
    }
    
    if (!fetchPromise) {
      fetchPromise = api.get<Neighborhood[]>('/api/neighborhoods').then(data => {
        cachedNeighborhoods = data;
        return data;
      });
    }
    
    fetchPromise.then(data => {
      setNeighborhoods(data);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to fetch neighborhoods:', err);
      setLoading(false);
    });
  }, []);

  return { neighborhoods, loading };
}
