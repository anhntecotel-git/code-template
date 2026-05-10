/**
 * Hook: useTabManager
 * Tab Management Logic
 * Flow: Component → Hook → Service → API
 */

import { useState, useCallback, useEffect } from 'react';
import { TabDTO } from '../types/tab.types';
import { tabService } from '../services/tab.service';

interface UseTabManagerReturn {
  // State
  tabs: TabDTO[];
  activeTabId: string;
  isLoading: boolean;
  error: string | null;

  // Methods
  setActiveTab: (tabId: string) => void;
  addTab: (tab: TabDTO) => Promise<void>;
  removeTab: (tabId: string) => Promise<void>;
  closeAllTabs: () => Promise<void>;
  closeOtherTabs: (tabId: string) => Promise<void>;
  updateTab: (tab: TabDTO) => Promise<void>;
  reorderTabs: (newOrder: TabDTO[]) => Promise<void>;
  loadTabs: () => Promise<void>;
}

/**
 * Custom Hook: useTabManager
 * Handles all tab management logic
 * - Load tabs from server
 * - Add/remove tabs
 * - Update active tab
 * - Persist state
 */
export const useTabManager = (initialTabs?: TabDTO[]): UseTabManagerReturn => {
  const [tabs, setTabs] = useState<TabDTO[]>(initialTabs || []);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load tabs from server
  const loadTabs = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedTabs = await tabService.fetchTabs();
      setTabs(fetchedTabs);

      // Set first tab as active if no active tab
      if (fetchedTabs.length > 0 && !activeTabId) {
        setActiveTabId(fetchedTabs[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tabs';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeTabId]);

  // Set active tab
  const handleSetActiveTab = useCallback((tabId: string): void => {
    setActiveTabId(tabId);
  }, []);

  // Add new tab
  const addTab = useCallback(async (tab: TabDTO): Promise<void> => {
    try {
      const newTab = await tabService.createTab(tab);
      if (newTab) {
        setTabs((prev) => [...prev, newTab]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add tab';
      setError(message);
    }
  }, []);

  // Remove tab
  const removeTab = useCallback(
    async (tabId: string): Promise<void> => {
      try {
        const success = await tabService.deleteTab(tabId);
        if (success) {
          setTabs((prev) => prev.filter((t) => t.id !== tabId));

          // Switch to another tab if removed tab was active
          if (activeTabId === tabId) {
            const remaining = tabs.filter((t) => t.id !== tabId);
            if (remaining.length > 0) {
              setActiveTabId(remaining[0].id);
            } else {
              setActiveTabId('');
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove tab';
        setError(message);
      }
    },
    [activeTabId, tabs]
  );

  // Close all tabs except pinned ones
  const closeAllTabs = useCallback(async (): Promise<void> => {
    try {
      const remaining = tabs.filter((t) => !t.closeable || t.closeable === false);

      // Delete closeable tabs
      const closeableTabs = tabs.filter((t) => t.closeable !== false);
      await Promise.all(closeableTabs.map((t) => tabService.deleteTab(t.id)));

      setTabs(remaining);

      // Update active tab
      if (!remaining.find((t) => t.id === activeTabId)) {
        setActiveTabId(remaining[0]?.id || '');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close all tabs';
      setError(message);
    }
  }, [tabs, activeTabId]);

  // Close other tabs
  const closeOtherTabs = useCallback(
    async (tabId: string): Promise<void> => {
      try {
        const remaining = tabs.filter(
          (t) => t.id === tabId || !t.closeable || t.closeable === false
        );

        // Delete other closeable tabs
        const toDelete = tabs.filter(
          (t) => t.id !== tabId && t.closeable !== false
        );
        await Promise.all(toDelete.map((t) => tabService.deleteTab(t.id)));

        setTabs(remaining);
        setActiveTabId(tabId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to close other tabs';
        setError(message);
      }
    },
    [tabs]
  );

  // Update tab
  const updateTab = useCallback(async (tab: TabDTO): Promise<void> => {
    try {
      const updated = await tabService.updateTab(tab);
      if (updated) {
        setTabs((prev) => prev.map((t) => (t.id === tab.id ? updated : t)));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update tab';
      setError(message);
    }
  }, []);

  // Reorder tabs
  const reorderTabs = useCallback(async (newOrder: TabDTO[]): Promise<void> => {
    try {
      const success = await tabService.reorderTabs(newOrder.map((t) => t.id));
      if (success) {
        setTabs(newOrder);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder tabs';
      setError(message);
    }
  }, []);

  // Initialize: Load tabs from localStorage or server on mount
  useEffect(() => {
    const savedTabs = localStorage.getItem('app_tabs');
    const savedActiveTab = localStorage.getItem('active_tab');

    if (savedTabs) {
      try {
        setTabs(JSON.parse(savedTabs));
        setActiveTabId(savedActiveTab || '');
      } catch {
        // If localStorage is corrupted, load from server
        loadTabs();
      }
    } else {
      loadTabs();
    }
  }, []);

  // Persist to localStorage when tabs change
  useEffect(() => {
    localStorage.setItem('app_tabs', JSON.stringify(tabs));
    localStorage.setItem('active_tab', activeTabId);
  }, [tabs, activeTabId]);

  return {
    tabs,
    activeTabId,
    isLoading,
    error,
    setActiveTab: handleSetActiveTab,
    addTab,
    removeTab,
    closeAllTabs,
    closeOtherTabs,
    updateTab,
    reorderTabs,
    loadTabs,
  };
};

export default useTabManager;
