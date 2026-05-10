import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import TabItem from './TabItem';
import TabActions from './TabActions';
import TabScroll from './TabScroll';
import TabContextMenu from './TabContextMenu';

export interface Tab {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  closeable?: boolean;
  active?: boolean;
  componentKey?: string;
}

export interface AppTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabsChange?: (tabs: Tab[]) => void;
  showActions?: boolean;
  maxTabs?: number;
  persistent?: boolean;
}

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
  const [localTabs, setLocalTabs] = useState<Tab[]>(tabs);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
  } | null>(null);

  // Sync với props tabs
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

  const handleTabClick = useCallback(
    (tabId: string) => {
      onTabChange(tabId);
    },
    [onTabChange]
  );

  const handleTabClose = useCallback(
    (tabId: string) => {
      onTabClose(tabId);
      const newTabs = localTabs.filter((t) => t.id !== tabId);
      setLocalTabs(newTabs);
      onTabsChange?.(newTabs);

      // Nếu tab đóng là active, chuyển sang tab khác
      if (activeTabId === tabId && newTabs.length > 0) {
        onTabChange(newTabs[0].id);
      }
    },
    [localTabs, activeTabId, onTabClose, onTabsChange, onTabChange]
  );

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabId,
    });
  };

  const handleCloseAll = useCallback(() => {
    const remaining = localTabs.filter((t) => !t.closeable || t.closeable === false);
    setLocalTabs(remaining);
    onTabsChange?.(remaining);

    if (!remaining.find((t) => t.id === activeTabId)) {
      onTabChange(remaining[0]?.id || '');
    }
  }, [localTabs, activeTabId, onTabsChange, onTabChange]);

  const handleCloseOthers = useCallback(
    (tabId: string) => {
      const remaining = localTabs.filter(
        (t) => t.id === tabId || !t.closeable || t.closeable === false
      );
      setLocalTabs(remaining);
      onTabsChange?.(remaining);
      onTabChange(tabId);
    },
    [localTabs, onTabsChange, onTabChange]
  );

  const handleCloseRight = useCallback(
    (tabId: string) => {
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

export default AppTabs;
