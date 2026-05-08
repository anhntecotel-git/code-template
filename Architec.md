# 🏗️ KIẾN TRÚC HỆ THỐNG ECOTEL APP

## 📋 Mục Lục
1. [Tổng Quan Kiến Trúc](#tổng-quan-kiến-trúc)
2. [Backend Architecture](#backend-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [API Contract & DTO](#api-contract--dto)
5. [Coding Convention](#coding-convention)
6. [Database Design](#database-design)
7. [Infrastructure & Deployment](#infrastructure--deployment)
8. [Microservice Strategy](#microservice-strategy)
9. [Development Workflow](#development-workflow)

---

## 🎯 Tổng Quan Kiến Trúc

### Nguyên Tắc Thiết Kế
- ✅ **Clean Architecture**: Tách biệt rõ ràng giữa các layer
- ✅ **Layered Architecture**: Controller → DTO → Service → Repository → DB
- ✅ **Domain-Driven Design**: Tổ chức code theo domain (attendance, employee, department, etc.)
- ✅ **API First**: FE và BE tách biệt hoàn toàn, giao tiếp qua REST API
- ✅ **Microservice Ready**: Code có thể tách thành các microservice độc lập
- ✅ **Zero Entity Exposure**: Entity không bao giờ xuất hiện trong API response
- ✅ **Security First**: Authentication & Authorization từ request đầu tiên

### Kiến Trúc Tổng Thể
```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│              Vite + TypeScript + Tailwind CSS             │
└────────────────────┬────────────────────────────────────┘
                     │ REST API (JSON)
                     │ /api/v1/...
┌────────────────────▼────────────────────────────────────┐
│                 BACKEND (Spring Boot)                    │
│              Java 21 + Spring Boot 4.0.6                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Controller Layer (HTTP Request/Response)         │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Service Layer (Business Logic)                   │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Repository Layer (Data Access)                   │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ JDBC/JPA
┌────────────────────▼────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                  │
└─────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Redis Cache  │  │Message Queue │  │External API  │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔧 Backend Architecture

### Stack Công Nghệ
- **Framework**: Spring Boot 4.0.6
- **Language**: Java 21
- **Database**: PostgreSQL
- **Cache**: Redis
- **Security**: Spring Security + JWT
- **Build**: Maven

### Cấu Trúc Thư Mục Backend

```
apps/backend/
├── src/main/
│   ├── java/com/ecotel/app/
│   │   ├── AppApplication.java               # Main Application Class
│   │   │
│   │   ├── common/                           # ⭐ Shared Code (không domain-specific)
│   │   │   ├── config/                       # Configuration Classes
│   │   │   │   ├── AppConfig.java            # Application Config
│   │   │   │   ├── SecurityConfig.java       # Security Config
│   │   │   │   ├── CacheConfig.java          # Cache Config
│   │   │   │   └── CorsConfig.java           # CORS Config
│   │   │   ├── constant/                     # Constants
│   │   │   │   ├── ApiConstants.java         # API Constants
│   │   │   │   ├── MessageConstants.java     # Message Constants
│   │   │   │   └── ValidationConstants.java  # Validation Constants
│   │   │   ├── exception/                    # Custom Exceptions
│   │   │   │   ├── BusinessException.java
│   │   │   │   ├── ValidationException.java
│   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   └── GlobalExceptionHandler.java # ⭐ Centralized Exception Handler
│   │   │   ├── mapper/                       # DTO Mappers (MapStruct)
│   │   │   │   ├── EntityDtoMapper.java      # Base Mapper Interface
│   │   │   │   └── [Entity]Mapper.java       # Specific Mappers
│   │   │   ├── response/                     # Response Wrappers
│   │   │   │   ├── ApiResponse.java          # ⭐ Standard API Response
│   │   │   │   ├── PagedResponse.java        # Paginated Response
│   │   │   │   └── ErrorResponse.java        # Error Response
│   │   │   ├── security/                     # Security Utils
│   │   │   │   ├── JwtTokenProvider.java
│   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   ├── SecurityUser.java         # UserDetails Implementation
│   │   │   │   └── SecurityContextUtils.java # Utility Methods
│   │   │   ├── util/                         # Utility Classes
│   │   │   │   ├── DateUtils.java
│   │   │   │   ├── StringUtils.java
│   │   │   │   ├── CollectionUtils.java
│   │   │   │   └── FileUtils.java
│   │   │   └── validator/                    # Custom Validators
│   │   │       ├── EmailValidator.java
│   │   │       └── PhoneValidator.java
│   │   │
│   │   ├── infrastructure/                   # ⭐ Infrastructure Layer (External Concerns)
│   │   │   ├── cache/                        # Caching Logic
│   │   │   │   ├── CacheService.java
│   │   │   │   └── [Entity]CacheService.java
│   │   │   ├── external/                     # External APIs Integration
│   │   │   │   ├── EmailService.java
│   │   │   │   ├── SmsService.java
│   │   │   │   └── PaymentGatewayService.java
│   │   │   ├── persistence/                  # Database Configuration
│   │   │   │   ├── Entity Base Classes
│   │   │   │   └── Custom Repository Implementations
│   │   │   └── queue/                        # Message Queue
│   │   │       ├── MessageProducer.java
│   │   │       └── MessageConsumer.java
│   │   │
│   │   └── modules/                          # ⭐ Domain Modules (Feature Modules)
│   │       │
│   │       ├── auth/                         # Authentication Module
│   │       │   ├── controller/
│   │       │   │   └── AuthController.java           # POST /api/v1/auth/login
│   │       │   ├── dto/                              # ⭐ Data Transfer Objects
│   │       │   │   ├── LoginRequestDto.java
│   │       │   │   ├── LoginResponseDto.java
│   │       │   │   ├── RegisterRequestDto.java
│   │       │   │   └── RefreshTokenRequestDto.java
│   │       │   ├── service/
│   │       │   │   ├── AuthService.java              # Business Logic
│   │       │   │   └── AuthServiceImpl.java
│   │       │   ├── repository/
│   │       │   │   └── UserRepository.java
│   │       │   ├── entity/                           # ⭐ JPA Entities (NOT exposed to API)
│   │       │   │   ├── User.java
│   │       │   │   └── Role.java
│   │       │   └── mapper/
│   │       │       └── AuthMapper.java               # Entity ↔ DTO Mapping
│   │       │
│   │       ├── employee/                      # Employee Module
│   │       │   ├── controller/
│   │       │   │   └── EmployeeController.java       # GET/POST/PUT/DELETE /api/v1/employees
│   │       │   ├── dto/
│   │       │   │   ├── EmployeeCreateRequestDto.java
│   │       │   │   ├── EmployeeUpdateRequestDto.java
│   │       │   │   ├── EmployeeResponseDto.java
│   │       │   │   └── EmployeeListItemDto.java
│   │       │   ├── service/
│   │       │   │   ├── EmployeeService.java
│   │       │   │   └── EmployeeServiceImpl.java
│   │       │   ├── repository/
│   │       │   │   ├── EmployeeRepository.java
│   │       │   │   └── EmployeeSpecification.java    # Search & Filter
│   │       │   ├── entity/
│   │       │   │   └── Employee.java
│   │       │   └── mapper/
│   │       │       └── EmployeeMapper.java
│   │       │
│   │       ├── attendance/                    # Attendance Module
│   │       ├── department/                    # Department Module
│   │       ├── role/                          # Role Module
│   │       ├── report/                        # Report Module
│   │       └── setting/                       # Settings Module
│   │
│   └── resources/
│       ├── application.properties             # Main Config
│       ├── application-dev.properties         # Dev Profile
│       ├── application-prod.properties        # Prod Profile
│       └── db/
│           └── migration/                     # Flyway/Liquibase Migrations
│
└── src/test/
    └── java/com/ecotel/app/
        ├── modules/
        │   ├── auth/
        │   │   ├── AuthControllerTests.java
        │   │   ├── AuthServiceTests.java
        │   │   └── AuthIntegrationTests.java
        │   └── employee/
        │       ├── EmployeeControllerTests.java
        │       └── EmployeeServiceTests.java
        └── common/
            ├── GlobalExceptionHandlerTests.java
            └── SecurityConfigTests.java
```

### Layered Architecture - Chi Tiết

#### 1️⃣ **Controller Layer** (HTTP Interface)
```java
// EmployeeController.java
@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employees", description = "Employee Management API")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeMapper employeeMapper;

    // ✅ GET /api/v1/employees?page=0&size=10&department=IT
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<PagedResponse<EmployeeResponseDto>>> 
        listEmployees(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String department
        ) {
        Page<Employee> employees = employeeService.findAll(page, size, department);
        List<EmployeeResponseDto> dtoList = employeeMapper.toDtoList(employees.getContent());
        PagedResponse<EmployeeResponseDto> response = PagedResponse.of(
            dtoList, 
            employees.getTotalElements(), 
            employees.getTotalPages()
        );
        return ApiResponse.success(response);
    }

    // ✅ POST /api/v1/employees
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EmployeeResponseDto>> 
        createEmployee(@Valid @RequestBody EmployeeCreateRequestDto dto) {
        Employee employee = employeeService.create(dto);
        EmployeeResponseDto responseDto = employeeMapper.toDto(employee);
        return ApiResponse.created(responseDto);
    }

    // ❌ NEVER expose Entity directly
    // ❌ @GetMapping("/{id}") 
    // ❌ public Employee getEmployee(@PathVariable Long id) { ... }
}
```

#### 2️⃣ **DTO Layer** (Data Transfer Objects)
```java
// EmployeeResponseDto.java - ⭐ What API returns
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponseDto {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private String position;
    private DepartmentSimpleDto department;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

// EmployeeCreateRequestDto.java - ⭐ What API receives
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeCreateRequestDto {
    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50)
    private String lastName;

    @NotBlank
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank
    @Pattern(regexp = "^[0-9]{10,11}$")
    private String phoneNumber;

    @NotBlank
    private String position;

    @NotNull
    private Long departmentId;
}

// ❌ NEVER: Expose Entity in API
// ❌ public class EmployeeResponseDto extends Employee { ... }
```

#### 3️⃣ **Service Layer** (Business Logic)
```java
// EmployeeService.java - Interface
public interface EmployeeService {
    Page<Employee> findAll(int page, int size, String department);
    Employee findById(Long id);
    Employee create(EmployeeCreateRequestDto dto);
    Employee update(Long id, EmployeeUpdateRequestDto dto);
    void delete(Long id);
    boolean emailExists(String email);
}

// EmployeeServiceImpl.java - Implementation
@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeMapper employeeMapper;
    private final EmployeeCacheService cacheService;

    @Override
    @Transactional(readOnly = true)
    public Page<Employee> findAll(int page, int size, String department) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        
        if (StringUtils.hasText(department)) {
            return employeeRepository.findByDepartment_Name(department, pageable);
        }
        return employeeRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public Employee create(EmployeeCreateRequestDto dto) {
        // Validation
        if (emailExists(dto.getEmail())) {
            throw new BusinessException("Email already exists");
        }

        // Business Logic
        Department department = departmentRepository.findById(dto.getDepartmentId())
            .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        // Entity Mapping
        Employee employee = employeeMapper.toEntity(dto);
        employee.setDepartment(department);

        // Persistence
        Employee saved = employeeRepository.save(employee);
        
        // Cache Invalidation
        cacheService.invalidateList();

        log.info("Employee created: {}", saved.getId());
        return saved;
    }
}
```

#### 4️⃣ **Repository Layer** (Data Access)
```java
// EmployeeRepository.java - ⭐ Spring Data JPA
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmail(String email);
    Page<Employee> findByDepartment_Name(String name, Pageable pageable);
    List<Employee> findByIsActive(boolean isActive);
    // Custom Query
    @Query("SELECT e FROM Employee e WHERE e.position = ?1 AND e.department.id = ?2")
    List<Employee> findByPositionAndDepartment(String position, Long departmentId);
}

// ⭐ Optional: Custom Repository Implementation for Complex Queries
@Repository
@RequiredArgsConstructor
public class EmployeeRepositoryCustomImpl implements EmployeeRepositoryCustom {
    private final EntityManager em;

    @Override
    public Page<Employee> findByAdvancedCriteria(EmployeeSearchCriteria criteria, Pageable pageable) {
        // Use JPA Criteria API or QueryDSL for complex queries
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Employee> query = cb.createQuery(Employee.class);
        Root<Employee> root = query.from(Employee.class);

        List<Predicate> predicates = new ArrayList<>();
        if (StringUtils.hasText(criteria.getName())) {
            predicates.add(cb.like(root.get("firstName"), "%" + criteria.getName() + "%"));
        }
        // ... more conditions
        query.where(cb.and(predicates.toArray(new Predicate[0])));
        // ... pagination logic
    }
}
```

#### 5️⃣ **Entity Layer** (Domain Model)
```java
// Employee.java - ⭐ JPA Entity (NOT exposed to API)
@Entity
@Table(name = "employees", indexes = {
    @Index(name = "idx_email", columnList = "email"),
    @Index(name = "idx_department_id", columnList = "department_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Employee extends BaseEntity {  // See below for BaseEntity

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String firstName;

    @Column(nullable = false, length = 50)
    private String lastName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(length = 11)
    private String phoneNumber;

    @Column(nullable = false, length = 100)
    private String position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Column(columnDefinition = "boolean default true")
    private Boolean isActive = true;

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    private List<Attendance> attendances = new ArrayList<>();
}

// BaseEntity.java - ⭐ Abstract Base for Common Fields
@MappedSuperclass
@Data
public abstract class BaseEntity {
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(nullable = false, updatable = false, length = 100)
    private String createdBy;

    @Column(nullable = false, length = 100)
    private String updatedBy;

    @Version
    private Long version;  // Optimistic Locking
}
```

---

## 🎨 Frontend Architecture

### Stack Công Nghệ
- **Framework**: React 19
- **Language**: TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS + PostCSS
- **State Management**: Redux (hoặc Zustand)
- **HTTP Client**: Axios + React Query
- **UI Components**: Custom + Headless UI

### Cấu Trúc Thư Mục Frontend

```
apps/frontend/
├── src/
│   ├── main.tsx                         # Entry Point
│   ├── App.tsx                          # Root Component
│   │
│   ├── app/                             # ⭐ App-level Setup
│   │   ├── layouts/                     # Page Layouts
│   │   │   ├── MainLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   └── DashboardLayout.tsx
│   │   ├── providers/                   # Context Providers
│   │   │   ├── ReduxProvider.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   └── QueryClientProvider.tsx
│   │   ├── router/                      # React Router Config
│   │   │   ├── routes.tsx               # All routes definition
│   │   │   ├── PrivateRoute.tsx         # Protected routes
│   │   │   └── Router.tsx               # Router component
│   │   └── store/                       # Redux Store
│   │       ├── store.ts
│   │       ├── hooks.ts                 # useAppDispatch, useAppSelector
│   │       └── slices/
│   │           ├── authSlice.ts         # Auth state
│   │           ├── uiSlice.ts           # UI state (modals, loading)
│   │           └── userSlice.ts         # User profile state
│   │
│   ├── common/                          # ⭐ Shared Utilities (không feature-specific)
│   │   ├── config/
│   │   │   ├── api.config.ts            # Axios instance, interceptors
│   │   │   ├── routes.config.ts         # Route constants
│   │   │   └── env.config.ts            # Environment variables
│   │   ├── constants/
│   │   │   ├── api.constants.ts         # API endpoints
│   │   │   ├── messages.constants.ts    # Error/success messages
│   │   │   └── regex.constants.ts       # Validation patterns
│   │   ├── enums/
│   │   │   ├── EmployeeStatus.ts
│   │   │   ├── AttendanceType.ts
│   │   │   └── UserRole.ts
│   │   ├── hooks/                       # Shared Custom Hooks
│   │   │   ├── useAuth.ts               # Authentication hook
│   │   │   ├── useApi.ts                # API call hook
│   │   │   ├── useForm.ts               # Form handling hook
│   │   │   ├── useDebounce.ts
│   │   │   └── usePagination.ts
│   │   ├── types/                       # ⭐ Shared Type Definitions
│   │   │   ├── api.types.ts             # API request/response types
│   │   │   ├── entity.types.ts          # DTO types from API
│   │   │   ├── ui.types.ts              # UI component props
│   │   │   └── common.types.ts          # Common types
│   │   ├── utils/
│   │   │   ├── dateUtils.ts
│   │   │   ├── stringUtils.ts
│   │   │   ├── formatters.ts            # Number, date formatting
│   │   │   ├── validators.ts            # Client-side validation
│   │   │   └── errorHandler.ts          # Error handling utilities
│   │   └── validations/
│   │       ├── schemas/                 # Zod/Yup validation schemas
│   │       │   ├── loginSchema.ts
│   │       │   ├── employeeSchema.ts
│   │       │   └── departmentSchema.ts
│   │       └── rules.ts                 # Validation rules
│   │
│   ├── components/                      # ⭐ Reusable UI Components
│   │   ├── chart/                       # Chart Components
│   │   │   ├── BarChart.tsx
│   │   │   └── LineChart.tsx
│   │   ├── feedback/                    # Feedback Components
│   │   │   ├── Toast.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Alert.tsx
│   │   ├── form/                        # Form Components
│   │   │   ├── FormInput.tsx             # Input wrapper
│   │   │   ├── FormSelect.tsx            # Select wrapper
│   │   │   ├── FormCheckbox.tsx
│   │   │   └── FormDatePicker.tsx
│   │   ├── layout/                      # Layout Components
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── PageContainer.tsx
│   │   ├── table/                       # Table Components
│   │   │   ├── DataTable.tsx            # Generic table component
│   │   │   ├── TablePagination.tsx
│   │   │   └── TableHeader.tsx
│   │   └── ui/                          # Basic UI Components
│   │       ├── Button.tsx               # Custom button
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       ├── Spinner.tsx
│   │       └── Input.tsx
│   │
│   ├── features/                        # ⭐ Feature Modules (Business Logic)
│   │   │
│   │   ├── auth/                        # Auth Feature
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx        # Login form
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   └── ResetPasswordForm.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useLogin.ts          # Login logic
│   │   │   │   ├── useRegister.ts
│   │   │   │   └── useLogout.ts
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx        # Login page
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   └── ResetPasswordPage.tsx
│   │   │   ├── services/
│   │   │   │   └── authService.ts       # Auth API calls
│   │   │   ├── store/
│   │   │   │   └── authSlice.ts         # Auth Redux slice
│   │   │   └── types/
│   │   │       └── auth.types.ts        # Auth-specific types
│   │   │
│   │   ├── employee/                    # Employee Feature
│   │   │   ├── components/
│   │   │   │   ├── EmployeeTable.tsx    # List employees
│   │   │   │   ├── EmployeeForm.tsx     # Create/Update form
│   │   │   │   ├── EmployeeCard.tsx     # Card view
│   │   │   │   └── EmployeeFilters.tsx  # Filter component
│   │   │   ├── hooks/
│   │   │   │   ├── useEmployees.ts      # Fetch employees
│   │   │   │   ├── useCreateEmployee.ts
│   │   │   │   ├── useUpdateEmployee.ts
│   │   │   │   └── useDeleteEmployee.ts
│   │   │   ├── pages/
│   │   │   │   ├── EmployeeListPage.tsx # List page
│   │   │   │   ├── EmployeeDetailPage.tsx
│   │   │   │   └── EmployeeFormPage.tsx # Create/Edit page
│   │   │   ├── services/
│   │   │   │   └── employeeService.ts   # Employee API calls
│   │   │   ├── store/
│   │   │   │   └── employeeSlice.ts
│   │   │   └── types/
│   │   │       └── employee.types.ts
│   │   │
│   │   ├── attendance/
│   │   ├── department/
│   │   ├── dashboard/
│   │   ├── report/
│   │   └── setting/
│   │
│   ├── hooks/                           # App-level Custom Hooks
│   │   └── useAppHooks.ts
│   │
│   ├── lib/                             # Third-party Library Configuration
│   │   ├── axios.ts                     # Axios setup
│   │   ├── redux.ts                     # Redux store setup
│   │   └── queryClient.ts               # React Query setup
│   │
│   ├── pages/                           # Page Wrappers (if not using feature-based pages)
│   │   └── NotFoundPage.tsx
│   │
│   ├── App.css                          # Global styles
│   ├── index.css                        # Tailwind imports
│   └── main.tsx                         # Entry point
│
├── public/                              # Static Assets
│   ├── logo.svg
│   └── favicon.ico
│
├── vite.config.ts                       # Vite Configuration
├── tsconfig.json                        # TypeScript Config
├── tailwind.config.js                   # Tailwind Config
├── postcss.config.js                    # PostCSS Config
├── eslint.config.js                     # ESLint Config
└── package.json                         # Dependencies
```

### React Component Pattern

```typescript
// ✅ GOOD: Feature-based component with proper separation
// features/employee/components/EmployeeTable.tsx
import React, { useState } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { Employee } from '../types/employee.types';

interface EmployeeTableProps {
  onEdit: (employee: Employee) => void;
  onDelete: (id: number) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({ onEdit, onDelete }) => {
  const { data, loading, error } = useEmployees();
  const [page, setPage] = useState(0);

  if (loading) return <Spinner />;
  if (error) return <Alert type="error" message={error} />;

  return (
    <DataTable
      columns={[
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
      ]}
      data={data?.content || []}
      actions={{
        onEdit,
        onDelete,
      }}
      pagination={{
        page,
        totalPages: data?.totalPages || 0,
        onPageChange: setPage,
      }}
    />
  );
};

// ❌ BAD: Everything mixed together
// components/Employee.tsx
export const Employee = () => {
  // API calls mixed with UI logic
  // No prop interface, no separation of concerns
};
```

---

## 📡 API Contract & DTO

### API Response Standard

#### ✅ Success Response
```json
{
  "success": true,
  "code": "200",
  "message": "Request successful",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "timestamp": "2024-05-07T10:30:00Z"
}
```

#### ✅ Paginated Response
```json
{
  "success": true,
  "code": "200",
  "message": "Request successful",
  "data": {
    "content": [
      { "id": 1, "firstName": "John" },
      { "id": 2, "firstName": "Jane" }
    ],
    "totalElements": 100,
    "totalPages": 10,
    "currentPage": 0,
    "pageSize": 10
  },
  "timestamp": "2024-05-07T10:30:00Z"
}
```

#### ❌ Error Response
```json
{
  "success": false,
  "code": "400",
  "message": "Invalid email format",
  "errors": {
    "email": "Must be a valid email address"
  },
  "timestamp": "2024-05-07T10:30:00Z"
}
```

### Versioned API Endpoints
```
GET    /api/v1/employees              # List all
POST   /api/v1/employees              # Create
GET    /api/v1/employees/{id}         # Get one
PUT    /api/v1/employees/{id}         # Update
DELETE /api/v1/employees/{id}         # Delete

GET    /api/v1/employees?page=0&size=10&sort=name&filter=status:active
```

### DTO Naming Convention
```
{Entity}ResponseDto      # API Response (GET)
{Entity}CreateRequestDto # API Request for creation (POST)
{Entity}UpdateRequestDto # API Request for update (PUT)
{Entity}ListItemDto      # List item representation
{Entity}SimpleDto        # Minimal representation (for relationships)
PagedResponse<T>         # Pagination wrapper
ApiResponse<T>           # Standard API response wrapper
```

### Standard Request/Response Classes

```java
// common/response/ApiResponse.java
@Data
@Builder
public class ApiResponse<T> {
    private Boolean success;
    private String code;
    private String message;
    private T data;
    private Map<String, Object> errors;
    private LocalDateTime timestamp;

    public static <T> ResponseEntity<ApiResponse<T>> success(T data) {
        return ResponseEntity.ok(ApiResponse.<T>builder()
            .success(true)
            .code("200")
            .message("Request successful")
            .data(data)
            .timestamp(LocalDateTime.now())
            .build());
    }

    public static <T> ResponseEntity<ApiResponse<T>> created(T data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<T>builder()
            .success(true)
            .code("201")
            .message("Resource created successfully")
            .data(data)
            .timestamp(LocalDateTime.now())
            .build());
    }

    public static <T> ResponseEntity<ApiResponse<T>> error(String message, Map<String, Object> errors) {
        return ResponseEntity.badRequest().body(ApiResponse.<T>builder()
            .success(false)
            .code("400")
            .message(message)
            .errors(errors)
            .timestamp(LocalDateTime.now())
            .build());
    }
}

// common/response/PagedResponse.java
@Data
@Builder
public class PagedResponse<T> {
    private List<T> content;
    private Long totalElements;
    private Integer totalPages;
    private Integer currentPage;
    private Integer pageSize;

    public static <T> PagedResponse<T> of(List<T> content, Long totalElements, Integer totalPages) {
        return PagedResponse.<T>builder()
            .content(content)
            .totalElements(totalElements)
            .totalPages(totalPages)
            .build();
    }
}
```

---

## 📝 Coding Convention

### Java Backend Convention

#### 1. Naming Convention
```java
// ✅ Package Names (lowercase, domain-based)
com.ecotel.app.modules.employee.service

// ✅ Class Names (PascalCase)
public class EmployeeServiceImpl { }

// ✅ Method Names (camelCase, verb prefix)
public Employee findEmployeeById(Long id) { }
public Page<Employee> findAllEmployees(Pageable pageable) { }
public void createEmployee(Employee employee) { }
public Employee updateEmployee(Long id, Employee employee) { }
public void deleteEmployee(Long id) { }

// ✅ Variable Names (camelCase)
private String firstName;
private List<Department> departments;

// ✅ Constants (UPPER_SNAKE_CASE)
private static final String DEFAULT_PAGE_SIZE = "10";
private static final Long MAX_FILE_SIZE = 5242880L; // 5MB

// ✅ Interface Names (prefix with 'I' is optional, use verb or noun)
public interface EmployeeService { }  // Good
public interface IEmployeeRepository { }  // Also acceptable
```

#### 2. Method Size & Complexity
```java
// ❌ BAD: Too large, multiple responsibilities
@PostMapping("/employees")
public ResponseEntity<ApiResponse<EmployeeResponseDto>> createEmployee(
    @Valid @RequestBody EmployeeCreateRequestDto dto) {
    // Validation
    if (employeeService.emailExists(dto.getEmail())) {
        return ResponseEntity.badRequest().build();
    }
    // Business logic
    Employee employee = new Employee();
    // ... many lines
    // Caching
    // ... many lines
    // Logging
    // ... many lines
}

// ✅ GOOD: Single responsibility, delegated to service
@PostMapping
public ResponseEntity<ApiResponse<EmployeeResponseDto>> createEmployee(
    @Valid @RequestBody EmployeeCreateRequestDto dto) {
    Employee employee = employeeService.create(dto);
    EmployeeResponseDto responseDto = employeeMapper.toDto(employee);
    return ApiResponse.created(responseDto);
}
```

#### 3. Exception Handling
```java
// ✅ GOOD: Custom exceptions with meaningful messages
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}

@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException ex) {
        return ApiResponse.error(ex.getMessage(), null);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ApiResponse.<Void>builder()
                .success(false)
                .code("404")
                .message(ex.getMessage())
                .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationException(
        MethodArgumentNotValidException ex) {
        Map<String, Object> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            errors.put(error.getField(), error.getDefaultMessage())
        );
        return ApiResponse.error("Validation failed", errors);
    }
}
```

#### 4. Annotations & Validation
```java
// ✅ GOOD: DTO with JSR-380 validation annotations
@Data
public class EmployeeCreateRequestDto {
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^[0-9]{10,11}$", message = "Phone must be 10-11 digits")
    private String phoneNumber;

    @NotNull(message = "Department ID is required")
    @Positive(message = "Department ID must be positive")
    private Long departmentId;
}
```

#### 5. Transactional & Performance
```java
// ✅ GOOD: Appropriate transaction scope
@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    @Override
    @Transactional(readOnly = true)  // Read-only transaction
    public Page<Employee> findAll(Pageable pageable) {
        return employeeRepository.findAll(pageable);
    }

    @Override
    @Transactional  // Write transaction with rollback
    public Employee create(EmployeeCreateRequestDto dto) {
        // Business logic
        Employee employee = employeeRepository.save(entity);
        cacheService.invalidateList();
        return employee;
    }

    // ✅ GOOD: Lazy loading with @EntityGraph
    @Override
    public Employee findById(Long id) {
        return employeeRepository.findByIdWithDepartment(id)
            .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
    }
}

// ✅ GOOD: Query optimization
@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    @EntityGraph(attributePaths = "department")
    @Query("SELECT e FROM Employee e WHERE e.id = ?1")
    Optional<Employee> findByIdWithDepartment(Long id);
}
```

### TypeScript Frontend Convention

#### 1. Naming Convention
```typescript
// ✅ File Names
EmployeeList.tsx         // Component
employeeService.ts       // Service
employee.types.ts        // Type definitions
useEmployees.ts          // Custom hook
employeeSlice.ts         // Redux slice

// ✅ Type Names (PascalCase)
interface Employee { }
type EmployeeStatus = 'ACTIVE' | 'INACTIVE';

// ✅ Variable Names (camelCase)
const [employees, setEmployees] = useState<Employee[]>([]);

// ✅ Constants (UPPER_SNAKE_CASE)
const API_ENDPOINTS = {
  EMPLOYEES: '/api/v1/employees',
  DEPARTMENTS: '/api/v1/departments',
};

// ✅ Component Names (PascalCase)
export const EmployeeTable: React.FC<Props> = () => { }

// ✅ Hook Names (prefix with 'use')
export const useEmployees = () => { }
```

#### 2. Component Structure
```typescript
// ✅ GOOD: Clean component with proper typing
import React, { useState } from 'react';
import { useEmployees } from '@/features/employee/hooks/useEmployees';
import { DataTable } from '@/components/table/DataTable';

interface EmployeeTableProps {
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  onEdit,
  onDelete,
}) => {
  const { data, isLoading, error } = useEmployees();
  const [page, setPage] = useState(0);

  if (isLoading) return <Spinner />;
  if (error) return <Alert type="error" message={error.message} />;

  return (
    <DataTable
      columns={COLUMNS}
      data={data?.content || []}
      onRowClick={(row) => onEdit(row.id)}
    />
  );
};
```

#### 3. API Service Pattern
```typescript
// ✅ GOOD: Centralized API service
// common/config/api.config.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  timeout: 30000,
});

