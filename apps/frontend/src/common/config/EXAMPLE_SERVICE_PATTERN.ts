/**
 * Example API Service Pattern
 * 
 * File này chỉ dùng để reference/copy pattern
 * Không nên commit file này, mà nên tạo individual service files:
 * 
 * - features/employee/services/employeeService.ts
 * - features/attendance/services/attendanceService.ts
 * - features/department/services/departmentService.ts
 * - etc.
 * 
 * ============================================
 * EXAMPLE PATTERN - DELETE THIS FILE AFTER COPYING
 * ============================================
 */

import { apiGet, apiPost, apiPut, apiDelete, buildQueryString } from '@/common/config';
import { API_ENDPOINTS, buildPaginationQuery } from '@/common/config/routes.config';
import type { ApiResponse } from '@/common/config/api.config';

/**
 * ============================================
 * EMPLOYEE SERVICE EXAMPLE
 * ============================================
 * 
 * Copy this pattern to: features/employee/services/employeeService.ts
 */

// DTO Types (từ backend API contract)
export interface EmployeeResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  position: string;
  department: {
    id: number;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeCreateRequestDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  position: string;
  departmentId: number;
}

export interface EmployeeUpdateRequestDto {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  position?: string;
  departmentId?: number;
}

export interface EmployeeListResponse {
  content: EmployeeResponseDto[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface EmployeeSearchParams {
  page?: number;
  size?: number;
  department?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
}

/**
 * Employee Service
 * Handles all employee-related API calls
 */
export const employeeService = {
  /**
   * Get list of employees with pagination
   */
  async getList(
    page: number = 0,
    size: number = 10,
    params?: Partial<EmployeeSearchParams>
  ): Promise<ApiResponse<EmployeeListResponse>> {
    const query = buildPaginationQuery(page, size);
    const endpoint = API_ENDPOINTS.EMPLOYEE.LIST + query;
    return apiGet(endpoint);
  },

  /**
   * Get single employee by ID
   */
  async getById(id: number | string): Promise<ApiResponse<EmployeeResponseDto>> {
    const endpoint = API_ENDPOINTS.EMPLOYEE.GET(id);
    return apiGet(endpoint);
  },

  /**
   * Create new employee
   */
  async create(
    dto: EmployeeCreateRequestDto
  ): Promise<ApiResponse<EmployeeResponseDto>> {
    return apiPost(API_ENDPOINTS.EMPLOYEE.CREATE, dto);
  },

  /**
   * Update employee
   */
  async update(
    id: number | string,
    dto: EmployeeUpdateRequestDto
  ): Promise<ApiResponse<EmployeeResponseDto>> {
    const endpoint = API_ENDPOINTS.EMPLOYEE.UPDATE(id);
    return apiPut(endpoint, dto);
  },

  /**
   * Delete employee
   */
  async delete(id: number | string): Promise<ApiResponse<void>> {
    const endpoint = API_ENDPOINTS.EMPLOYEE.DELETE(id);
    return apiDelete(endpoint);
  },

  /**
   * Search employees
   */
  async search(
    query: string,
    filters?: Record<string, any>
  ): Promise<ApiResponse<EmployeeListResponse>> {
    const params = buildQueryString({ q: query, ...filters });
    const endpoint = API_ENDPOINTS.EMPLOYEE.SEARCH + params;
    return apiGet(endpoint);
  },

  /**
   * Export employees
   */
  async export(format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const endpoint = API_ENDPOINTS.EMPLOYEE.EXPORT + buildQueryString({ format });
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
    return response.blob();
  },

  /**
   * Bulk import employees
   */
  async bulkImport(file: File): Promise<ApiResponse<{ imported: number }>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiPost(API_ENDPOINTS.EMPLOYEE.BULK_IMPORT, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

/**
 * ============================================
 * ATTENDANCE SERVICE EXAMPLE
 * ============================================
 * 
 * Copy this pattern to: features/attendance/services/attendanceService.ts
 */

export interface AttendanceResponseDto {
  id: number;
  employee: EmployeeResponseDto;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'ON_LEAVE';
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceCheckInDto {
  employeeId: number;
  latitude?: number;
  longitude?: number;
  note?: string;
}

export interface AttendanceCheckOutDto {
  employeeId: number;
  latitude?: number;
  longitude?: number;
  note?: string;
}

export interface AttendanceReportDto {
  employeeId: number;
  employeeName: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  onLeaveDays: number;
}

export const attendanceService = {
  /**
   * Get attendance list
   */
  async getList(
    page: number = 0,
    size: number = 10,
    employeeId?: number
  ): Promise<ApiResponse<any>> {
    const query = buildPaginationQuery(page, size);
    const endpoint = employeeId
      ? API_ENDPOINTS.ATTENDANCE.BY_EMPLOYEE(employeeId) + query
      : API_ENDPOINTS.ATTENDANCE.LIST + query;
    return apiGet(endpoint);
  },

  /**
   * Get attendance by ID
   */
  async getById(id: number): Promise<ApiResponse<AttendanceResponseDto>> {
    const endpoint = API_ENDPOINTS.ATTENDANCE.GET(id);
    return apiGet(endpoint);
  },

  /**
   * Check in
   */
  async checkIn(dto: AttendanceCheckInDto): Promise<ApiResponse<AttendanceResponseDto>> {
    return apiPost(API_ENDPOINTS.ATTENDANCE.CHECK_IN, dto);
  },

  /**
   * Check out
   */
  async checkOut(dto: AttendanceCheckOutDto): Promise<ApiResponse<AttendanceResponseDto>> {
    return apiPost(API_ENDPOINTS.ATTENDANCE.CHECK_OUT, dto);
  },

  /**
   * Get attendance report
   */
  async getReport(
    startDate: string,
    endDate: string,
    filters?: Record<string, any>
  ): Promise<ApiResponse<AttendanceReportDto[]>> {
    const params = buildQueryString({
      startDate,
      endDate,
      ...filters,
    });
    const endpoint = API_ENDPOINTS.ATTENDANCE.REPORT + params;
    return apiGet(endpoint);
  },

  /**
   * Get attendance by date range
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    employeeId?: number
  ): Promise<ApiResponse<AttendanceResponseDto[]>> {
    const params = buildQueryString({
      startDate,
      endDate,
      ...(employeeId && { employeeId }),
    });
    const endpoint = API_ENDPOINTS.ATTENDANCE.BY_DATE_RANGE + params;
    return apiGet(endpoint);
  },
};

/**
 * ============================================
 * AUTHENTICATION SERVICE EXAMPLE
 * ============================================
 * 
 * Copy this pattern to: features/auth/services/authService.ts
 */

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

export interface RegisterRequestDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UserProfileDto {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  avatar?: string;
  roles: string[];
  createdAt: string;
}

export const authService = {
  /**
   * Login user
   */
  async login(dto: LoginRequestDto): Promise<ApiResponse<LoginResponseDto>> {
    return apiPost(API_ENDPOINTS.AUTH.LOGIN, dto);
  },

  /**
   * Register new user
   */
  async register(dto: RegisterRequestDto): Promise<ApiResponse<UserProfileDto>> {
    return apiPost(API_ENDPOINTS.AUTH.REGISTER, dto);
  },

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    return apiPost(API_ENDPOINTS.AUTH.LOGOUT);
  },

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string
  ): Promise<ApiResponse<{ accessToken: string }>> {
    return apiPost(API_ENDPOINTS.AUTH.REFRESH_TOKEN, { refreshToken });
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<ApiResponse<UserProfileDto>> {
    return apiGet(API_ENDPOINTS.AUTH.ME);
  },

  /**
   * Change password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<void>> {
    return apiPost(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
  },
};

/**
 * ============================================
 * CUSTOM HOOKS EXAMPLE (React Query)
 * ============================================
 * 
 * Copy these patterns to hook files
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/common/config';

/**
 * Hook: Get employee list
 */
export const useEmployees = (page: number = 0, size: number = 10) => {
  return useQuery({
    queryKey: ['employees', page, size],
    queryFn: () => employeeService.getList(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
};

/**
 * Hook: Get single employee
 */
export const useEmployee = (id: number) => {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.getById(id),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook: Create employee
 */
export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: EmployeeCreateRequestDto) => employeeService.create(dto),
    onSuccess: () => {
      // Invalidate employees list
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      console.error('Create employee error:', message);
    },
  });
};

/**
 * Hook: Update employee
 */
export const useUpdateEmployee = (employeeId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: EmployeeUpdateRequestDto) =>
      employeeService.update(employeeId, dto),
    onSuccess: () => {
      // Invalidate specific employee and list
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

/**
 * Hook: Delete employee
 */
export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => employeeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};

export default {};
