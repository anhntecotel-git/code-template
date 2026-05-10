# Tab System - Refactored (Best Practices)

## 🏗️ Architecture

Tuân theo nguyên tắc: **Page → Component → Hook → Service → API**

```
Page/Layout
    ↓
Component (AppTabs, TabScroll, TabItem, etc.)
    ↓
Hook (useTabManager, useTabScroll)
    ↓
Service (tabService - API layer)
    ↓
Axios Client (axiosClient)
```

## ✅ Nguyên Tắc Refactoring

### 1. **Flow Rõ Ràng: Page → Component → Hook → API Service**

- ✅ **Page/Layout**: Định nghĩa state, gọi hook
- ✅ **Component**: Chỉ render UI, nhận props từ hook
- ✅ **Hook**: Chứa logic, gọi service
- ✅ **Service**: Xử lý API, mapping DTO
- ✅ **axiosClient**: Client HTTP, không logic

```
❌ KHÔNG LÀM:
const MyComponent = () => {
  // ❌ Gọi API trực tiếp
  useEffect(() => {
    axios.get('/api/tabs');
  }, []);
};

✅ LÀM ĐÚNG:
// 1. Hook chứa logic
const useTabManager = () => {
  useEffect(() => {
    tabService.fetchTabs();
  }, []);
};

// 2. Service gọi axios
const tabService = {
  fetchTabs: () => axiosClient.get('/api/tabs')
};

// 3. Component dùng hook
const MyComponent = () => {
  const { tabs } = useTabManager();
  return <div>{tabs}</div>;
};
```

### 2. **Không Gọi API Trực Tiếp Trong Component**

```
✅ ĐÚNG:
// Gọi service thông qua hook
const { tabs } = useTabManager();

❌ SAI:
// Gọi API trực tiếp
useEffect(() => {
  fetch('/api/tabs');
}, []);
```

### 3. **Hook Chứa Logic, Component Chỉ Render UI**

```
✅ ĐÚNG:
// Hook: Chứa logic
export const useTabManager = () => {
  const [tabs, setTabs] = useState([]);
  
  const loadTabs = async () => {
    const data = await tabService.fetchTabs();
    setTabs(data);
  };

  return { tabs, loadTabs };
};

// Component: Chỉ render
const MyComponent = () => {
  const { tabs } = useTabManager();
  return <div>{tabs.map(t => <Tab key={t.id} tab={t} />)}</div>;
};
```

### 4. **DTO FE Phải Match Với DTO BE**

```
// types/tab.types.ts

// DTO từ BE
export interface TabApiResponse {
  id: string;
  title: string;      // ← BE gọi là 'title'
  url: string;        // ← BE gọi là 'url'
  isPinned?: boolean; // ← BE gọi là 'isPinned'
}

// DTO FE
export interface TabDTO {
  id: string;
  label: string;      // ← FE gọi là 'label'
  path: string;       // ← FE gọi là 'path'
  closeable?: boolean;
}

// Mapper: Convert BE → FE
export const mapTabApiResponseToDTO = (api: TabApiResponse): TabDTO => ({
  id: api.id,
  label: api.title,      // Mapping title → label
  path: api.url,         // Mapping url → path
  closeable: !api.isPinned,
});

// Mapper: Convert FE → BE
export const mapTabDTOToApiRequest = (dto: TabDTO): TabApiRequest => ({
  id: dto.id,
  title: dto.label,      // Mapping label → title
  url: dto.path,         // Mapping path → url
  isPinned: dto.closeable === false,
});
```

### 5. **Không Dùng 'any' Type**

```
❌ SAI:
interface TabScrollProps {
  tabs: any[];
  onTabClick: (e: any) => void;
}

✅ ĐÚNG:
interface TabScrollProps {
  tabs: TabDTO[];
  onTabClick: (tabId: string) => void;
}

// Hoặc trích xuất props từ children an toàn:
const tabId = (child.props as Record<string, unknown>).tab?.id;
// Thay vì: (child.props as any).tab?.id
```

## 📁 Cấu Trúc File

```
tabs/
├── AppTabs.tsx              # Main component
├── TabItem.tsx              # Single tab
├── TabDropdown.tsx          # Hidden tabs dropdown
├── TabScroll.tsx            # Scroll container (UI only)
├── TabActions.tsx           # Actions menu
├── TabKeepAlive.tsx         # State cache provider
├── TabBreadcrumb.tsx        # Breadcrumb navigation
├── TabContextMenu.tsx       # Right-click menu
│
├── types/
│   └── tab.types.ts         # DTO & Interfaces (match BE)
│
├── services/
│   └── tab.service.ts       # API Service layer
│
├── hooks/
│   ├── useTabScroll.ts      # Scroll logic (useTabScroll)
│   ├── useTabManager.ts     # Tab management (useTabManager)
│   └── useTabKeepAlive.ts   # Custom hook chứa logic
│
├── index.ts                 # Exports
└── README.md                # Documentation
```

