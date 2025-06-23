import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { Contact, Campaign, CampaignFilters, FileUploadState } from '../types';

// App Store Interface
interface AppStore {
  // UI State
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
  
  // Data State
  contacts: Contact[];
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  
  // Filters and Search
  contactFilters: CampaignFilters;
  searchTerm: string;
  
  // Upload State
  uploadState: FileUploadState;
  
  // WebSocket State
  websocketConnected: boolean;
  
  // Actions
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  clearErrors: () => void;
  
  // Contact Actions
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (index: number, contact: Partial<Contact>) => void;
  removeContact: (index: number) => void;
  clearContacts: () => void;
  
  // Campaign Actions
  setCampaigns: (campaigns: Campaign[]) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  
  // Filter Actions
  setContactFilters: (filters: Partial<CampaignFilters>) => void;
  clearContactFilters: () => void;
  setSearchTerm: (term: string) => void;
  
  // Upload Actions
  setUploadState: (state: Partial<FileUploadState>) => void;
  resetUploadState: () => void;
  
  // WebSocket Actions
  setWebsocketConnected: (connected: boolean) => void;
  
  // Computed Values
  getFilteredContacts: () => Contact[];
  getCampaignById: (id: string) => Campaign | undefined;
  getActiveCampaigns: () => Campaign[];
  getContactsBreakdown: () => {
    roles: Record<string, number>;
    years: Record<string, number>;
    branches: Record<string, number>;
  };
}

// Create the store
export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      loading: {},
      errors: {},
      contacts: [],
      campaigns: [],
      currentCampaign: null,
      contactFilters: {},
      searchTerm: '',
      uploadState: {
        file: null,
        uploading: false,
        progress: 0,
        error: null,
      },
      websocketConnected: false,

      // UI Actions
      setLoading: (key: string, loading: boolean) =>
        set((state) => ({
          loading: { ...state.loading, [key]: loading },
        }), false, 'setLoading'),

      setError: (key: string, error: string | null) =>
        set((state) => ({
          errors: { ...state.errors, [key]: error },
        }), false, 'setError'),

      clearErrors: () =>
        set({ errors: {} }, false, 'clearErrors'),

      // Contact Actions
      setContacts: (contacts: Contact[]) =>
        set({ contacts }, false, 'setContacts'),

      addContact: (contact: Contact) =>
        set((state) => ({
          contacts: [...state.contacts, contact],
        }), false, 'addContact'),

      updateContact: (index: number, contact: Partial<Contact>) =>
        set((state) => ({
          contacts: state.contacts.map((c, i) =>
            i === index ? { ...c, ...contact } : c
          ),
        }), false, 'updateContact'),

      removeContact: (index: number) =>
        set((state) => ({
          contacts: state.contacts.filter((_, i) => i !== index),
        }), false, 'removeContact'),

      clearContacts: () =>
        set({ contacts: [] }, false, 'clearContacts'),

      // Campaign Actions
      setCampaigns: (campaigns: Campaign[]) =>
        set({ campaigns }, false, 'setCampaigns'),

      addCampaign: (campaign: Campaign) =>
        set((state) => ({
          campaigns: [campaign, ...state.campaigns],
        }), false, 'addCampaign'),

      updateCampaign: (campaignId: string, updates: Partial<Campaign>) =>
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === campaignId ? { ...c, ...updates } : c
          ),
          currentCampaign:
            state.currentCampaign?.id === campaignId
              ? { ...state.currentCampaign, ...updates }
              : state.currentCampaign,
        }), false, 'updateCampaign'),

      setCurrentCampaign: (campaign: Campaign | null) =>
        set({ currentCampaign: campaign }, false, 'setCurrentCampaign'),

      // Filter Actions
      setContactFilters: (filters: Partial<CampaignFilters>) =>
        set((state) => ({
          contactFilters: { ...state.contactFilters, ...filters },
        }), false, 'setContactFilters'),

      clearContactFilters: () =>
        set({ contactFilters: {}, searchTerm: '' }, false, 'clearContactFilters'),

      setSearchTerm: (term: string) =>
        set({ searchTerm: term }, false, 'setSearchTerm'),

      // Upload Actions
      setUploadState: (state: Partial<FileUploadState>) =>
        set((current) => ({
          uploadState: { ...current.uploadState, ...state },
        }), false, 'setUploadState'),

      resetUploadState: () =>
        set({
          uploadState: {
            file: null,
            uploading: false,
            progress: 0,
            error: null,
          },
        }, false, 'resetUploadState'),

      // WebSocket Actions
      setWebsocketConnected: (connected: boolean) =>
        set({ websocketConnected: connected }, false, 'setWebsocketConnected'),

      // Computed Values
      getFilteredContacts: () => {
        const { contacts, contactFilters, searchTerm } = get();
        let filtered = [...contacts];

        // Apply role filter
        if (contactFilters.roles && contactFilters.roles.length > 0) {
          filtered = filtered.filter((contact) =>
            contactFilters.roles!.some((role) =>
              contact.assignedRole?.toLowerCase().includes(role.toLowerCase())
            )
          );
        }

        // Apply year filter
        if (contactFilters.years && contactFilters.years.length > 0) {
          filtered = filtered.filter((contact) =>
            contactFilters.years!.includes(contact.year?.toString() || '')
          );
        }

        // Apply branch filter
        if (contactFilters.branches && contactFilters.branches.length > 0) {
          filtered = filtered.filter((contact) =>
            contactFilters.branches!.some((branch) =>
              contact.branch?.toLowerCase().includes(branch.toLowerCase())
            )
          );
        }

        // Apply search term
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (contact) =>
              contact.name?.toLowerCase().includes(searchLower) ||
              contact.email?.toLowerCase().includes(searchLower) ||
              contact.assignedRole?.toLowerCase().includes(searchLower) ||
              contact.branch?.toLowerCase().includes(searchLower)
          );
        }

        return filtered;
      },

      getCampaignById: (id: string) => {
        const { campaigns } = get();
        return campaigns.find((campaign) => campaign.id === id);
      },

      getActiveCampaigns: () => {
        const { campaigns } = get();
        return campaigns.filter(
          (campaign) => campaign.status === 'running' || campaign.status === 'queued'
        );
      },

      getContactsBreakdown: () => {
        const contacts = get().getFilteredContacts();
        
        const roles: Record<string, number> = {};
        const years: Record<string, number> = {};
        const branches: Record<string, number> = {};

        contacts.forEach((contact) => {
          // Role breakdown
          const role = contact.assignedRole || 'unknown';
          roles[role] = (roles[role] || 0) + 1;

          // Year breakdown
          const year = contact.year?.toString() || 'unknown';
          years[year] = (years[year] || 0) + 1;

          // Branch breakdown
          const branch = contact.branch || 'unknown';
          branches[branch] = (branches[branch] || 0) + 1;
        });

        return { roles, years, branches };
      },
    })),
    { name: 'broadcaster-store' }
  )
);

