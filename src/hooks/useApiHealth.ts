import { useQuery } from '@tanstack/react-query';
import { fetchHealth } from '../services/healthService';

export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });
}
