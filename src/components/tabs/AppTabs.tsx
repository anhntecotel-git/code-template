/**
 * Component: AppTabs
 * Main tab management component
 * Props: tabs, activeTabId, callbacks
 */

import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { TabDTO } from './types/tab.types';
import TabItem from './TabItem';
import TabActions from './TabActions';
import TabScroll from './TabScroll';
import TabContextMenu from './TabContextMenu';

interface AppTabsProps {
  tabs: TabDTO[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabsChange?: (tabs: TabDTO[]) => void;
  showActions?: boolean;
  maxTabs?: number;
  persistent?: boolean;
}

/**
 * AppTabs Component
 * - Manages tab state
 * - Handles tab lifecycle (add, remove, switch)
 * - Persists to localStorage
 * - Renders tab bar with scroll, actions, context menu
 */
const AppTabs: React.FC<AppTabsProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onTabsChange,
  showActions = true,
  maxTabs = 10,
  persistent = true,
}) => {
  const [localTabs, setLocalTabs] = useState<TabDTO[]>(tabs);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  // Sync with props tabs
  useEffect(() => {
    setLocalTabs(tabs);
  }, [tabs]);

  // Persist tabs to localStorage
  useEffect(() => {
    if (persistent) {
      localStorage.setItem('app_tabs', JSON.stringify(localTabs));
      localStorage.setItem('active_tab', activeTabId);
    }
  }, [localTabs, activeTabId, persistent]);

  // Handle tab click
  const handleTabClick = useCallback(
    (tabId: string): void => {
      onTabChange(tabId);
    },
    [onTabChange]
  );

  // Handle tab close
  const handleTabClose = useCallback(
    (tabId: string): void => {
      onTabClose(tabId);

      const newTabs = localTabs.filter((t) => t.id !== tabId);
      setLocalTabs(newTabs);
      onTabsChange?.(newTabs);

      // Switch to another tab if closed tab is active
      if (activeTabId === tabId && newTabs.length > 0) {
        onTabChange(newTabs[0].id);
      }
    },
    [localTabs, activeTabId, onTabClose, onTabsChange, onTabChange]
  );

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, tabId: string): void => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabId,
    });
  };

  // Close all tabs except pinned ones
  const handleCloseAll = useCallback((): void => {
    const remaining = localTabs.filter((t) => !t.closeable || t.closeable === false);
    setLocalTabs(remaining);
    onTabsChange?.(remaining);

    if (!remaining.find((t) => t.id === activeTabId)) {
      onTabChange(remaining[0]?.id || '');
    }
  }, [localTabs, activeTabId, onTabsChange, onTabChange]);

  // Close all other tabs except the specified one
  const handleCloseOthers = useCallback(
    (tabId: string): void => {
      const remaining = localTabs.filter(
        (t) => t.id === tabId || !t.closeable || t.closeable === false
      );
      setLocalTabs(remaining);
      onTabsChange?.(remaining);
      onTabChange(tabId);
    },
    [localTabs, onTabsChange, onTabChange]
  );

  // Close tabs to the right
  const handleCloseRight = useCallback(
    (tabId: string): void => {
      const index = localTabs.findIndex((t) => t.id === tabId);
      const remaining = localTabs.slice(0, index + 1);
      setLocalTabs(remaining);
      onTabsChange?.(remaining);
    },
    [localTabs, onTabsChange]
  );

  return (
    <div className="flex flex-col border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex-1 overflow-hidden">
          <TabScroll
            tabs={localTabs}
            activeTabId={activeTabId}
            onTabClick={handleTabClick}
            onTabClose={handleTabClose}
            onContextMenu={handleContextMenu}
          >
            {localTabs.map((tab) => (
              <TabItem
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onClick={() => handleTabClick(tab.id)}
                onClose={() => handleTabClose(tab.id)}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
              />
            ))}
          </TabScroll>
        </div>

        {showActions && (
          <TabActions
            onCloseAll={handleCloseAll}
            onCloseOthers={() => handleCloseOthers(activeTabId)}
          />
        )}
      </div>

      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabId={contextMenu.tabId}
          onClose={() => setContextMenu(null)}
          onCloseTab={() => {
            handleTabClose(contextMenu.tabId);
            setContextMenu(null);
          }}
          onCloseOthers={() => {
            handleCloseOthers(contextMenu.tabId);
            setContextMenu(null);
          }}
          onCloseRight={() => {
            handleCloseRight(contextMenu.tabId);
            setContextMenu(null);
          }}
        />
      )}
    </div>
  );
};

export type { AppTabsProps };
export default AppTabs;