// Request Interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// features/employee/services/employeeService.ts
import apiClient from '@/common/config/api.config';
import { EmployeeResponseDto, EmployeeCreateRequestDto } from '../types/employee.types';
import { ApiResponse, PagedResponse } from '@/common/types/api.types';

export const employeeService = {
  async getAll(page: number = 0, size: number = 10): Promise<PagedResponse<EmployeeResponseDto>> {
    const response = await apiClient.get<ApiResponse<PagedResponse<EmployeeResponseDto>>>(
      `/employees?page=${page}&size=${size}`
    );
    return response.data.data;
  },

  async getById(id: number): Promise<EmployeeResponseDto> {
    const response = await apiClient.get<ApiResponse<EmployeeResponseDto>>(
      `/employees/${id}`
    );
    return response.data.data;
  },

  async create(dto: EmployeeCreateRequestDto): Promise<EmployeeResponseDto> {
    const response = await apiClient.post<ApiResponse<EmployeeResponseDto>>(
      '/employees',
      dto
    );
    return response.data.data;
  },

  async update(id: number, dto: Partial<EmployeeCreateRequestDto>): Promise<EmployeeResponseDto> {
    const response = await apiClient.put<ApiResponse<EmployeeResponseDto>>(
      `/employees/${id}`,
      dto
    );
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  },
};
```

#### 4. Custom Hooks Pattern
```typescript
// ✅ GOOD: Custom hook for data fetching
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employeeService';
import { EmployeeCreateRequestDto } from '../types/employee.types';

