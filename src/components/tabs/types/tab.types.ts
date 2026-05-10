/**
 * Tab System DTOs & Types
 * Định nghĩa DTOs match với Backend
 */

// DTO: Tab từ API hoặc local state
export interface TabDTO {
  id: string;
  label: string;
  path: string;
  icon?: React.ReactNode;
  closeable?: boolean;
  active?: boolean;
  componentKey?: string;
}

// DTO: Tab Response từ API (nếu lấy từ server)
export interface TabApiResponse {
  id: string;
  title: string;
  url: string;
  iconUrl?: string;
  isPinned?: boolean;
  metadata?: Record<string, unknown>;
}

// DTO: Tab Request gửi lên server
export interface TabApiRequest {
  id: string;
  title: string;
  url: string;
  isPinned?: boolean;
}

// Scroll State
export interface ScrollState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

// Visible Tabs State
export interface VisibleTabsState {
  visible: TabDTO[];
  hidden: TabDTO[];
}

// Context Menu Position
export interface ContextMenuPosition {
  x: number;
  y: number;
}

// Tab Scroll Configuration
export interface TabScrollConfig {
  scrollAmount: number;
  autoScrollThreshold: number;
}

// Tab Item Props (for rendering)
export interface TabItemRenderProps {
  tab: TabDTO;
  isActive: boolean;
  isVisible: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

// Tab Dropdown Props
export interface TabDropdownProps {
  visibleTabs: TabDTO[];
  allTabs: TabDTO[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
}

// Default Config
export const DEFAULT_TAB_SCROLL_CONFIG: TabScrollConfig = {
  scrollAmount: 200,
  autoScrollThreshold: 10,
};

// Mapper: Convert API Response to DTO
export const mapTabApiResponseToDTO = (apiResponse: TabApiResponse): TabDTO => ({
  id: apiResponse.id,
  label: apiResponse.title,
  path: apiResponse.url,
  closeable: !apiResponse.isPinned,
  componentKey: apiResponse.id,
});

// Mapper: Convert DTO to API Request
export const mapTabDTOToApiRequest = (dto: TabDTO): TabApiRequest => ({
  id: dto.id,
  title: dto.label,
  url: dto.path,
  isPinned: dto.closeable === false,
});
