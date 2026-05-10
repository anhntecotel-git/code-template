/**
 * ============================================
 * COMMON CONFIG USAGE GUIDE
 * ============================================
 * 
 * Hướng dẫn sử dụng các file config dùng chung
 * 
 * Cấu trúc:
 * ├── config/
 * │   ├── api.config.ts        # Axios instance, interceptors
 * │   ├── routes.config.ts     # Route constants
 * │   ├── env.config.ts        # Environment variables
 * │   └── README.ts            # File này
 * 
 * ============================================
 */

// ============================================
// 1. ENVIRONMENT CONFIGURATION (env.config.ts)
// ============================================

/**
 * Truy cập environment variables một cách type-safe
 * 
 * File .env:
 * VITE_API_URL=http://localhost:8080
 * VITE_API_TIMEOUT=30000
 * VITE_LOG_LEVEL=debug
 * 
 * Usage:
 */

import { envConfig, isEnv } from '@/common/config/env.config';

console.log(envConfig.API_URL); // http://localhost:8080
console.log(envConfig.API_TIMEOUT); // 30000
console.log(envConfig.APP_NAME); // ECOTEL App
console.log(envConfig.ENVIRONMENT); // development | staging | production

// Check environment
if (isEnv.isDevelopment) {
  // Dev-only code
}

if (isEnv.isProduction) {
  // Prod-only code
}

// ============================================
// 2. ROUTE CONFIGURATION (routes.config.ts)
// ============================================

/**
 * Quản lý tất cả các routes (frontend + backend) trong một chỗ
 * 
 * Lợi ích:
 * - Một source of truth cho tất cả routes
 * - Dễ refactor (thay đổi 1 chỗ, tất cả nơi sử dụng được update)
 * - Type-safe navigation
 * - Tránh hardcode strings
 */

import {
  ROUTES,
  API_ENDPOINTS,
  buildApiUrl,
  getEmployeeDetailRoute,
  buildQueryString,
  buildPaginationQuery,
} from '@/common/config/routes.config';

// 2.1. Frontend Routes
console.log(ROUTES.DASHBOARD.HOME); // /dashboard
console.log(ROUTES.EMPLOYEE.LIST); // /employees
console.log(ROUTES.EMPLOYEE.DETAIL); // /employees/:id

// 2.2. Navigation trong React Router
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate(ROUTES.DASHBOARD.HOME);
navigate(ROUTES.EMPLOYEE.LIST);
navigate(ROUTES.EMPLOYEE.DETAIL.replace(':id', '123'));
// Hoặc dùng helper
navigate(getEmployeeDetailRoute(123));

// 2.3. Backend API Endpoints
console.log(API_ENDPOINTS.AUTH.LOGIN); // /auth/login
console.log(API_ENDPOINTS.EMPLOYEE.LIST); // /employees
console.log(API_ENDPOINTS.EMPLOYEE.GET(1)); // /employees/1
console.log(API_ENDPOINTS.EMPLOYEE.UPDATE(1)); // /employees/1
console.log(buildApiUrl(API_ENDPOINTS.EMPLOYEE.LIST)); // http://localhost:8080/api/v1/employees

// 2.4. Query String Builders
const listQuery = buildPaginationQuery(0, 10, 'name:asc');
console.log(listQuery); // ?page=0&size=10&sort=name:asc

const customQuery = buildQueryString({
  page: 0,
  size: 10,
  status: 'ACTIVE',
  department: 'IT',
});
console.log(customQuery); // ?page=0&size=10&status=ACTIVE&department=IT

// ============================================
// 3. API CLIENT CONFIGURATION (api.config.ts)
// ============================================

/**
 * Axios instance với:
 * - Request interceptors (add auth token)
 * - Response interceptors (handle errors, refresh token)
 * - Error handling utilities
 * - Type-safe API methods
 * 
 * Features:
 * ✅ Automatic JWT token refresh
 * ✅ Centralized error handling
 * ✅ Request/response logging (dev mode)
 * ✅ Automatic 401 redirect to login
 * ✅ Custom error extraction
 */

import apiClient, {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  getErrorMessage,
  getFieldErrors,
  type ApiResponse,
} from '@/common/config/api.config';

// 3.1. Sử dụng apiClient trực tiếp
const response1 = await apiClient.get('/api/v1/employees');
const response2 = await apiClient.post('/api/v1/employees', {
  firstName: 'John',
  email: 'john@example.com',
});

// 3.2. Sử dụng convenience methods (type-safe)
interface Employee {
  id: number;
  firstName: string;
  email: string;
}

const employeeList = await apiGet<{ content: Employee[] }>('/api/v1/employees?page=0&size=10');
const newEmployee = await apiPost<Employee>('/api/v1/employees', {
  firstName: 'John',
});
const updated = await apiPut<Employee>('/api/v1/employees/1', { firstName: 'Jane' });
await apiDelete('/api/v1/employees/1');

// 3.3. Error Handling
try {
  const employee = await apiGet<Employee>('/api/v1/employees/999');
} catch (error) {
  const message = getErrorMessage(error);
  console.error('Error:', message);

  const fieldErrors = getFieldErrors(error);
  // { email: 'Email already exists', firstName: 'First name is required' }
}

// ============================================
// 4. PRACTICAL EXAMPLES
// ============================================

// ============================================
// 4.1. Example: Employee List Hook
// ============================================

import { useEffect, useState } from 'react';

