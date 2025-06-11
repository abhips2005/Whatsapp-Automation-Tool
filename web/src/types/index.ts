// Contact and Data Types
export interface Contact {
  name: string;
  email: string;
  type: string;
  phone?: string;
  assignedRole?: string;
  year?: number | string;
  branch?: string;
  github?: string;
  mentor?: string;
  project?: string;
  [key: string]: any; // Allow dynamic properties
}

export interface DataUploadResponse {
  success: boolean;
  data: Contact[];
  stats: {
    total: number;
    valid: number;
    filtered: number;
  };
  breakdown: {
    roles: Record<string, number>;
    years: Record<string, number>;
    branches: Record<string, number>;
  };
}

// Campaign Types
export interface Campaign {
  id: string;
  name: string;
  message: string;
  filters?: CampaignFilters;
  targets: Contact[];
  status: 'queued' | 'running' | 'completed' | 'failed' | 'paused';
  progress: {
    total: number;
    sent: number;
    failed: number;
    errors: string[];
  };
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface CampaignFilters {
  roles?: string[];
  years?: string[];
  branches?: string[];
  search?: string;
}

export interface BroadcastRequest {
  message: string;
  filters?: CampaignFilters;
  campaignName?: string;
}

export interface BroadcastResponse {
  success: boolean;
  campaignId: string;
  jobId: string | number;
  targets: number;
}

// WebSocket Event Types
export interface WebSocketEvents {
  'campaign-started': Campaign;
  'campaign-update': {
    campaignId: string;
    campaign: Campaign;
  };
  'campaign-progress': {
    campaignId: string;
    progress: Campaign['progress'];
    currentContact: string;
  };
  'campaign-completed': Campaign;
  'campaign-error': {
    campaignId: string;
    error: string;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export interface ContactsResponse {
  data: Contact[];
  total: number;
  breakdown: {
    roles: Record<string, number>;
    years: Record<string, number>;
    branches: Record<string, number>;
  };
}

// Filter and Search Types
export interface ContactFilters {
  role?: string;
  year?: string;
  branch?: string;
  search?: string;
}

export interface DynamicFilterOption {
  field: string;
  label: string;
  options: string[];
}

export interface FilterOptionsResponse {
  success: boolean;
  filters: DynamicFilterOption[];
  totalContacts?: number;
  message?: string;
}

export interface DynamicCampaignFilters {
  [fieldName: string]: string[];
}

// Certificate Types
export interface CertificateRequest {
  filters?: CampaignFilters;
}

export interface CertificateResponse {
  success: boolean;
  jobId: string | number;
  targets: number;
}

// Analytics Types
export interface CampaignAnalytics {
  totalCampaigns: number;
  totalMessagesSent: number;
  averageSuccessRate: number;
  recentCampaigns: Campaign[];
  messagesByRole: Record<string, number>;
  messagesByBranch: Record<string, number>;
  campaignsByStatus: Record<string, number>;
}

// UI State Types
export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}

// Upload Types
export interface FileUploadState {
  file: File | null;
  uploading: boolean;
  progress: number;
  error: string | null;
}

export interface CSVAnalysisResult {
  success: boolean;
  availableColumns: string[];
  sampleData: any[];
  tempFilePath: string;
  totalRows: number;
  expectedFields: Record<string, { required: boolean; description: string }>;
} 