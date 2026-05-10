/**
 * Hook: useTabScroll
 * Quản lý logic scroll tabs
 * Flow: Hook chứa logic, component chỉ render UI
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { TabDTO, ScrollState, VisibleTabsState, DEFAULT_TAB_SCROLL_CONFIG } from '../types/tab.types';

interface UseTabScrollReturn {
  // Refs
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;

  // States
  scrollState: ScrollState;
  visibleTabsState: VisibleTabsState;

  // Methods
  scroll: (direction: 'left' | 'right') => void;
  checkScrollState: () => void;
  updateVisibleTabs: (tabs: TabDTO[]) => void;
  scrollIntoView: (tabId: string) => void;
}

export const useTabScroll = (
  tabs: TabDTO[],
  activeTabId: string,
  scrollAmount: number = DEFAULT_TAB_SCROLL_CONFIG.scrollAmount
): UseTabScrollReturn => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scrollState, setScrollState] = useState<ScrollState>({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const [visibleTabsState, setVisibleTabsState] = useState<VisibleTabsState>({
    visible: tabs,
    hidden: [],
  });

  // Check scroll position
  const checkScrollState = useCallback((): void => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    const threshold = DEFAULT_TAB_SCROLL_CONFIG.autoScrollThreshold;

    setScrollState({
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - threshold,
    });
  }, []);

  // Update visible tabs based on DOM
  const updateVisibleTabs = useCallback((allTabs: TabDTO[]): void => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const tabElements = container.querySelectorAll('[data-tab-id]');
    const visibleTabs: TabDTO[] = [];

    tabElements.forEach((el) => {
      const elementRect = el.getBoundingClientRect();
      const isVisible =
        elementRect.left >= containerRect.left &&
        elementRect.right <= containerRect.right;

      if (isVisible) {
        const tabId = el.getAttribute('data-tab-id');
        if (tabId) {
          const tab = allTabs.find((t) => t.id === tabId);
          if (tab) {
            visibleTabs.push(tab);
          }
        }
      }
    });

    const hiddenTabs = allTabs.filter(
      (tab) => !visibleTabs.find((vt) => vt.id === tab.id)
    );

    setVisibleTabsState({
      visible: visibleTabs,
      hidden: hiddenTabs,
    });
  }, []);

  // Scroll container
  const scroll = useCallback((direction: 'left' | 'right'): void => {
    if (!scrollContainerRef.current) return;

    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, [scrollAmount]);

  // Scroll active tab into view
  const scrollIntoView = useCallback((tabId: string): void => {
    if (!scrollContainerRef.current) return;

    const activeTabElement = scrollContainerRef.current.querySelector(
      `[data-tab-id="${tabId}"]`
    );

    if (!activeTabElement || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const element = activeTabElement as HTMLElement;

    const isInView =
      element.offsetLeft >= container.scrollLeft &&
      element.offsetLeft + element.offsetWidth <=
        container.scrollLeft + container.clientWidth;

    if (!isInView) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, []);

  // Initialize: Check scroll on mount and when tabs change
  useEffect(() => {
    checkScrollState();
    updateVisibleTabs(tabs);

    const resizeObserver = new ResizeObserver(() => {
      checkScrollState();
      updateVisibleTabs(tabs);
    });

    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [tabs, checkScrollState, updateVisibleTabs]);

  // Listen to scroll event
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      checkScrollState();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkScrollState]);

  // Auto-scroll active tab into view
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollIntoView(activeTabId);
    }, 100); // Delay để DOM render xong

    return () => clearTimeout(timeoutId);
  }, [activeTabId, scrollIntoView]);

  return {
    scrollContainerRef,
    containerRef,
    scrollState,
    visibleTabsState,
    scroll,
    checkScrollState,
    updateVisibleTabs,
    scrollIntoView,
  };
};