export const useEmployees = (page: number = 0, size: number = 10) => {
  return useQuery({
    queryKey: ['employees', page, size],
    queryFn: () => employeeService.getAll(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: EmployeeCreateRequestDto) => employeeService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
};
```

---

## 🗄️ Database Design

### Entity Relationship Diagram (ERD)
```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│    User     │───────│     Role     │───────│ Permission      │
├─────────────┤       ├──────────────┤       ├─────────────────┤
│ id (PK)     │       │ id (PK)      │       │ id (PK)         │
│ email       │       │ name         │       │ name            │
│ password    │       │ code         │       │ code            │
│ isActive    │       │ description  │       │ description     │
└─────────────┘       └──────────────┘       └─────────────────┘
       │                     │                       │
       │ 1:N                 │ M:N                    │
       │                     └───────────────────────┘
       │                              Role_Permission
       │
       └─────────────────────────────┐
                                     │
                                     │ 1:N
                                     ▼
                            ┌─────────────────┐
                            │   Employee      │
                            ├─────────────────┤
                            │ id (PK)         │
                            │ firstName       │
                            │ lastName        │
                            │ email           │
                            │ phoneNumber     │
                            │ position        │
                            │ departmentId(FK)│
                            │ userId(FK)      │
                            │ isActive        │
                            │ createdAt       │
                            │ updatedAt       │
                            └─────────────────┘
                                    │
                                    │ 1:N
                                    ▼
                        ┌──────────────────────┐
                        │   Attendance        │
                        ├──────────────────────┤
                        │ id (PK)              │
                        │ employeeId (FK)      │
                        │ checkInTime          │
                        │ checkOutTime         │
                        │ status               │
                        │ date                 │
                        │ createdAt            │
                        └──────────────────────┘

┌──────────────┐         ┌─────────────────┐
│ Department   │─────────│   Employee      │
├──────────────┤ 1:N     ├─────────────────┤
│ id (PK)      │         │ id (PK)         │
│ name         │         │ departmentId(FK)│
│ description  │         └─────────────────┘
│ code         │
│ isActive     │
│ createdAt    │
│ updatedAt    │
└──────────────┘
```

### Table Design Example

```sql
-- Users Table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT DEFAULT 0,
    UNIQUE(email)
);

CREATE INDEX idx_users_email ON users(email);

-- Roles Table
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees Table
CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(11),
    position VARCHAR(100) NOT NULL,
    department_id BIGINT NOT NULL,
    user_id BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT DEFAULT 0,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(email)
);

CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);

-- Departments Table
CREATE TABLE departments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    version BIGINT DEFAULT 0
);

-- Attendance Table
CREATE TABLE attendances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PENDING',
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE(employee_id, date)
);

CREATE INDEX idx_attendance_employee_id ON attendances(employee_id);
CREATE INDEX idx_attendance_date ON attendances(date);
```

### Database Naming Convention
```
✅ Table names: lowercase, plural (employees, departments, attendances)
✅ Column names: lowercase, snake_case (first_name, department_id)
✅ PK: id (BIGSERIAL)
✅ FK: [entity_name]_id
✅ Indexes: idx_[table]_[column1]_[column2]
✅ Timestamps: created_at, updated_at (NOT NULL, DEFAULT CURRENT_TIMESTAMP)
✅ Audit fields: created_by, updated_by, version (for optimistic locking)
✅ Boolean: is_active, is_deleted (DEFAULT FALSE/TRUE)
```

---

## 🚀 Infrastructure & Deployment

### Docker Setup

#### Backend Dockerfile
```dockerfile
# Dockerfile - Multi-stage build
FROM maven:3.9-eclipse-temurin-21 as builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### Frontend Dockerfile
```dockerfile
# Dockerfile - Multi-stage build
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build: ./apps/backend
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/ecotel_db
      - SPRING_DATASOURCE_USERNAME=postgres
      - SPRING_DATASOURCE_PASSWORD=password
      - SPRING_JPA_HIBERNATE_DDL_AUTO=validate
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis

  frontend:
    build: ./apps/frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://localhost:8080
    depends_on:
      - backend

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=ecotel_db
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Kubernetes Manifest
```yaml
# k8s/deployment.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: ecotel/backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_DATASOURCE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: LoadBalancer
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