// Selectors for commonly used state
export const useContacts = () => useAppStore((state) => state.contacts);
export const useFilteredContacts = () => useAppStore((state) => state.getFilteredContacts());
export const useCampaigns = () => useAppStore((state) => state.campaigns);
export const useCurrentCampaign = () => useAppStore((state) => state.currentCampaign);
export const useContactFilters = () => useAppStore((state) => state.contactFilters);
export const useUploadState = () => useAppStore((state) => state.uploadState);
export const useLoading = (key: string) => useAppStore((state) => state.loading[key] || false);
export const useError = (key: string) => useAppStore((state) => state.errors[key] || null);

// Actions
export const useAppActions = () => {
  const store = useAppStore();
  return {
    setLoading: store.setLoading,
    setError: store.setError,
    clearErrors: store.clearErrors,
    setContacts: store.setContacts,
    addContact: store.addContact,
    updateContact: store.updateContact,
    removeContact: store.removeContact,
    clearContacts: store.clearContacts,
    setCampaigns: store.setCampaigns,
    addCampaign: store.addCampaign,
    updateCampaign: store.updateCampaign,
    setCurrentCampaign: store.setCurrentCampaign,
    setContactFilters: store.setContactFilters,
    clearContactFilters: store.clearContactFilters,
    setSearchTerm: store.setSearchTerm,
    setUploadState: store.setUploadState,
    resetUploadState: store.resetUploadState,
    setWebsocketConnected: store.setWebsocketConnected,
  };
};

export default useAppStore; 