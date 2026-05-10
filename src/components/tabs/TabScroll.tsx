/**
 * Component: TabScroll
 * Chỉ render UI, logic được tách vào hook
 * Flow: Hook (useTabScroll) chứa logic → Component render UI
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TabDTO } from './types/tab.types';
import { useTabScroll } from './hooks/useTabScroll';
import TabDropdown from './TabDropdown';

interface TabScrollProps {
  tabs: TabDTO[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onContextMenu?: (e: React.MouseEvent, tabId: string) => void;
  children: React.ReactNode;
}

/**
 * TabScroll Component
 * - Render scroll buttons
 * - Render tab dropdown cho hidden tabs
 * - Logic được handle bởi useTabScroll hook
 */
const TabScroll: React.FC<TabScrollProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  children,
}) => {
  const {
    scrollContainerRef,
    containerRef,
    scrollState,
    visibleTabsState,
    scroll,
  } = useTabScroll(tabs, activeTabId);

  return (
    <div className="flex items-center gap-1 px-1">
      {/* Scroll Left Button */}
      {scrollState.canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Scrollable Tab Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-hidden overflow-y-hidden flex gap-0"
        role="tablist"
        aria-label="Tab scroll container"
      >
        <div ref={containerRef} className="flex gap-0">
          {React.Children.map(children, (child, index) => {
            if (!React.isValidElement(child)) return null;

            const tabId = (child.props as Record<string, unknown>).tab?.id;

            return (
              <div key={`${tabId}-${index}`} data-tab-id={tabId}>
                {child}
              </div>
            );
          })}
        </div>
      </div>

      {/* Dropdown for Hidden Tabs */}
      <TabDropdown
        visibleTabs={visibleTabsState.visible}
        allTabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={onTabClick}
      />

      {/* Scroll Right Button */}
      {scrollState.canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Scroll tabs right"
        >
          <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
};

export default TabScroll;