---

## 🔮 Microservice Strategy

### Phân Chia Microservice (Future)
```
Current Monolith
├── Auth Service (độc lập)
├── Employee Service
├── Attendance Service
├── Department Service
├── Role Service
└── Report Service

Future Microservices Architecture
├── 🔐 Auth Service (Port: 8081)
│   └── Dependencies: None
│
├── 👥 Employee Service (Port: 8082)
│   └── Dependencies: Auth Service
│
├── 📝 Attendance Service (Port: 8083)
│   └── Dependencies: Auth, Employee Services
│
├── 🏢 Department Service (Port: 8084)
│   └── Dependencies: Auth Service
│
├── 📊 Report Service (Port: 8085)
│   └── Dependencies: Employee, Attendance Services
│
├── ⚙️ API Gateway (Port: 8080)
│   └── Routes requests to all services
│
└── 📨 Message Queue (RabbitMQ/Kafka)
    └── Service-to-service async communication
```

### Guidelines for Microservice Extraction

#### ✅ When to Extract a Service
1. Service has its own database
2. Service is independently deployable
3. Service communicates via API/Message Queue
4. Service has clear domain boundaries
5. Service can scale independently

#### ❌ Keep as Monolith
- Tightly coupled business logic
- Frequent database transactions across entities
- Complex distributed transactions required
- Shared state management

