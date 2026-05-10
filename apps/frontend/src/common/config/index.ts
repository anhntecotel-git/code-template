/**
 * Barrel Export - Central Configuration Exports
 * 
 * Cho phép import tất cả config từ một chỗ:
 * import { envConfig, ROUTES, API_ENDPOINTS, apiClient } from '@/common/config'
 */

// Environment Configuration
export { envConfig, isEnv } from './env.config';
export type { EnvConfig } from './env.config';

// Route Configuration
export {
  ROUTES,
  API_ENDPOINTS,
  buildApiUrl,
  getEmployeeDetailRoute,
  getEmployeeEditRoute,
  getAttendanceDetailRoute,
  getDepartmentDetailRoute,
  getRoleDetailRoute,
  buildQueryString,
  buildPaginationQuery,
  type PaginationParams,
  type FilterParams,
} from './routes.config';

// API Client Configuration
export {
  default as apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiPatch,
  getErrorMessage,
  getFieldErrors,
  type ApiResponse,
  type ApiErrorResponse,
} from './api.config';
