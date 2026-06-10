export interface FirmwareVersion {
  id: string;
  version: string;
  releaseDate: string;
  status: 'synced' | 'pending';
  md5: string;
  size: string;
  changelog: string;
  fileName?: string;
  downloadUrl?: string;
}

export interface BmcVersion {
  id: string;
  version: string;
  releaseDate: string;
  status: 'synced' | 'pending';
  md5: string;
  size: string;
  changelog: string;
  bmcType: string;
  ipAddress?: string;
  fileName?: string;
  downloadUrl?: string;
}

export interface DriverDownload {
  id: string;
  name: string;
  version: string;
  releaseDate: string;
  status: FirmwareVersion['status'];
  md5: string;
  size: string;
  changelog: string;
  fileName?: string;
  downloadUrl?: string;
}

export interface ManualDownload {
  id: string;
  name: string;
  version: string;
  releaseDate: string;
  md5: string;
  size: string;
  changelog: string;
  fileName?: string;
  downloadUrl?: string;
}

export interface ServerModel {
  id: string;
  name: string;
  manufacturer: string;
  modelNumber: string;
  amaxModel?: string;
  chipset: string;
  cpuSupport: string;
  memorySlots: number;
  currentBios: string;
  currentBmc: string;
  status: 'synced' | 'pending';
  lastUpdated: string;
  notes: string;
  firmwares: FirmwareVersion[];
  bmcVersions: BmcVersion[];
  drivers?: DriverDownload[];
  manuals?: ManualDownload[];
  thumbnail: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'upload' | 'download' | 'update' | 'delete' | 'note_added';
  user: string;
  target: string;
  details: string;
}

export interface AdminStats {
  totalModels: number;
  totalFirmwares: number;
  totalBmcFirmwares: number;
  pendingReviews: number;
  pendingModels: number;
  recentUploads: number;
  recentDownloads: number;
}

export type ToolCategory = 'diagnostic' | 'automation' | 'security' | 'utility' | 'monitoring';

export interface SoftwareTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  version: string;
  author: string;
  publishDate: string;
  lastUpdated: string;
  downloads: number;
  size: string;
  md5: string;
  tags: string[];
  readme: string;
  status?: 'active' | 'pending';
  fileName?: string;
  downloadUrl?: string;
  icon: string;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  description: string;
  website: string;
  country: string;
  supportUrl: string;
  modelCount: number;
}

export interface ToolCategoryConfig {
  id: ToolCategory;
  name: string;
  description: string;
  color: string;
  toolCount: number;
}

export interface ISOCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isoCount: number;
}

export interface ISOMirror {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  version: string;
  architecture: string;
  size: string;
  md5: string;
  sha256: string;
  uploadDate: string;
  lastUpdated: string;
  downloads: number;
  status: 'active' | 'pending' | 'deprecated';
  uploadBy: string;
  notes: string;
  tags: string[];
  fileName?: string;
  downloadUrl?: string;
}

// ==================== AUTH / PERMISSION ====================

export type UserRole = 'super_admin' | 'admin' | 'user';

export type PermissionModule =
  | 'dashboard'
  | 'models'
  | 'isos'
  | 'software'
  | 'audit'
  | 'admin';

export interface Permission {
  module: PermissionModule;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  avatar: string;
  permissions: Permission[];
  assignedModules?: PermissionModule[];
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'disabled';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: '超级管理员',
  admin: '普通管理员',
  user: '普通用户',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: '#36F4C2',
  admin: '#D9A14C',
  user: '#595969',
};

export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: '驾驶舱',
  models: '机型库',
  isos: '镜像中心',
  software: '软件中心',
  audit: '合规监控',
  admin: '管理后台',
};

// Default permissions by role
export function getDefaultPermissions(role: UserRole, assignedModules?: PermissionModule[]): Permission[] {
  const allModules: PermissionModule[] = ['dashboard', 'models', 'isos', 'software', 'audit', 'admin'];

  if (role === 'super_admin') {
    return allModules.map(m => ({
      module: m,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
    }));
  }

  if (role === 'admin') {
    const modules = assignedModules || ['dashboard', 'models', 'isos', 'software', 'audit'];
    return allModules.map(m => ({
      module: m,
      canView: modules.includes(m),
      canCreate: modules.includes(m) && m !== 'admin',
      canEdit: modules.includes(m) && m !== 'admin',
      canDelete: modules.includes(m) && m !== 'admin',
    }));
  }

  // user
  return allModules.map(m => ({
    module: m,
    canView: m !== 'admin',
    canCreate: false,
    canEdit: false,
    canDelete: false,
  }));
}