### Async Communication Pattern (Future)
```java
// Using Spring Cloud Bus / RabbitMQ
// Event produced by Employee Service
@Service
public class EmployeeEventPublisher {
    private final RabbitTemplate rabbitTemplate;

    public void publishEmployeeCreated(Employee employee) {
        EmployeeCreatedEvent event = new EmployeeCreatedEvent(employee);
        rabbitTemplate.convertAndSend("employee.events", "employee.created", event);
    }
}

// Event consumed by Attendance Service
@Service
public class AttendanceEventListener {
    @RabbitListener(queues = "attendance.queue")
    public void handleEmployeeCreated(EmployeeCreatedEvent event) {
        // Initialize attendance tracking for new employee
    }
}
```

---

## 🔄 Development Workflow

### Git Branching Strategy
```
main (Production - v1.0.0, v1.0.1, ...)
  ├── develop (Staging)
  │   ├── feature/employee-management (from develop)
  │   ├── feature/attendance-tracking (from develop)
  │   ├── bugfix/login-issue (from develop)
  │   └── hotfix/security-patch (from main)
```

### Branch Naming Convention
```
feature/[feature-name]        # New feature
bugfix/[bug-name]             # Bug fix
hotfix/[issue-name]           # Urgent production fix
refactor/[component-name]     # Code refactoring
docs/[document-name]          # Documentation
test/[test-name]              # Test improvements
```

