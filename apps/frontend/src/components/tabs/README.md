# Tab System Components

Hệ thống Tab hoàn chỉnh cho ứng dụng React TypeScript. Hỗ trợ quản lý múi tab, cache state, breadcrumb, và context menu.

## 📁 Cấu trúc File

```
tabs/
├── AppTabs.tsx           # Component chính quản lý toàn bộ tab system
├── TabItem.tsx           # Component hiển thị từng tab item
├── TabDropdown.tsx       # Dropdown menu khi có quá nhiều tab
├── TabScroll.tsx         # Xử lý cuộn ngang khi tab vượt quá chiều rộng
├── TabActions.tsx        # Menu hành động (Close all, Close others)
├── TabKeepAlive.tsx      # Cache component state khi chuyển tab
├── TabBreadcrumb.tsx     # Breadcrumb navigation đồng bộ với tab
├── TabContextMenu.tsx    # Right-click context menu
└── index.ts              # Export tất cả components
```

## 🚀 Cách Sử Dụng

### 1. Basic Setup

```tsx
import { AppTabs, TabKeepAliveProvider } from '@/components/tabs';
import { useState } from 'react';

function App() {
  const [tabs, setTabs] = useState([
    {
      id: 'home',
      label: 'Home',
      path: '/',
      closeable: false, // Pin tab này
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
    },
  ]);

  const [activeTabId, setActiveTabId] = useState('home');

  return (
    <TabKeepAliveProvider>
      <AppTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onTabClose={(tabId) => {
          setTabs(tabs.filter(t => t.id !== tabId));
        }}
        onTabsChange={setTabs}
        showActions={true}
        persistent={true} // Lưu tabs vào localStorage
      />
      {/* Content */}
    </TabKeepAliveProvider>
  );
}
```

### 2. Với Icon

```tsx
import { Home, BarChart3, Settings } from 'lucide-react';

const tabs = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: <Home size={16} />,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <BarChart3 size={16} />,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: <Settings size={16} />,
  },
];
```

### 3. Với Cache State (TabKeepAlive)

```tsx
import { TabKeepAlive, useTabKeepAlive } from '@/components/tabs';

function Page() {
  return (
    <TabKeepAlive tabId={activeTabId}>
      <ExpensiveComponent />
    </TabKeepAlive>
  );
}

// Hoặc sử dụng hook để quản lý state
function MyComponent() {
  const { saveState, getState } = useTabKeepAlive();

  useEffect(() => {
    // Lưu state khi component unmount
    return () => {
      saveState(tabId, { data: componentData });
    };
  }, [tabId, componentData]);

  const cachedState = getState(tabId);
}
```

### 4. Với Breadcrumb

```tsx
import { TabBreadcrumb, useTabBreadcrumb } from '@/components/tabs';
import { useLocation, useNavigate } from 'react-router-dom';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const breadcrumbs = useTabBreadcrumb(location.pathname);

  return (
    <>
      <AppTabs {...tabProps} />
      <TabBreadcrumb
        items={breadcrumbs}
        onNavigate={(path) => navigate(path)}
        showHome={true}
      />
      {/* Content */}
    </>
  );
}
```

## 🎯 Props

### AppTabs

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `tabs` | `Tab[]` | - | Danh sách các tab |
| `activeTabId` | `string` | - | ID của tab đang active |
| `onTabChange` | `(tabId: string) => void` | - | Callback khi tab thay đổi |
| `onTabClose` | `(tabId: string) => void` | - | Callback khi tab được đóng |
| `onTabsChange` | `(tabs: Tab[]) => void` | - | Callback khi danh sách tab thay đổi |
| `showActions` | `boolean` | `true` | Hiển thị menu actions |
| `maxTabs` | `number` | `10` | Số lượng tab tối đa |
| `persistent` | `boolean` | `true` | Lưu tabs vào localStorage |

### Tab Interface

