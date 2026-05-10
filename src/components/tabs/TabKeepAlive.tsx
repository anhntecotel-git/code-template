/**
 * Hook & Provider: TabKeepAlive
 * Cache component state when switching between tabs
 * Pattern: Provider → Hook → Component
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Cached Component Structure
 */
interface CachedComponent {
  component: React.ReactNode;
  state: Record<string, unknown>;
}

/**
 * TabKeepAlive Context Type
 * Manages cache for component state
 */
interface TabKeepAliveContextType {
  cacheMap: Map<string, CachedComponent>;
  addComponent: (tabId: string, component: React.ReactNode, state?: Record<string, unknown>) => void;
  getComponent: (tabId: string) => React.ReactNode | null;
  saveState: (tabId: string, state: Record<string, unknown>) => void;
  getState: (tabId: string) => Record<string, unknown>;
  removeComponent: (tabId: string) => void;
  clearCache: () => void;
}

const TabKeepAliveContext = createContext<TabKeepAliveContextType | undefined>(undefined);

/**
 * Provider Component
 * Wraps app to provide tab cache context
 */
export const TabKeepAliveProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cacheMap, setCacheMap] = useState<Map<string, CachedComponent>>(new Map());

  const addComponent = useCallback(
    (tabId: string, component: React.ReactNode, state: Record<string, unknown> = {}): void => {
      setCacheMap((prev) => {
        const newMap = new Map(prev);
        newMap.set(tabId, { component, state });
        return newMap;
      });
    },
    []
  );

  const getComponent = useCallback((tabId: string): React.ReactNode | null => {
    return cacheMap.get(tabId)?.component || null;
  }, [cacheMap]);

  const saveState = useCallback((tabId: string, state: Record<string, unknown>): void => {
    setCacheMap((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(tabId);
      if (existing) {
        newMap.set(tabId, { ...existing, state });
      }
      return newMap;
    });
  }, []);

  const getState = useCallback((tabId: string): Record<string, unknown> => {
    return cacheMap.get(tabId)?.state || {};
  }, [cacheMap]);

  const removeComponent = useCallback((tabId: string): void => {
    setCacheMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(tabId);
      return newMap;
    });
  }, []);

  const clearCache = useCallback((): void => {
    setCacheMap(new Map());
  }, []);

  const value: TabKeepAliveContextType = {
    cacheMap,
    addComponent,
    getComponent,
    saveState,
    getState,
    removeComponent,
    clearCache,
  };

  return (
    <TabKeepAliveContext.Provider value={value}>
      {children}
    </TabKeepAliveContext.Provider>
  );
};

/**
 * Hook: useTabKeepAlive
 * Access cache from context
 * Must be used inside TabKeepAliveProvider
 */
export const useTabKeepAlive = (): TabKeepAliveContextType => {
  const context = useContext(TabKeepAliveContext);
  if (!context) {
    throw new Error('useTabKeepAlive must be used within TabKeepAliveProvider');
  }
  return context;
};

/**
 * Component: TabKeepAlive
 * Wrapper to cache child component state
 * 
 * @example
 * <TabKeepAlive tabId="tab-1">
 *   <MyExpensiveComponent />
 * </TabKeepAlive>
 */
interface TabKeepAliveProps {
  tabId: string;
  children: React.ReactNode;
}

export const TabKeepAlive: React.FC<TabKeepAliveProps> = ({ tabId, children }) => {
  const { addComponent, getComponent } = useTabKeepAlive();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    addComponent(tabId, children);
    setMounted(true);
  }, [tabId, children, addComponent]);

  if (!mounted) {
    return null;
  }

  return <>{getComponent(tabId) || children}</>;
};

export default TabKeepAlive;