### Commit Message Convention
```
[TYPE] [SCOPE]: [SUBJECT]

feat(employee): add employee list endpoint
fix(auth): fix JWT token expiration issue
refactor(common): extract mapper to service layer
docs(readme): update installation instructions
test(employee): add unit tests for employee service
chore(deps): upgrade Spring Boot to 4.0.6

Types: feat, fix, docs, style, refactor, test, chore, ci, perf
```

### Pull Request Checklist
- [ ] Code follows naming convention
- [ ] DTOs are used, no Entity exposed in API
- [ ] Exception handling with meaningful messages
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests for API endpoints
- [ ] No hardcoded values or secrets
- [ ] Database migrations included
- [ ] API documentation updated
- [ ] Frontend/Backend contract validated

### Development Environment Setup

#### Prerequisites
```bash
# Backend
- Java 21 JDK
- Maven 3.9+
- Docker & Docker Compose
- PostgreSQL 16 (optional, use Docker)

# Frontend
- Node.js 20+
- npm 10+
```

#### Local Setup
```bash
# Backend
cd apps/backend
mvn clean install
mvn spring-boot:run

# Frontend
cd apps/frontend
npm install
npm run dev

# Docker Compose (All in one)
docker-compose up -d
```

### Testing Strategy

#### Backend Testing
```
Unit Tests (>80% coverage)
├── Controller Layer Tests
├── Service Layer Tests
├── Repository Tests
└── Mapper Tests

Integration Tests
├── API Endpoint Tests (with @SpringBootTest)
├── Database Tests (with Testcontainers)
└── Security Tests

E2E Tests (Future)
└── API Contract Tests
```