```typescript
interface Tab {
  id: string;           // ID duy nhất
  label: string;        // Tên hiển thị
  path: string;         // Đường dẫn route
  icon?: React.ReactNode; // Icon (optional)
  closeable?: boolean;  // Có thể đóng được không (default: true)
  active?: boolean;     // Active hay không (auto-managed)
  componentKey?: string; // Key cho React element (optional)
}
```

## 🎨 Features

### ✅ Các tính năng chính

- **Multi-tab Management**: Quản lý nhiều tab
- **Smart Scrolling**: Cuộn ngang khi tab vượt quá chiều rộng
- **Context Menu**: Right-click menu với các tùy chọn
- **State Caching**: Cache component state khi chuyển tab
- **Breadcrumb Sync**: Breadcrumb tự động cập nhật theo route
- **Persistent Storage**: Lưu tab state vào localStorage
- **Dark Mode**: Hỗ trợ theme sáng/tối
- **Dropdown Menu**: Hiển thị tab ẩn trong dropdown
- **Keyboard Support**: Hỗ trợ Escape để đóng context menu

### 📋 Context Menu Options

- **Reload**: Reload lại tab
- **Duplicate**: Tạo bản copy của tab
- **Close Tab**: Đóng tab
- **Close Others**: Đóng tất cả tab khác
- **Close Tabs to the Right**: Đóng tất cả tab bên phải

## 🔧 Tùy Chỉnh

### Styling

Components sử dụng Tailwind CSS. Bạn có thể tùy chỉnh bằng cách:

1. Thay đổi class trực tiếp trong component
2. Sử dụng CSS modules
3. Extend Tailwind config

### Ví dụ tùy chỉnh color

```tsx
// Thay đổi tab active color
className={`
  ...
  ${isActive ? 'border-green-500 bg-green-50 text-green-700' : '...'}
`}
```

## 🎓 Advanced Usage

### Custom Tab Handler

```tsx
const handleTabChange = (tabId: string) => {
  // Navigate to new route
  navigate(`/app/${tabId}`);
  // Update analytics
  trackTabChange(tabId);
  // Update app state
  setActiveTabId(tabId);
};
```

### State Persistence

```tsx
// Tabs được tự động lưu vào localStorage
// Khôi phục khi app reload:
useEffect(() => {
  const savedTabs = localStorage.getItem('app_tabs');
  const activeTab = localStorage.getItem('active_tab');
  
  if (savedTabs) {
    setTabs(JSON.parse(savedTabs));
    setActiveTabId(activeTab || '');
  }
}, []);
```

### Dynamic Tab Creation

```tsx
const addNewTab = (label: string, path: string) => {
  const newTab: Tab = {
    id: `tab-${Date.now()}`,
    label,
    path,
    icon: <FileText size={16} />,
  };
  
  setTabs([...tabs, newTab]);
  setActiveTabId(newTab.id);
};
```

## 📱 Responsive

- ✅ Desktop: Full tab display
- ✅ Tablet: Scroll + Dropdown menu
- ✅ Mobile: Dropdown menu với scroll

## 🐛 Troubleshooting

### Tabs không được lưu
- Kiểm tra `persistent={true}` trong AppTabs
- Kiểm tra localStorage không bị disable

### Context menu không hiển thị đúng
- Kiểm tra parent component có `position: relative` không
- Thử thay đổi boundary logic trong TabContextMenu.tsx

### State bị mất khi chuyển tab
- Wrap component trong `<TabKeepAlive>` hoặc `<TabKeepAliveProvider>`

## 📚 Export

```typescript
// Tất cả components
export {
  AppTabs,
  TabItem,
  TabDropdown,
  TabScroll,
  TabActions,
  TabKeepAlive,
  TabKeepAliveProvider,
  useTabKeepAlive,
  TabBreadcrumb,
  useTabBreadcrumb,
  TabContextMenu,
};
```

## 📦 Dependencies

- React 18+
- TypeScript
- Tailwind CSS
- lucide-react (icons)

---

**Tác giả**: Frontend Specialist  
**Ngày tạo**: 2026
