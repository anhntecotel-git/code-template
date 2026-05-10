import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Tab } from './AppTabs';
import TabDropdown from './TabDropdown';

interface TabScrollProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onContextMenu?: (e: React.MouseEvent, tabId: string) => void;
  children: React.ReactNode;
}

const TabScroll: React.FC<TabScrollProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [visibleTabs, setVisibleTabs] = useState<Tab[]>(tabs);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
      updateVisibleTabs();
    });

    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [tabs]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', checkScroll);
    return () => scrollContainer.removeEventListener('scroll', checkScroll);
  }, []);

  // Scroll active tab into view
  useEffect(() => {
    const activeTabElement = scrollContainerRef.current?.querySelector(
      `[data-tab-id="${activeTabId}"]`
    );

    if (activeTabElement && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = activeTabElement as HTMLElement;

      const isInView =
        element.offsetLeft >= container.scrollLeft &&
        element.offsetLeft + element.offsetWidth <=
          container.scrollLeft + container.clientWidth;

      if (!isInView) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabId]);

  const updateVisibleTabs = () => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const tabElements = container.querySelectorAll('[data-tab-id]');
    const visible: Tab[] = [];

    tabElements.forEach((el) => {
      const isVisible =
        el.getBoundingClientRect().left >= container.getBoundingClientRect().left &&
        el.getBoundingClientRect().right <= container.getBoundingClientRect().right;

      if (isVisible) {
        const tabId = el.getAttribute('data-tab-id');
        const tab = tabs.find((t) => t.id === tabId);
        if (tab) visible.push(tab);
      }
    });

    setVisibleTabs(visible);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="flex items-center gap-1 px-1">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-hidden overflow-y-hidden flex gap-0"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div ref={containerRef} className="flex gap-0">
          {React.Children.map(children, (child) => (
            <div
              data-tab-id={
                React.isValidElement(child)
                  ? (child.props as any).tab?.id
                  : undefined
              }
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      <TabDropdown
        visibleTabs={visibleTabs}
        allTabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={onTabClick}
      />

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
};

export default TabScroll;
