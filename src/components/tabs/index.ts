/**
 * Tab System - Main Export
 * 
 * Flow: Page → Component → Hook → Types/DTO
 * 
 * All components follow best practices:
 * - Type-safe with full DTO matching
 * - No 'any' types
 * - Logic in hooks, UI in components
 * - Proper separation of concerns
 */

// ============ Components ============
export { default as AppTabs } from './AppTabs';
export type { AppTabsProps } from './AppTabs';

export { default as TabItem } from './TabItem';

export { default as TabDropdown } from './TabDropdown';

export { default as TabScroll } from './TabScroll';

export { default as TabActions } from './TabActions';

export {
  default as TabKeepAlive,
  TabKeepAliveProvider,
  useTabKeepAlive,
} from './TabKeepAlive';

export { default as TabBreadcrumb, useTabBreadcrumb } from './TabBreadcrumb';
export type { BreadcrumbItem } from './TabBreadcrumb';

export { default as TabContextMenu } from './TabContextMenu';

// ============ Types & DTOs ============
export type {
  TabDTO,
  TabApiResponse,
  TabApiRequest,
  ScrollState,
  VisibleTabsState,
  ContextMenuPosition,
  TabScrollConfig,
  TabItemRenderProps,
  TabDropdownProps,
} from './types/tab.types';

export {
  DEFAULT_TAB_SCROLL_CONFIG,
  mapTabApiResponseToDTO,
  mapTabDTOToApiRequest,
} from './types/tab.types';

// ============ Hooks ============
export { useTabScroll } from './hooks/useTabScroll';
export { useTabManager } from './hooks/useTabManager';

// ============ Services ============
export { tabService } from './services/tab.service';