export const useEmployeeList = (page: number = 0, size: number = 10) => {
  const [data, setData] = useState<Employee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Dùng route constants + API endpoints
        const endpoint = API_ENDPOINTS.EMPLOYEE.LIST + buildPaginationQuery(page, size);
        const response = await apiGet(endpoint);
        setData(response.data.content);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, size]);

  return { data, loading, error };
};

// ============================================
// 4.2. Example: Navigation Component
// ============================================

import { Link } from 'react-router-dom';

export const EmployeeLink = ({ employeeId, children }: any) => {
  return <Link to={getEmployeeDetailRoute(employeeId)}>{children}</Link>;
};

// Usage:
<EmployeeLink employeeId={123}>View Employee</EmployeeLink>;

// ============================================
// 4.3. Example: Create Employee Service
// ============================================

import { API_ENDPOINTS } from '@/common/config/routes.config';

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  position: string;
  departmentId: number;
}

export const employeeService = {
  async getList(page: number = 0, size: number = 10) {
    const endpoint = API_ENDPOINTS.EMPLOYEE.LIST + buildPaginationQuery(page, size);
    return apiGet(endpoint);
  },

  async getById(id: number) {
    const endpoint = API_ENDPOINTS.EMPLOYEE.GET(id);
    return apiGet<Employee>(endpoint);
  },

  async create(dto: CreateEmployeeDto) {
    return apiPost<Employee>(API_ENDPOINTS.EMPLOYEE.CREATE, dto);
  },

  async update(id: number, dto: Partial<CreateEmployeeDto>) {
    return apiPut<Employee>(API_ENDPOINTS.EMPLOYEE.UPDATE(id), dto);
  },

  async delete(id: number) {
    return apiDelete(API_ENDPOINTS.EMPLOYEE.DELETE(id));
  },

  async search(query: string) {
    const endpoint = API_ENDPOINTS.EMPLOYEE.SEARCH + buildQueryString({ q: query });
    return apiGet(endpoint);
  },
};

// ============================================
// 4.4. Example: React Query Integration
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useEmployees = (page: number = 0, size: number = 10) => {
  return useQuery({
    queryKey: ['employees', page, size],
    queryFn: () => employeeService.getList(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateEmployeeDto) => employeeService.create(dto),
    onSuccess: () => {
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      console.error('Error creating employee:', message);
    },
  });
};

// Usage:
const { data, isLoading } = useEmployees(0, 10);
const { mutate: createEmployee } = useCreateEmployee();

createEmployee({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phoneNumber: '0123456789',
  position: 'Manager',
  departmentId: 1,
});

// ============================================
// 5. BEST PRACTICES
// ============================================

/**
 * ✅ DO:
 * 
 * 1. Luôn sử dụng route constants thay vì hardcode
 *    const navigate = useNavigate();
 *    navigate(ROUTES.EMPLOYEE.LIST);
 * 
 * 2. Sử dụng API_ENDPOINTS cho tất cả API calls
 *    const endpoint = API_ENDPOINTS.EMPLOYEE.GET(id);
 *    const response = await apiGet(endpoint);
 * 
 * 3. Tách API calls vào service files
 *    export const employeeService = { ... }
 *    // Use in hooks/components:
 *    const response = await employeeService.getList();
 * 
 * 4. Sử dụng helper functions (buildQueryString, etc.)
 *    const query = buildQueryString({ page: 0, size: 10 });
 * 
 * 5. Handle errors với getErrorMessage
 *    catch (error) {
 *      const message = getErrorMessage(error);
 *      showNotification(message);
 *    }
 * 
 * ❌ DON'T:
 * 
 * 1. Hardcode URLs
 *    ❌ navigate('/employees') → ✅ navigate(ROUTES.EMPLOYEE.LIST)
 * 
 * 2. Hardcode API endpoints
 *    ❌ apiGet('/api/v1/employees') → ✅ apiGet(API_ENDPOINTS.EMPLOYEE.LIST)
 * 
 * 3. Mixing business logic with components
 *    ❌ Make API call directly in component
 *    ✅ Create custom hooks or services
 * 
 * 4. Ignoring error messages
 *    ❌ catch (error) { console.error(error); }
 *    ✅ const message = getErrorMessage(error);
 * 
 * 5. Manual query string building
 *    ❌ `?page=${page}&size=${size}&filter=${filter}`
 *    ✅ buildQueryString({ page, size, filter })
 */

// ============================================
// 6. ENVIRONMENT-SPECIFIC EXAMPLES
// ============================================

// .env.local (Development)
// VITE_API_URL=http://localhost:8080
// VITE_LOG_LEVEL=debug

// .env.staging
// VITE_API_URL=https://api-staging.ecotel.com
// VITE_LOG_LEVEL=info

// .env.production
// VITE_API_URL=https://api.ecotel.com
// VITE_LOG_LEVEL=warn

// ============================================
// 7. SETUP INSTRUCTIONS
// ============================================

/**
 * 1. Copy .env.example to .env.local
 *    cp .env.example .env.local
 * 
 * 2. Update values in .env.local for your environment
 * 
 * 3. Import in your components:
 *    import { ROUTES } from '@/common/config/routes.config'
 *    import { API_ENDPOINTS } from '@/common/config/routes.config'
 *    import apiClient from '@/common/config/api.config'
 * 
 * 4. Optionally create service files:
 *    services/employeeService.ts
 *    services/attendanceService.ts
 *    etc.
 * 
 * 5. Create custom hooks for data fetching:
 *    hooks/useEmployees.ts
 *    hooks/useAttendance.ts
 *    etc.
 */

export default {};
