# Tab System - Quick Reference Guide

## 🎯 Key Principles

```
Flow: Page → Component → Hook → Service → API
```

| Layer | Responsibility | Example |
|-------|-----------------|---------|
| **Page/Layout** | State management, UI composition | `ExampleAppLayout.tsx` |
| **Component** | Render UI only | `AppTabs.tsx`, `TabItem.tsx` |
| **Hook** | Business logic | `useTabManager`, `useTabScroll` |
| **Service** | API calls & data transformation | `tabService` |
| **axiosClient** | HTTP client | `@/common/config/api.config` |

## 📦 File Structure

```
tabs/
├── AppTabs.tsx              ← Main component (UI)
├── TabItem.tsx              ← Tab item component (UI)
├── TabScroll.tsx            ← Scroll logic component (UI)
├── TabActions.tsx           ← Actions menu (UI)
├── TabDropdown.tsx          ← Dropdown (UI)
├── TabKeepAlive.tsx         ← Cache provider (Context)
├── TabBreadcrumb.tsx        ← Breadcrumb (UI + Hook)
├── TabContextMenu.tsx       ← Context menu (UI)
│
├── types/
│   ├── tab.types.ts         ← DTOs, Interfaces
│   └── index.ts             ← Type exports
│
├── services/
│   ├── tab.service.ts       ← API layer
│   └── index.ts             ← Service exports
│
├── hooks/
│   ├── useTabScroll.ts      ← Scroll logic (Internal)
│   ├── useTabManager.ts     ← Tab management (External)
│   └── index.ts             ← Hook exports
│
├── examples/
│   └── ExampleUsage.tsx      ← Usage examples
│
├── index.ts                 ← Main exports
├── REFACTORING.md           ← Best practices
└── README.md                ← Full documentation
```

## 🔄 Data Flow

```
User Action (click tab)
    ↓
Component receives event
    ↓
Component calls callback (onTabChange)
    ↓
Hook handles logic (useTabManager)
    ↓
Hook calls service (tabService.updateTab)
    ↓
Service calls API (axiosClient.put)
    ↓
Response received
    ↓
Service maps to DTO (mapTabApiResponseToDTO)
    ↓
Hook updates state
    ↓
Component re-renders with new data
```

## ✅ Usage Checklist

### 1. Import Correctly

```tsx
// ✅ CORRECT
import {
  AppTabs,
  useTabManager,
  TabKeepAliveProvider,
  type TabDTO,
  tabService,
} from '@/components/tabs';

// ❌ INCORRECT
import { Tab } from './AppTabs';  // Don't import Tab, use TabDTO
```

### 2. Define Types

```tsx
// ✅ CORRECT
interface MyProps {
  tabs: TabDTO[];
  onSelect: (tabId: string) => void;
}

// ❌ INCORRECT
interface MyProps {
  tabs: any[];
  onSelect: (e: any) => void;
}
```

### 3. Use Hooks

```tsx
// ✅ CORRECT
const MyComponent = () => {
  const { tabs, activeTabId, setActiveTab } = useTabManager();
  return <AppTabs tabs={tabs} activeTabId={activeTabId} />;
};

// ❌ INCORRECT
const MyComponent = () => {
  useEffect(() => {
    fetch('/api/tabs');  // API call in component!
  }, []);
  return <div>{tabs}</div>;
};
```

### 4. Map DTOs

```tsx
// ✅ CORRECT
const response = await tabService.fetchTabs();
// response already mapped to TabDTO[]

// ❌ INCORRECT
const raw = await fetch('/api/tabs');
const data = raw.json();  // Forgot to map!
```

## 🚀 Common Patterns

### Pattern 1: Basic Setup

```tsx
import { AppTabs, TabKeepAliveProvider, useTabManager } from '@/components/tabs';

function App() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTabManager();

  return (
    <TabKeepAliveProvider>
      <AppTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTab}
        onTabClose={removeTab}
      />
    </TabKeepAliveProvider>
  );
}
```

