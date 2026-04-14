import axios from 'axios';
import { useTenantStore } from '@/stores/tenant';

export const http = axios.create({
  baseURL: '/api',
  timeout: 30000
});

http.interceptors.request.use((config) => {
  const tenant = useTenantStore();
  config.headers = config.headers ?? {};
  config.headers['X-Tenant-Id'] = tenant.tenantId;
  return config;
});