## 🚀 Cách Sử Dụng

### 1. Setup Provider

```tsx
// main.tsx hoặc App.tsx
import { TabKeepAliveProvider } from '@/components/tabs';

function App() {
  return (
    <TabKeepAliveProvider>
      <MyLayout />
    </TabKeepAliveProvider>
  );
}
```

### 2. Page/Layout Component

```tsx
// pages/AppLayout.tsx
import { AppTabs, useTabManager } from '@/components/tabs';
import { useState } from 'react';

export const AppLayout = () => {
  // Hook chứa logic
  const {
    tabs,
    activeTabId,
    isLoading,
    setActiveTab,
    removeTab,
    loadTabs,
  } = useTabManager();

  return (
    <div>
      {/* Component chỉ render UI */}
      <AppTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTab}
        onTabClose={removeTab}
        persistent={true}
      />
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Render content dựa trên activeTabId */}
      </div>
    </div>
  );
};
```

### 3. API Service (Backend Integration)

```ts
// services/tab.service.ts
import { TabDTO, TabApiResponse, mapTabApiResponseToDTO } from '../types/tab.types';
import { axiosClient } from '@/common/config/api.config';

export const tabService = {
  fetchTabs: async (): Promise<TabDTO[]> => {
    const response = await axiosClient.get<TabApiResponse[]>('/api/tabs');
    return response.data.map(mapTabApiResponseToDTO);
  },

  createTab: async (tab: TabDTO): Promise<TabDTO | null> => {
    const request = mapTabDTOToApiRequest(tab);
    const response = await axiosClient.post<TabApiResponse>('/api/tabs', request);
    return mapTabApiResponseToDTO(response.data);
  },

  // ... other methods
};
```

### 4. Advanced: Custom Hook với Logic

```tsx
// Nếu cần logic phức tạp
export const useTabWithCache = () => {
  const { tabs, ...rest } = useTabManager();
  const { cacheMap, saveState, getState } = useTabKeepAlive();

  const updateTabAndCache = useCallback(async (tab: TabDTO) => {
    await tabService.updateTab(tab);
    saveState(tab.id, { lastUpdated: Date.now() });
  }, []);

  return {
    tabs,
    ...rest,
    updateTabAndCache,
  };
};

// Component dùng hook
const MyPage = () => {
  const { tabs, updateTabAndCache } = useTabWithCache();
  // ...
};
```

## 📊 Type Safety

### Mappers & Converters

```ts
// Convert API Response → DTO
const mapTabApiResponseToDTO = (api: TabApiResponse): TabDTO => ({
  id: api.id,
  label: api.title,
  path: api.url,
  closeable: !api.isPinned,
});

// Convert DTO → API Request
const mapTabDTOToApiRequest = (dto: TabDTO): TabApiRequest => ({
  id: dto.id,
  title: dto.label,
  url: dto.path,
  isPinned: dto.closeable === false,
});
```

## 🔄 Data Flow Example

```
User clicks tab
    ↓
TabItem.onClick → onTabClick callback
    ↓
AppTabs receives onTabChange(tabId)
    ↓
Component calls setActiveTab(tabId) from useTabManager
    ↓
Hook updates state & calls tabService.updateTab()
    ↓
Service calls axiosClient.put('/api/tabs/{id}')
    ↓
Backend updates & returns TabApiResponse
    ↓
Service maps to TabDTO via mapTabApiResponseToDTO()
    ↓
Hook updates state
    ↓
Component re-renders with new activeTabId
```

## ✅ Checklist

- ✅ Tất cả components nhận TabDTO không phải any
- ✅ Không có `axios.get/post/put/delete` trong component
- ✅ Logic nằm trong hook, component chỉ render
- ✅ Service xử lý DTO mapping
- ✅ DTO FE match với DTO BE thông qua mappers
- ✅ Không dùng `any` type
- ✅ Tất cả callbacks được type-safe

## 🐛 Troubleshooting

### "tabService is undefined"
→ Kiểm tra import: `import { tabService } from '../services/tab.service'`

### "Cannot read property 'map' of undefined"
→ Đảm bảo TabDTO được convert từ API response đúng cách

### Type error: "Type 'any' is not assignable"
→ Thay thế `any` bằng proper type từ `tab.types.ts`

## 📚 Resources

- [React Hooks Best Practices](https://react.dev/reference/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [API Design Pattern](https://restfulapi.net/)

---

**Author**: Frontend Specialist  
**Date**: May 2026  
**Status**: Production Ready ✅
