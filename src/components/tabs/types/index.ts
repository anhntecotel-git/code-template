/**
 * Types Index
 * Export all types, DTOs, and interfaces
 */

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
} from './tab.types';

export {
  DEFAULT_TAB_SCROLL_CONFIG,
  mapTabApiResponseToDTO,
  mapTabDTOToApiRequest,
} from './tab.types';
