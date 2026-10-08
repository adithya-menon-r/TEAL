export interface LabInfo {
  name?: string;
  description?: string;
  interface?: 'terminal' | 'jupyter';
  tools?: string[];
  cpu?: string;
  memory?: string;
}

export interface GatewayInfo {
  sessionId: string;
  expiresAt: string;
  lab: LabInfo;
  dashboardUrl: string;
}

export interface FileItem {
  name: string;
  isDir: boolean;
  size: number | null;
  modified: number;
}

export interface FileListResponse {
  path: string;
  items: FileItem[];
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
}