### Pattern 2: With Breadcrumb

```tsx
import { TabBreadcrumb, useTabBreadcrumb } from '@/components/tabs';

function Layout() {
  const breadcrumbs = useTabBreadcrumb(location.pathname);

  return (
    <>
      <AppTabs {...tabProps} />
      <TabBreadcrumb items={breadcrumbs} />
    </>
  );
}
```

### Pattern 3: Custom Hook

```tsx
// Create custom hook for specific features
export const useTabWithFiltering = () => {
  const { tabs, ...rest } = useTabManager();
  const [filter, setFilter] = useState('');

  const filtered = tabs.filter(t => t.label.includes(filter));

  return { tabs: filtered, filter, setFilter, ...rest };
};

// Use in component
const MyComponent = () => {
  const { tabs, filter, setFilter } = useTabWithFiltering();
  return <></>;
};
```

### Pattern 4: Feature-Specific Logic

```tsx
// Each feature can have its own hook
const useEmployees = () => {
  const { tabs } = useTabManager();
  const employeeTab = tabs.find(t => t.id === 'employees');

  const loadEmployees = async () => {
    // Logic here
  };

  return { employeeTab, loadEmployees };
};
```

## 🔌 Integration with Backend

### Step 1: Define Backend DTOs

```ts
// From your API documentation
interface BackendTab {
  id: string;
  title: string;        // Backend uses 'title'
  url: string;          // Backend uses 'url'
  isPinned?: boolean;   // Backend uses 'isPinned'
}
```

### Step 2: Create Mappers

```ts
// types/tab.types.ts
export const mapTabApiResponseToDTO = (api: TabApiResponse): TabDTO => ({
  id: api.id,
  label: api.title,      // Map title → label
  path: api.url,         // Map url → path
  closeable: !api.isPinned,
});
```

### Step 3: Update Service

```ts
// services/tab.service.ts
export const tabService = {
  fetchTabs: async (): Promise<TabDTO[]> => {
    const response = await axiosClient.get<TabApiResponse[]>('/api/tabs');
    return response.data.map(mapTabApiResponseToDTO);
  },
};
```

### Step 4: Use in Hook

```ts
// hooks/useTabManager.ts
const loadTabs = async () => {
  const tabs = await tabService.fetchTabs();
  setTabs(tabs);  // Already mapped!
};
```

## 🐛 Common Mistakes

### ❌ Mistake 1: Using `any`

```tsx
// ❌ BAD
const handleClick = (e: any) => { };

// ✅ GOOD
const handleClick = (tabId: string) => { };
```

### ❌ Mistake 2: API Calls in Components

```tsx
// ❌ BAD
const Component = () => {
  useEffect(() => {
    fetch('/api/tabs');
  }, []);
};

// ✅ GOOD
const Component = () => {
  const { tabs } = useTabManager();
};
```

### ❌ Mistake 3: Forgetting Mappers

```tsx
// ❌ BAD
const response = await fetch('/api/tabs');
setTabs(response.json());  // Forgot to map!

// ✅ GOOD
const tabs = await tabService.fetchTabs();
setTabs(tabs);  // Already mapped!
```

### ❌ Mistake 4: Mixing UI and Logic

```tsx
// ❌ BAD
const Component = () => {
  const [tabs, setTabs] = useState([]);
  useEffect(() => {
    loadTabs();  // Logic in component!
  }, []);
  return <AppTabs tabs={tabs} />;
};

// ✅ GOOD
const Component = () => {
  const { tabs } = useTabManager();  // All logic in hook
  return <AppTabs tabs={tabs} />;
};
```

## 📞 Need Help?

- Check [REFACTORING.md](./REFACTORING.md) for detailed principles
- See [examples/ExampleUsage.tsx](./examples/ExampleUsage.tsx) for usage examples
- Review [README.md](./README.md) for full documentation

---

**Last Updated**: May 2026  
**Version**: 2.0 (Refactored)
