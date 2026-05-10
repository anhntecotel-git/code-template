/**
 * Service: Tab Management
 * API Layer - Handles communication with backend
 * Flow: Hook → Service → Axios Client
 */

import { TabDTO, TabApiResponse, TabApiRequest, mapTabApiResponseToDTO, mapTabDTOToApiRequest } from '../types/tab.types';

// Mock axios - replace with real axios client
interface AxiosClient {
  get: <T>(url: string) => Promise<{ data: T }>;
  post: <T>(url: string, data: unknown) => Promise<{ data: T }>;
  put: <T>(url: string, data: unknown) => Promise<{ data: T }>;
  delete: <T>(url: string) => Promise<{ data: T }>;
}

// TODO: Replace with real axios instance
const axiosClient: AxiosClient = {
  get: async () => ({ data: {} }),
  post: async () => ({ data: {} }),
  put: async () => ({ data: {} }),
  delete: async () => ({ data: {} }),
};

/**
 * Tab API Service
 * Handles all tab-related API calls
 */
export const tabService = {
  /**
   * Fetch all tabs from server
   */
  fetchTabs: async (): Promise<TabDTO[]> => {
    try {
      const response = await axiosClient.get<TabApiResponse[]>('/api/tabs');
      return response.data.map(mapTabApiResponseToDTO);
    } catch (error) {
      console.error('Failed to fetch tabs:', error);
      return [];
    }
  },

  /**
   * Fetch single tab by ID
   */
  fetchTab: async (tabId: string): Promise<TabDTO | null> => {
    try {
      const response = await axiosClient.get<TabApiResponse>(`/api/tabs/${tabId}`);
      return mapTabApiResponseToDTO(response.data);
    } catch (error) {
      console.error(`Failed to fetch tab ${tabId}:`, error);
      return null;
    }
  },

  /**
   * Create new tab
   */
  createTab: async (tab: TabDTO): Promise<TabDTO | null> => {
    try {
      const request = mapTabDTOToApiRequest(tab);
      const response = await axiosClient.post<TabApiResponse>('/api/tabs', request);
      return mapTabApiResponseToDTO(response.data);
    } catch (error) {
      console.error('Failed to create tab:', error);
      return null;
    }
  },

  /**
   * Update tab
   */
  updateTab: async (tab: TabDTO): Promise<TabDTO | null> => {
    try {
      const request = mapTabDTOToApiRequest(tab);
      const response = await axiosClient.put<TabApiResponse>(`/api/tabs/${tab.id}`, request);
      return mapTabApiResponseToDTO(response.data);
    } catch (error) {
      console.error(`Failed to update tab ${tab.id}:`, error);
      return null;
    }
  },

  /**
   * Delete tab
   */
  deleteTab: async (tabId: string): Promise<boolean> => {
    try {
      await axiosClient.delete(`/api/tabs/${tabId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete tab ${tabId}:`, error);
      return false;
    }
  },

  /**
   * Reorder tabs
   */
  reorderTabs: async (tabIds: string[]): Promise<boolean> => {
    try {
      await axiosClient.put('/api/tabs/reorder', { tabIds });
      return true;
    } catch (error) {
      console.error('Failed to reorder tabs:', error);
      return false;
    }
  },

  /**
   * Save tab state
   */
  saveTabState: async (tabId: string, state: Record<string, unknown>): Promise<boolean> => {
    try {
      await axiosClient.put(`/api/tabs/${tabId}/state`, { state });
      return true;
    } catch (error) {
      console.error(`Failed to save tab state for ${tabId}:`, error);
      return false;
    }
  },
};

export default tabService;
