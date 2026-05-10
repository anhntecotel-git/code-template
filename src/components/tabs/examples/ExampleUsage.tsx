/**
 * Example: App Layout with Tab System
 * 
 * Demonstrates correct usage following best practices:
 * - Flow: Page → Component → Hook → Service → API
 * - No API calls in components
 * - Logic in hooks, UI in components
 * - Type-safe with DTOs
 * - No 'any' types
 */

import React, { Suspense } from 'react';
import {
  AppTabs,
  TabBreadcrumb,
  useTabBreadcrumb,
  useTabManager,
  TabKeepAliveProvider,
  TabKeepAlive,
  type TabDTO,
} from './index';

/**
 * Example Page Component
 * Uses hook to get tab logic, component renders UI only
 */
export const ExampleAppLayout: React.FC = () => {
  // ✅ Hook contains ALL logic
  const {
    tabs,
    activeTabId,
    isLoading,
    error,
    setActiveTab,
    addTab,
    removeTab,
    closeAllTabs,
    closeOtherTabs,
    updateTab,
  } = useTabManager();

  // Breadcrumb
  const breadcrumbs = useTabBreadcrumb(
    tabs.find((t) => t.id === activeTabId)?.path || '/'
  );

  if (isLoading) {
    return <div className="p-4">Loading tabs...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  // ✅ Component ONLY renders UI, all logic in hook
  return (
    <TabKeepAliveProvider>
      <div className="flex flex-col h-screen">
        {/* Tab Bar */}
        <AppTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={setActiveTab}
          onTabClose={removeTab}
          onTabsChange={(newTabs) => {
            // Optional: handle tabs reorder
          }}
          showActions={true}
          persistent={true}
        />

        {/* Breadcrumb */}
        <TabBreadcrumb items={breadcrumbs} showHome />

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <RenderTabContent tabId={activeTabId} />
        </div>
      </div>
    </TabKeepAliveProvider>
  );
};

/**
 * Render content based on active tab
 * ✅ Uses TabKeepAlive to cache component state
 */
const RenderTabContent: React.FC<{ tabId: string }> = ({ tabId }) => {
  return (
    <TabKeepAlive tabId={tabId}>
      <Suspense fallback={<div className="p-4">Loading...</div>}>
        <DynamicTabContent tabId={tabId} />
      </Suspense>
    </TabKeepAlive>
  );
};

/**
 * Dynamic content for each tab
 */
const DynamicTabContent: React.FC<{ tabId: string }> = ({ tabId }) => {
  switch (tabId) {
    case 'dashboard':
      return <DashboardPage />;
    case 'employees':
      return <EmployeesPage />;
    case 'reports':
      return <ReportsPage />;
    default:
      return <div className="p-4">Tab content not found</div>;
  }
};

/**
 * Example Feature Pages
 * Each page can use its own hooks for feature logic
 */

const DashboardPage: React.FC = () => {
  // ✅ Feature-specific hook (contains feature logic)
  // const { dashboardData } = useDashboard();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {/* Feature content */}
    </div>
  );
};

const EmployeesPage: React.FC = () => {
  // ✅ Feature-specific hook (contains feature logic)
  // const { employees, loading } = useEmployees();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Employees</h1>
      {/* Feature content */}
    </div>
  );
};

const ReportsPage: React.FC = () => {
  // ✅ Feature-specific hook (contains feature logic)
  // const { reports } = useReports();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      {/* Feature content */}
    </div>
  );
};

// ============================================================
// EXAMPLE: How to create custom hooks for different use cases
// ============================================================

/**
 * Custom Hook: useTabWithPersistence
 * Combines tab manager with custom persistence logic
 */
export const useTabWithPersistence = (storageKey: string = 'app_tabs') => {
  const tabManager = useTabManager();

  // Custom logic on top of tab manager
  const saveToCustomStorage = async (): Promise<void> => {
    const data = {
      tabs: tabManager.tabs,
      activeTabId: tabManager.activeTabId,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(storageKey, JSON.stringify(data));
  };

  return {
    ...tabManager,
    saveToCustomStorage,
  };
};

/**
 * Custom Hook: useTabFilter
 * Filter tabs based on criteria
 */
export const useTabFilter = () => {
  const { tabs, ...rest } = useTabManager();
  const [filter, setFilter] = React.useState<string>('');

  const filteredTabs = React.useMemo(() => {
    if (!filter) return tabs;
    return tabs.filter(
      (tab) =>
        tab.label.toLowerCase().includes(filter.toLowerCase()) ||
        tab.path.toLowerCase().includes(filter.toLowerCase())
    );
  }, [tabs, filter]);

  return {
    tabs: filteredTabs,
    allTabs: tabs,
    filter,
    setFilter,
    ...rest,
  };
};

/**
 * Component using custom hook
 */
export const FilteredTabsExample: React.FC = () => {
  const { allTabs, filteredTabs, filter, setFilter } = useTabFilter();

  return (
    <div>
      <input
        type="text"
        placeholder="Filter tabs..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="px-3 py-2 border rounded"
      />
      <div className="mt-4">
        {filteredTabs.map((tab) => (
          <div key={tab.id} className="p-2 border-b">
            {tab.label}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// EXAMPLE: Service Integration
// ============================================================

/**
 * Example: If you need to sync with server
 * This shows how to properly integrate API calls
 */

// ✅ Service layer (handles API calls)
// src/components/tabs/services/tab.service.ts
// export const tabService = {
//   fetchTabs: async (): Promise<TabDTO[]> => {
//     const response = await axiosClient.get<TabApiResponse[]>('/api/tabs');
//     return response.data.map(mapTabApiResponseToDTO);
//   },
//   // ... other methods
// };

// ✅ Hook layer (uses service)
// src/components/tabs/hooks/useTabManager.ts
// export const useTabManager = () => {
//   const loadTabs = useCallback(async () => {
//     const tabs = await tabService.fetchTabs();
//     setTabs(tabs);
//   }, []);
//   // ...
// };

// ✅ Component layer (uses hook)
// export const MyComponent = () => {
//   const { tabs } = useTabManager();
//   return <AppTabs tabs={tabs} />;
// };

export default ExampleAppLayout;
