import axios, { AxiosError } from 'axios';
import {
  Contact,
  ContactsResponse,
  ContactFilters,
  DataUploadResponse,
  BroadcastRequest,
  BroadcastResponse,
  Campaign,
  CertificateRequest,
  CertificateResponse,
  CampaignAnalytics,
  CSVAnalysisResult,
  FilterOptionsResponse
} from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
    
    // Handle common error scenarios
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.warn('Unauthorized access detected');
    } else if (error.response?.status && error.response.status >= 500) {
      // Handle server errors
      console.error('Server error detected');
    }
    
    return Promise.reject(error);
  }
);

// API Service Class
export class ApiService {
  
  // Health Check
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get('/health');
    return response.data;
  }

  // File Upload and Analysis
  static async analyzeCSV(file: File): Promise<CSVAnalysisResult> {
    const formData = new FormData();
    formData.append('csv', file);
    
    const response = await api.post('/analyze-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload Progress: ${percentCompleted}%`);
        }
      },
    });
    
    return response.data;
  }

  // Process CSV with field mapping
  static async processCSV(tempFilePath: string, fieldMapping: Record<string, string>): Promise<DataUploadResponse> {
    const response = await api.post('/process-csv', {
      tempFilePath,
      fieldMapping
    });
    
    return response.data;
  }

  // Contact Management
  static async getContacts(filters?: ContactFilters): Promise<ContactsResponse> {
    const params = new URLSearchParams();
    
    if (filters?.role) params.append('role', filters.role);
    if (filters?.year) params.append('year', filters.year);
    if (filters?.branch) params.append('branch', filters.branch);
    if (filters?.search) params.append('search', filters.search);
    
    const response = await api.get(`/contacts?${params.toString()}`);
    return response.data;
  }

  static async getFilterOptions(): Promise<FilterOptionsResponse> {
    const response = await api.get('/filter-options');
    return response.data;
  }

  static async getContactById(id: string): Promise<Contact> {
    const response = await api.get(`/contacts/${id}`);
    return response.data;
  }

  static async updateContact(id: string, contact: Partial<Contact>): Promise<Contact> {
    const response = await api.put(`/contacts/${id}`, contact);
    return response.data;
  }

  static async deleteContact(id: string): Promise<void> {
    await api.delete(`/contacts/${id}`);
  }

  // Campaign Management
  static async startBroadcast(request: BroadcastRequest): Promise<BroadcastResponse> {
    const response = await api.post('/broadcast/start', request);
    return response.data;
  }

  static async getCampaignStatus(campaignId: string): Promise<Campaign> {
    const response = await api.get(`/broadcast/status/${campaignId}`);
    return response.data;
  }

  static async getAllCampaigns(): Promise<Campaign[]> {
    const response = await api.get('/campaigns');
    return response.data;
  }

  // WhatsApp Management
  static async getWhatsAppQR(): Promise<{ qrCode: string | null; status: string }> {
    const response = await api.get('/whatsapp/qr');
    return response.data;
  }

  static async getWhatsAppStatus(): Promise<{ status: string; authenticated: boolean }> {
    const response = await api.get('/whatsapp/status');
    return response.data;
  }

  static async pauseCampaign(campaignId: string): Promise<void> {
    await api.post(`/broadcast/pause/${campaignId}`);
  }

  static async resumeCampaign(campaignId: string): Promise<void> {
    await api.post(`/broadcast/resume/${campaignId}`);
  }

  static async cancelCampaign(campaignId: string): Promise<void> {
    await api.post(`/broadcast/cancel/${campaignId}`);
  }

  // Certificate Management
  static async generateCertificates(request: CertificateRequest): Promise<CertificateResponse> {
    const response = await api.post('/certificates/generate', request);
    return response.data;
  }

  static async getCertificateStatus(jobId: string): Promise<any> {
    const response = await api.get(`/certificates/status/${jobId}`);
    return response.data;
  }

  // Analytics
  static async getAnalytics(): Promise<CampaignAnalytics> {
    const response = await api.get('/analytics');
    return response.data;
  }

  static async getCampaignAnalytics(campaignId: string): Promise<any> {
    const response = await api.get(`/analytics/campaign/${campaignId}`);
    return response.data;
  }

  // Template Management
  static async getMessageTemplates(): Promise<any[]> {
    const response = await api.get('/templates');
    return response.data;
  }

  static async saveMessageTemplate(template: any): Promise<any> {
    const response = await api.post('/templates', template);
    return response.data;
  }

  static async updateMessageTemplate(id: string, template: any): Promise<any> {
    const response = await api.put(`/templates/${id}`, template);
    return response.data;
  }

  static async deleteMessageTemplate(id: string): Promise<void> {
    await api.delete(`/templates/${id}`);
  }

  // Utility Methods
  static async testMessage(message: string, contact: Contact): Promise<string> {
    const response = await api.post('/test-message', { message, contact });
    return response.data.preview;
  }

  static async validatePhoneNumbers(contacts: Contact[]): Promise<any> {
    const response = await api.post('/validate-phones', { contacts });
    return response.data;
  }

  static async exportData(format: 'csv' | 'json', filters?: ContactFilters): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters?.role) params.append('role', filters.role);
    if (filters?.year) params.append('year', filters.year);
    if (filters?.branch) params.append('branch', filters.branch);
    if (filters?.search) params.append('search', filters.search);
    
    const response = await api.get(`/export?${params.toString()}`, {
      responseType: 'blob',
    });
    
    return response.data;
  }
}

// Error Handler Utility
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) {
      return error.response.data.error;
    } else if (error.response?.data?.message) {
      return error.response.data.message;
    } else if (error.message) {
      return error.message;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

// Query Keys for React Query
export const queryKeys = {
  health: ['health'] as const,
  contacts: (filters?: ContactFilters) => ['contacts', filters] as const,
  contact: (id: string) => ['contact', id] as const,
  campaigns: ['campaigns'] as const,
  campaign: (id: string) => ['campaign', id] as const,
  analytics: ['analytics'] as const,
  templates: ['templates'] as const,
  certificateStatus: (jobId: string) => ['certificate-status', jobId] as const,
} as const;

export default ApiService; 