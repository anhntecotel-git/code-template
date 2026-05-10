/**
 * Route Configuration
 * Centralized management of all API routes and internal routes
 * Usage: import { ROUTES, API_ENDPOINTS } from '@/common/config/routes.config'
 */

/**
 * ============================================
 * INTERNAL ROUTES (Frontend Routes)
 * ============================================
 */
export const ROUTES = {
  // Auth Routes
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    LOGOUT: '/auth/logout',
  },

  // Dashboard
  DASHBOARD: {
    HOME: '/dashboard',
    ANALYTICS: '/dashboard/analytics',
    REPORTS: '/dashboard/reports',
  },

  // Employee Management
  EMPLOYEE: {
    LIST: '/employees',
    DETAIL: '/employees/:id',
    CREATE: '/employees/create',
    EDIT: '/employees/:id/edit',
    PROFILE: '/employees/:id/profile',
  },

  // Attendance Management
  ATTENDANCE: {
    LIST: '/attendance',
    DETAIL: '/attendance/:id',
    CHECK_IN: '/attendance/check-in',
    CHECK_OUT: '/attendance/check-out',
    REPORT: '/attendance/report',
  },

  // Department Management
  DEPARTMENT: {
    LIST: '/departments',
    DETAIL: '/departments/:id',
    CREATE: '/departments/create',
    EDIT: '/departments/:id/edit',
  },

  // Role Management
  ROLE: {
    LIST: '/roles',
    DETAIL: '/roles/:id',
    CREATE: '/roles/create',
    EDIT: '/roles/:id/edit',
  },

  // Reports
  REPORT: {
    LIST: '/reports', 
    ATTENDANCE_REPORT: '/reports/attendance',
    EMPLOYEE_REPORT: '/reports/employee',
    DEPARTMENT_REPORT: '/reports/department',
  },

  // Settings
  SETTING: {
    PROFILE: '/settings/profile',
    ACCOUNT: '/settings/account',
    PREFERENCES: '/settings/preferences',
    SECURITY: '/settings/security',
  },

  // System
  SYSTEM: {
    NOT_FOUND: '/404',
    UNAUTHORIZED: '/401',
    FORBIDDEN: '/403',
    ERROR: '/500',
  },
} as const;

/**
 * ============================================
 * API ENDPOINTS (Backend Routes)
 * ============================================
 */
export const API_ENDPOINTS = {
  // Base API URL with version
  BASE: '/api/v1',

  // Authentication Endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
  },

  // Employee Endpoints
  EMPLOYEE: {
    LIST: '/employees',
    GET: (id: string | number) => `/employees/${id}`,
    CREATE: '/employees',
    UPDATE: (id: string | number) => `/employees/${id}`,
    DELETE: (id: string | number) => `/employees/${id}`,
    SEARCH: '/employees/search',
    EXPORT: '/employees/export',
    BULK_IMPORT: '/employees/bulk-import',
  },

  // Attendance Endpoints
  ATTENDANCE: {
    LIST: '/attendance',
    GET: (id: string | number) => `/attendance/${id}`,
    CREATE: '/attendance',
    UPDATE: (id: string | number) => `/attendance/${id}`,
    DELETE: (id: string | number) => `/attendance/${id}`,
    CHECK_IN: '/attendance/check-in',
    CHECK_OUT: '/attendance/check-out',
    REPORT: '/attendance/report',
    BY_EMPLOYEE: (employeeId: string | number) => `/attendance/employee/${employeeId}`,
    BY_DATE_RANGE: '/attendance/date-range',
  },

  // Department Endpoints
  DEPARTMENT: {
    LIST: '/departments',
    GET: (id: string | number) => `/departments/${id}`,
    CREATE: '/departments',
    UPDATE: (id: string | number) => `/departments/${id}`,
    DELETE: (id: string | number) => `/departments/${id}`,
    SEARCH: '/departments/search',
  },

  // Role Endpoints
  ROLE: {
    LIST: '/roles',
    GET: (id: string | number) => `/roles/${id}`,
    CREATE: '/roles',
    UPDATE: (id: string | number) => `/roles/${id}`,
    DELETE: (id: string | number) => `/roles/${id}`,
    PERMISSIONS: (id: string | number) => `/roles/${id}/permissions`,
  },

  // Report Endpoints
  REPORT: {
    ATTENDANCE: '/reports/attendance',
    EMPLOYEE: '/reports/employee',
    DEPARTMENT: '/reports/department',
    SALARY: '/reports/salary',
    GENERATE: '/reports/generate',
    DOWNLOAD: (id: string | number) => `/reports/${id}/download`,
  },

  // User Settings
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    CHANGE_PASSWORD: '/user/change-password',
    PREFERENCES: '/user/preferences',
    UPDATE_PREFERENCES: '/user/preferences',
    AVATAR: '/user/avatar',
    UPLOAD_AVATAR: '/user/avatar/upload',
  },

  // System Health
  HEALTH: {
    CHECK: '/health',
    STATUS: '/health/status',
  },
} as const;

/**
 * ============================================
 * ROUTE BUILDERS (Helper Functions)
 * ============================================
 */

/**
 * Build full API URL
 * @param endpoint - API endpoint
 * @returns Full URL with base API path
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_ENDPOINTS.BASE}${endpoint}`;
};

/**
 * Build employee detail route
 * @param id - Employee ID
 * @returns Route path
 */
export const getEmployeeDetailRoute = (id: string | number): string => {
  return ROUTES.EMPLOYEE.DETAIL.replace(':id', String(id));
};

/**
 * Build employee edit route
 * @param id - Employee ID
 * @returns Route path
 */
export const getEmployeeEditRoute = (id: string | number): string => {
  return ROUTES.EMPLOYEE.EDIT.replace(':id', String(id));
};

/**
 * Build attendance detail route
 * @param id - Attendance ID
 * @returns Route path
 */
export const getAttendanceDetailRoute = (id: string | number): string => {
  return ROUTES.ATTENDANCE.DETAIL.replace(':id', String(id));
};

/**
 * Build department detail route
 * @param id - Department ID
 * @returns Route path
 */
export const getDepartmentDetailRoute = (id: string | number): string => {
  return ROUTES.DEPARTMENT.DETAIL.replace(':id', String(id));
};

/**
 * Build role detail route
 * @param id - Role ID
 * @returns Route path
 */
export const getRoleDetailRoute = (id: string | number): string => {
  return ROUTES.ROLE.DETAIL.replace(':id', String(id));
};

/**
 * ============================================
 * QUERY PARAMETERS HELPERS
 * ============================================
 */

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
}

export interface FilterParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Build query string from parameters
 * @param params - Query parameters
 * @returns Query string (e.g., "?page=0&size=10&sort=name")
 */
export const buildQueryString = (
  params: Record<string, any>
): string => {
  const filteredParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );

  return filteredParams.length > 0 ? `?${filteredParams.join('&')}` : '';
};

/**
 * Build pagination query string
 * @param page - Page number (0-indexed)
 * @param size - Page size
 * @param sort - Sort parameter
 * @returns Query string
 */
export const buildPaginationQuery = (
  page: number = 0,
  size: number = 10,
  sort?: string
): string => {
  const params: Record<string, any> = { page, size };
  if (sort) params.sort = sort;
  return buildQueryString(params);
};

export default {
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
};