#### Frontend Testing
```
Unit Tests
├── Component Tests (React Testing Library)
├── Hook Tests
└── Utility Function Tests

Integration Tests
├── Feature Flow Tests
└── API Integration Tests

E2E Tests (Future)
└── Cypress / Playwright Tests
```

---

## 📚 Documentation Standards

### API Documentation (Swagger/OpenAPI)
```java
@RestController
@RequestMapping("/api/v1/employees")
@Tag(name = "Employees", description = "Employee Management APIs")
public class EmployeeController {

    @GetMapping
    @Operation(summary = "Get all employees", description = "Retrieve paginated list of employees")
    @Parameters({
        @Parameter(name = "page", description = "Page number (0-indexed)", example = "0"),
        @Parameter(name = "size", description = "Page size", example = "10")
    })
    public ResponseEntity<ApiResponse<PagedResponse<EmployeeResponseDto>>> listEmployees(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        // Implementation
    }
}
```

### Code Comments
```java
// ✅ GOOD: Explain WHY, not WHAT
// Lazy loading is used to avoid N+1 problem with departments
@EntityGraph(attributePaths = "department")
Optional<Employee> findByIdWithDepartment(Long id);

// ❌ BAD: Obvious comments
// Get employee by id
Optional<Employee> findById(Long id);
```

---

## 🎯 Summary & Key Points

| Layer | Responsibility | Key Classes |
|-------|---|---|
| **Controller** | HTTP handling, validation, response formatting | `@RestController` |
| **DTO** | Data Transfer Objects, NO entities exposed | `*ResponseDto`, `*RequestDto` |
| **Service** | Business logic, transactions, orchestration | `*Service`, `*ServiceImpl` |
| **Repository** | Data access, queries | `JpaRepository`, `@Query` |
| **Entity** | Database model (never in API) | `@Entity` |

### Never Violate These Rules ⛔
1. ❌ Expose Entity in API response
2. ❌ Mix business logic with controller logic
3. ❌ Hardcode API paths (use constants)
4. ❌ Skip validation on request DTOs
5. ❌ Use SELECT * in queries (specify columns)
6. ❌ Catch exceptions without proper handling
7. ❌ Skip database indexes for frequently queried columns

### Always Do ✅
1. ✅ Use DTOs for API contract
2. ✅ Version APIs (/api/v1, /api/v2)
3. ✅ Use consistent exception handling
4. ✅ Write meaningful exception messages
5. ✅ Use proper HTTP status codes
6. ✅ Implement pagination for list endpoints
7. ✅ Add audit fields (createdAt, updatedAt, createdBy)
8. ✅ Use optimistic locking for concurrency control

---

**Last Updated**: 2024-05-07  
**Version**: 1.0.0  
**Status**: In Progress - Framework Established
