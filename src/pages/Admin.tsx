import { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import {
  Shield, Plus, Pencil, Trash2,
  Server, Cpu, Tag, Box, LayoutGrid,
  Layers, FileCode, ScrollText, Globe, Building2,
  X, Stethoscope, Monitor, Terminal, Workflow, ShieldCheck, Activity,
  GitCompare, Lock, Scan, Network, Package, Disc, Disc3, Cloud, Wrench, Clock,
} from 'lucide-react';
import HackerText from '@/components/HackerText';
import FileDropZone from '@/components/FileDropZone';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import type {
  ToolCategory, FirmwareVersion, ISOMirror,
} from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function uploadISOFile(file: File, onProgress?: (percent: number) => void) {
  return new Promise<{ originalName: string; size: number; md5: string; downloadUrl: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/uploads/firmware?name=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`上传文件失败：${xhr.status}`));
        return;
      }
      try {
        onProgress?.(100);
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error('上传文件响应解析失败'));
      }
    };
    xhr.onerror = () => reject(new Error('上传文件网络错误'));
    xhr.onabort = () => reject(new Error('上传文件已取消'));
    xhr.send(file);
  });
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type AdminTab = 'overview' | 'brands' | 'categories' | 'isoCategories' | 'isoMirrors' | 'models' | 'firmwares' | 'tools' | 'logs';

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: '概览', icon: LayoutGrid },
  { id: 'brands', label: '品牌管理', icon: Building2 },
  { id: 'categories', label: '工具分类', icon: Layers },
  { id: 'isoCategories', label: '镜像分类', icon: Disc },
  { id: 'isoMirrors', label: 'ISO镜像', icon: Disc3 },
  { id: 'models', label: '机型管理', icon: Server },
  { id: 'firmwares', label: '固件管理', icon: FileCode },
  { id: 'tools', label: '工具管理', icon: Box },
  { id: 'logs', label: '审计日志', icon: ScrollText },
];

const STATUS_OPTIONS: Array<{ value: FirmwareVersion['status']; label: string; color: string }> = [
  { value: 'synced', label: '已同步', color: '#36F4C2' },
  { value: 'pending', label: '待审核', color: '#D9A14C' },

];

const TOOL_ICONS: Record<string, React.ElementType> = {
  Stethoscope, Monitor, Workflow, ShieldCheck, Activity,
  GitCompare, Globe, Lock, Scan, Network, Package,
};

const TOOL_CATEGORIES: Array<{ value: ToolCategory; label: string }> = [
  { value: 'diagnostic', label: '诊断工具' },
  { value: 'automation', label: '自动化' },
  { value: 'security', label: '安全工具' },
  { value: 'utility', label: '实用工具' },
  { value: 'monitoring', label: '监控工具' },
];

/* ================================================================
   Reusable UI Components
   ================================================================ */

function StatusBadge({ status }: { status: FirmwareVersion['status'] }) {
  const cfg = STATUS_OPTIONS.find(s => s.value === status);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg?.color, backgroundColor: cfg?.color + '15', border: `1px solid ${cfg?.color}30` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg?.color }} />
      {cfg?.label}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-tsurface border border-white/10 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-tm" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = 'text', readOnly }: {
  label: string; value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-tm mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 transition-colors ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
        placeholder={placeholder}
      />
    </div>
  );
}

function FormTextArea({ label, value, onChange, placeholder, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="text-xs text-tm mb-1.5 block">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 resize-none transition-colors"
        placeholder={placeholder}
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="text-xs text-tm mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amax/30 transition-colors appearance-none"
        style={{ backgroundImage: 'none' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-16 text-center">
      <Icon className="w-12 h-12 text-tm mx-auto mb-4" />
      <p className="text-ts">{message}</p>
    </div>
  );
}

/* ================================================================
   Admin Page
   ================================================================ */

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const {
    serverModels: models, addServerModel, updateServerModel, deleteServerModel,
    softwareTools: tools, addSoftwareTool, updateSoftwareTool, deleteSoftwareTool,
    auditLogs: logs,
    brands, addBrand, updateBrand, deleteBrand,
    categories, addCategory, updateCategory, deleteCategory,
    isoCategories, addISOCategory, updateISOCategory, deleteISOCategory,
    isoMirrors, updateISOMirror, deleteISOMirror,
    updateFirmware, updateBmcVersion, deleteFirmware, deleteBmcVersion,
    updateDriverDownload, deleteDriverDownload,
  } = useData();
  const { hasPermission } = useAuth();
  const canDeleteISO = hasPermission('isos', 'delete');

  // Modal states
  const [modalType, setModalType] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [brandForm, setBrandForm] = useState({ name: '', logo: '', description: '', website: '', country: '', supportUrl: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', color: '#36F4C2' });
  const [modelForm, setModelForm] = useState({ name: '', manufacturer: '', modelNumber: '', amaxModel: '', chipset: 'Intel', cpuSupport: '', memorySlots: 16, notes: '' });
  const [toolForm, setToolForm] = useState({ name: '', description: '', category: 'utility' as ToolCategory, version: '', author: '', tags: '', readme: '', fileName: '', downloadUrl: '', size: '', md5: '' });
  const [isoForm, setIsoForm] = useState({ name: '', description: '', categoryId: '', version: '', architecture: '', size: '', md5: '', sha256: '', status: 'active' as ISOMirror['status'], uploadBy: '', notes: '', tags: '', fileName: '', downloadUrl: '' });
  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [fileUploadError, setFileUploadError] = useState('');
  const [editingFirmwareNoteId, setEditingFirmwareNoteId] = useState<string | null>(null);
  const [firmwareNoteDraft, setFirmwareNoteDraft] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);

  const animateContent = useCallback(() => {
    if (contentRef.current) {
      const rows = contentRef.current.querySelectorAll('.admin-row');
      gsap.fromTo(rows, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' });
    }
  }, []);

  useEffect(() => { animateContent(); }, [activeTab, animateContent]);

  // ---- CRUD helpers ----
  const openModal = (type: string, id?: string) => {
    setModalType(type);
    setEditingId(id || null);
    if (type === 'brand' && id) {
      const b = brands.find(x => x.id === id);
      if (b) setBrandForm({ name: b.name, logo: b.logo, description: b.description, website: b.website, country: b.country, supportUrl: b.supportUrl });
    } else if (type === 'brand') {
      setBrandForm({ name: '', logo: '', description: '', website: '', country: '', supportUrl: '' });
    } else if (type === 'category' && id) {
      const c = categories.find(x => x.id === id);
      if (c) setCategoryForm({ name: c.name, description: c.description, color: c.color });
    } else if (type === 'category') {
      setCategoryForm({ name: '', description: '', color: '#36F4C2' });
    } else if (type === 'model' && id) {
      const m = models.find(x => x.id === id);
      if (m) setModelForm({ name: m.name, manufacturer: m.manufacturer, modelNumber: m.modelNumber, amaxModel: m.amaxModel || '', chipset: m.chipset, cpuSupport: m.cpuSupport, memorySlots: m.memorySlots, notes: m.notes });
    } else if (type === 'model') {
      setModelForm({ name: '', manufacturer: '', modelNumber: '', amaxModel: '', chipset: 'Intel', cpuSupport: '', memorySlots: 16, notes: '' });
    } else if (type === 'tool' && id) {
      const t = tools.find(x => x.id === id);
      if (t) setToolForm({ name: t.name, description: t.description, category: t.category, version: t.version, author: t.author, tags: t.tags.join(', '), readme: t.readme, fileName: t.fileName || '', downloadUrl: t.downloadUrl || '', size: t.size || '', md5: t.md5 || '' });
    } else if (type === 'tool') {
      setToolForm({ name: '', description: '', category: 'utility', version: '', author: '', tags: '', readme: '', fileName: '', downloadUrl: '', size: '', md5: '' });
    } else if (type === 'isoMirror' && id) {
      const iso = isoMirrors.find(x => x.id === id);
      if (iso) setIsoForm({
        name: iso.name,
        description: iso.description,
        categoryId: iso.categoryId,
        version: iso.version,
        architecture: iso.architecture,
        size: iso.size,
        md5: iso.md5,
        sha256: iso.sha256,
        status: iso.status,
        uploadBy: iso.uploadBy,
        notes: iso.notes,
        tags: iso.tags.join(', '),
        fileName: iso.fileName || '',
        downloadUrl: iso.downloadUrl || '',
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
    setUploadingFileName('');
    setFileUploadError('');
    setFileUploadProgress({});
  };

  const saveBrand = () => {
    if (!brandForm.name) return;
    if (editingId) {
      updateBrand(editingId, brandForm);
    } else {
      addBrand({ ...brandForm, modelCount: 0 });
    }
    closeModal();
  };

  const handleDeleteBrand = (id: string) => deleteBrand(id);

  const saveCategory = () => {
    if (!categoryForm.name) return;
    if (editingId) {
      updateCategory(editingId, categoryForm);
    } else {
      addCategory({
        name: categoryForm.name,
        description: categoryForm.description,
        color: categoryForm.color,
        toolCount: 0,
      });
    }
    closeModal();
  };

  const handleDeleteCategory = (id: string) => deleteCategory(id);

  // ISO Category CRUD
  const saveISOCategory = () => {
    if (!categoryForm.name) return;
    if (editingId) {
      updateISOCategory(editingId, { name: categoryForm.name, description: categoryForm.description, color: categoryForm.color });
    } else {
      addISOCategory({
        name: categoryForm.name,
        description: categoryForm.description,
        color: categoryForm.color,
        icon: 'Disc3',
        isoCount: 0,
      });
    }
    closeModal();
  };

  const handleDeleteISOCategory = (id: string) => deleteISOCategory(id);

  const saveISOMirror = () => {
    if (!editingId || !isoForm.name || !isoForm.categoryId || uploadingFileName) return;
    updateISOMirror(editingId, {
      ...isoForm,
      tags: isoForm.tags.split(',').map(s => s.trim()).filter(Boolean),
      lastUpdated: new Date().toISOString().split('T')[0],
    });
    closeModal();
  };

  const handleISOMirrorFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadingFileName(file.name);
    setFileUploadError('');
    setFileUploadProgress((p) => ({ ...p, [file.name]: 0 }));
    setIsoForm((p) => ({ ...p, fileName: '', downloadUrl: '', md5: '', size: formatFileSize(file.size) }));
    try {
      const uploaded = await uploadISOFile(file, (percent) => {
        setFileUploadProgress((p) => ({ ...p, [file.name]: percent }));
      });
      setIsoForm(p => ({
        ...p,
        fileName: uploaded.originalName,
        downloadUrl: uploaded.downloadUrl,
        size: formatFileSize(uploaded.size),
        md5: uploaded.md5,
      }));
    } catch (error) {
      setFileUploadError(error instanceof Error ? error.message : '上传 ISO 附件失败');
      setFileUploadProgress((p) => ({ ...p, [file.name]: 0 }));
      console.error('上传 ISO 附件失败', error);
    } finally {
      setUploadingFileName('');
    }
  };

  const handleToolFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadingFileName(file.name);
    setFileUploadError('');
    setFileUploadProgress((p) => ({ ...p, [file.name]: 0 }));
    setToolForm((p) => ({ ...p, fileName: '', downloadUrl: '', md5: '', size: formatFileSize(file.size) }));
    try {
      const uploaded = await uploadISOFile(file, (percent) => {
        setFileUploadProgress((p) => ({ ...p, [file.name]: percent }));
      });
      setToolForm(p => ({
        ...p,
        fileName: uploaded.originalName,
        downloadUrl: uploaded.downloadUrl,
        size: formatFileSize(uploaded.size),
        md5: uploaded.md5,
      }));
    } catch (error) {
      setFileUploadError(error instanceof Error ? error.message : '上传工具附件失败');
      setFileUploadProgress((p) => ({ ...p, [file.name]: 0 }));
      console.error('上传工具附件失败', error);
    } finally {
      setUploadingFileName('');
    }
  };

  const saveModel = () => {
    const generatedName = [modelForm.manufacturer, modelForm.modelNumber, modelForm.amaxModel].filter(Boolean).join(' ');
    if (!generatedName || !modelForm.manufacturer) return;
    const payload = { ...modelForm, name: generatedName };
    if (editingId) {
      updateServerModel(editingId, payload);
    } else {
      addServerModel({
        ...payload,
        currentBios: 'N/A',
        currentBmc: 'N/A',
        status: 'synced',
        lastUpdated: new Date().toISOString(),
        thumbnail: '/motherboard-macro.jpg',
        firmwares: [],
        bmcVersions: [],
        drivers: [],
        manuals: [],
      });
    }
    closeModal();
  };

  const handleDeleteModel = (id: string) => deleteServerModel(id);

  const saveTool = () => {
    if (!toolForm.name || !toolForm.version) return;
    if (editingId) {
      updateSoftwareTool(editingId, {
        ...toolForm,
        tags: toolForm.tags.split(',').map(s => s.trim()).filter(Boolean),
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    } else {
      addSoftwareTool({
        ...toolForm,
        tags: toolForm.tags.split(',').map(s => s.trim()).filter(Boolean),
        publishDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        downloads: 0,
        size: toolForm.size || '0 MB',
        md5: toolForm.md5 || 'pending',
        status: 'pending',
        icon: 'Package',
      });
    }
    closeModal();
  };

  const handleDeleteTool = (id: string) => deleteSoftwareTool(id);

  // ---- All firmwares flat list ----
  const allFirmwares = models.flatMap(m => [
    ...m.firmwares.map(f => ({ ...f, parentName: m.name, parentId: m.id, fwType: 'BIOS' as const })),
    ...m.bmcVersions.map(b => ({ ...b, parentName: m.name, parentId: m.id, fwType: 'BMC' as const })),
    ...(m.drivers || []).map(d => ({ ...d, status: d.status || 'pending', parentName: m.name, parentId: m.id, fwType: 'DRIVER' as const })),
  ]);

  const startEditFirmwareNote = (fw: typeof allFirmwares[number]) => {
    setEditingFirmwareNoteId(`${fw.parentId}-${fw.id}`);
    setFirmwareNoteDraft(fw.changelog);
  };

  const saveFirmwareNote = (fw: typeof allFirmwares[number]) => {
    if (fw.fwType === 'BIOS') {
      updateFirmware(fw.parentId, fw.id, { changelog: firmwareNoteDraft });
    } else if (fw.fwType === 'BMC') {
      updateBmcVersion(fw.parentId, fw.id, { changelog: firmwareNoteDraft });
    } else {
      updateDriverDownload(fw.parentId, fw.id, { changelog: firmwareNoteDraft });
    }
    setEditingFirmwareNoteId(null);
    setFirmwareNoteDraft('');
  };

  const cancelEditFirmwareNote = () => {
    setEditingFirmwareNoteId(null);
    setFirmwareNoteDraft('');
  };

  const pendingFirmwareCount = models.reduce(
    (s, m) => s + m.firmwares.filter(f => f.status === 'pending').length + m.bmcVersions.filter(b => b.status === 'pending').length + (m.drivers || []).filter(d => (d.status || 'pending') === 'pending').length,
    0
  );
  const pendingReviewCount = pendingFirmwareCount
    + models.filter(m => m.status === 'pending').length
    + isoMirrors.filter(m => m.status === 'pending').length
    + tools.filter(t => t.status === 'pending').length;

  const getBrandModelsCount = (brandName: string) => models.filter(m => m.manufacturer === brandName).length;
  const getCategoryToolCount = (catId: string) => tools.filter(t => t.category === catId).length;

  /* ================================================================
     RENDER: Overview
     ================================================================ */
  const renderOverview = () => (
    <div className="space-y-8">
      {/* Stats */}
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: '机型', value: models.length, icon: Server, color: '#36F4C2' },
          { label: 'BIOS固件', value: models.reduce((s, m) => s + m.firmwares.length, 0), icon: Cpu, color: '#36F4C2' },
          { label: 'BMC固件', value: models.reduce((s, m) => s + m.bmcVersions.length, 0), icon: Shield, color: '#D9A14C' },
          { label: '待审核', value: pendingReviewCount, icon: Clock, color: '#D9A14C' },
          { label: 'ISO镜像', value: isoCategories.reduce((s, c) => s + c.isoCount, 0), icon: Disc3, color: '#22d3ee' },
          { label: '品牌', value: brands.length, icon: Building2, color: '#a78bfa' },
          { label: '工具分类', value: categories.length, icon: Layers, color: '#22d3ee' },
          { label: '运维工具', value: tools.length, icon: Box, color: '#a78bfa' },
        ].map((s, i) => (
          <div key={i} className="admin-row p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all cursor-pointer"
            onClick={() => {
              if (s.label === '品牌') setActiveTab('brands');
              else if (s.label === '工具分类') setActiveTab('categories');
              else if (s.label === '机型') setActiveTab('models');
              else if (s.label.includes('固件')) setActiveTab('firmwares');
              else if (s.label === '待审核') setActiveTab('firmwares');
              else if (s.label === '运维工具') setActiveTab('tools');
              else if (s.label === '审计日志') setActiveTab('logs');
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: s.color + '15' }}>
              <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-bold text-white font-mono-data">{s.value}</p>
            <p className="text-xs text-tm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
          <h3 className="text-base font-semibold text-white mb-4">最近操作</h3>
          <div className="space-y-3">
            {logs.slice(0, 5).map(log => (
              <div key={log.id} className="admin-row flex items-center gap-3 py-2 border-b border-white/[0.02] last:border-0">
                <span className={`w-2 h-2 rounded-full ${
                  log.action === 'update' ? 'bg-amax' :
                  log.action === 'upload' ? 'bg-[#D9A14C]' :
                  log.action === 'download' ? 'bg-blue-400' :
                  log.action === 'delete' ? 'bg-[#F24C36]' : 'bg-purple-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{log.details}</p>
                  <p className="text-xs text-tm">{log.user} · {new Date(log.timestamp).toLocaleDateString('zh-CN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
          <h3 className="text-base font-semibold text-white mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '添加品牌', tab: 'brands' as AdminTab, icon: Building2, color: '#a78bfa' },
              { label: '添加分类', tab: 'categories' as AdminTab, icon: Layers, color: '#22d3ee' },
              { label: '添加机型', tab: 'models' as AdminTab, icon: Server, color: '#36F4C2' },
              { label: '发布工具', tab: 'tools' as AdminTab, icon: Box, color: '#D9A14C' },
            ].map(a => (
              <button key={a.label}
                onClick={() => setActiveTab(a.tab)}
                className="admin-row flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all text-left group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: a.color + '15' }}>
                  <a.icon className="w-4.5 h-4.5" style={{ color: a.color }} />
                </div>
                <span className="text-sm text-ts group-hover:text-tp transition-colors">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* ================================================================
     RENDER: Brands
     ================================================================ */
  const renderBrands = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-tm">共 {brands.length} 个品牌</p>
        <button onClick={() => openModal('brand')} className="liquid-cta-btn py-2.5 px-4 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1.5" />添加品牌
        </button>
      </div>
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">
              {['品牌', '国家', '描述', '官网', '关联机型', '操作'].map(h => (
                <th key={h} className="text-left text-xs text-tm font-medium uppercase tracking-wider px-6 py-4">{h}</th>
              ))}
            </tr></thead>
            <tbody>{brands.map(b => (
              <tr key={b.id} className="admin-row border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amax/5 flex items-center justify-center border border-[#36F4C2]/10">
                      <span className="text-sm font-bold text-amax font-mono-data">{b.logo}</span>
                    </div>
                    <span className="text-sm text-white font-medium">{b.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-ts">{b.country}</td>
                <td className="px-6 py-4 text-sm text-ts max-w-xs truncate">{b.description}</td>
                <td className="px-6 py-4">
                  <a href={b.website} target="_blank" rel="noreferrer" className="text-xs text-amax hover:underline font-mono-data flex items-center gap-1">
                    <Globe className="w-3 h-3" />{b.website.replace('https://', '')}
                  </a>
                </td>
                <td className="px-6 py-4 text-sm text-amax font-mono-data">{getBrandModelsCount(b.name)}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openModal('brand', b.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                      <Pencil className="w-3.5 h-3.5 text-tm" />
                    </button>
                    <button onClick={() => handleDeleteBrand(b.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-tdf/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-tdf" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {brands.length === 0 && <EmptyState icon={Building2} message="暂无品牌数据" />}
      </div>
    </div>
  );

  /* ================================================================
     RENDER: Categories
     ================================================================ */
  const renderCategories = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-tm">共 {categories.length} 个分类</p>
        <button onClick={() => openModal('category')} className="liquid-cta-btn py-2.5 px-4 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1.5" />添加分类
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(c => (
          <div key={c.id} className="admin-row p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.color + '15' }}>
                <Tag className="w-5 h-5" style={{ color: c.color }} />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openModal('category', c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10">
                  <Pencil className="w-3 h-3 text-tm" />
                </button>
                <button onClick={() => handleDeleteCategory(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-tdf/10">
                  <Trash2 className="w-3 h-3 text-tdf" />
                </button>
              </div>
            </div>
            <h4 className="text-white font-semibold mb-1">{c.name}</h4>
            <p className="text-xs text-tm mb-3 line-clamp-2">{c.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-data" style={{ color: c.color }}>{getCategoryToolCount(c.id)} 个工具</span>
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ================================================================
     RENDER: ISO Categories
     ================================================================ */
  const renderISOCategories = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>共 {isoCategories.length} 个镜像分类</p>
        <button onClick={() => openModal('isoCategory')} className="liquid-cta-btn py-2.5 px-4 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1.5" />添加分类
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isoCategories.map(c => {
          const CatIcon = ISO_CAT_ICONS[c.icon] || Disc3;
          return (
            <div key={c.id} className="admin-row p-5 rounded-2xl card-surface group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.color + '15' }}>
                  <CatIcon className="w-5 h-5" style={{ color: c.color }} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal('isoCategory', c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10">
                    <Pencil className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button onClick={() => handleDeleteISOCategory(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10">
                    <Trash2 className="w-3 h-3" style={{ color: '#F24C36' }} />
                  </button>
                </div>
              </div>
              <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{c.name}</h4>
              <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-data" style={{ color: c.color }}>{c.isoCount} 个镜像</span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const ISO_CAT_ICONS: Record<string, React.ElementType> = { Monitor, Terminal, Cloud, Wrench, Disc3 };

  const renderISOMirrors = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-tm">共 {isoMirrors.length} 个 ISO 镜像</p>
      </div>
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">
              {['镜像名称', '分类', '版本', '架构', '大小', '状态', '下载', '操作'].map(h => (
                <th key={h} className="text-left text-xs text-tm font-medium uppercase tracking-wider px-6 py-4">{h}</th>
              ))}
            </tr></thead>
            <tbody>{isoMirrors.map(mirror => {
              const category = isoCategories.find(c => c.id === mirror.categoryId);
              return (
                <tr key={mirror.id} className="admin-row border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm text-white font-medium">{mirror.name}</p>
                    <p className="text-xs text-tm truncate max-w-xs">{mirror.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={mirror.categoryId}
                      onChange={(e) => updateISOMirror(mirror.id, { categoryId: e.target.value })}
                      className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white focus:outline-none focus:border-amax/30 cursor-pointer"
                    >
                      {isoCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {!category && <p className="text-[10px] text-tdf mt-1">分类不存在</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-white font-mono-data">{mirror.version}</td>
                  <td className="px-6 py-4 text-xs text-ts font-mono-data">{mirror.architecture}</td>
                  <td className="px-6 py-4 text-xs text-ts font-mono-data">{mirror.size}</td>
                  <td className="px-6 py-4">
                    <select
                      value={mirror.status}
                      onChange={(e) => updateISOMirror(mirror.id, { status: e.target.value as typeof mirror.status })}
                      className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white focus:outline-none focus:border-amax/30 cursor-pointer"
                    >
                      <option value="active">可用</option>
                      <option value="pending">审核中</option>
                      <option value="deprecated">已弃用</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-xs text-tm font-mono-data">{mirror.downloads}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openModal('isoMirror', mirror.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10" title="编辑镜像">
                        <Pencil className="w-3.5 h-3.5 text-tm" />
                      </button>
                      {canDeleteISO && (
                        <button onClick={() => deleteISOMirror(mirror.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-tdf/10" title="删除镜像">
                          <Trash2 className="w-3.5 h-3.5 text-tdf" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {isoMirrors.length === 0 && <EmptyState icon={Disc3} message="暂无 ISO 镜像" />}
      </div>
    </div>
  );

  /* ================================================================
     RENDER: Models
     ================================================================ */
  const renderModels = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-tm">共 {models.length} 个机型</p>
        <button onClick={() => openModal('model')} className="liquid-cta-btn py-2.5 px-4 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1.5" />添加机型
        </button>
      </div>
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">
              {['机型', '厂商', '芯片组', 'BIOS', 'BMC', '状态', '固件数', '操作'].map(h => (
                <th key={h} className="text-left text-xs text-tm font-medium uppercase tracking-wider px-6 py-4">{h}</th>
              ))}
            </tr></thead>
            <tbody>{models.map(m => (
              <tr key={m.id} className="admin-row border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amax/5 flex items-center justify-center border border-[#36F4C2]/10">
                      <Server className="w-4 h-4 text-amax" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{m.name}</p>
                      <p className="text-xs text-tm font-mono-data">{m.modelNumber}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-ts">{m.manufacturer}</td>
                <td className="px-6 py-4 text-sm text-ts">{m.chipset}</td>
                <td className="px-6 py-4 font-mono-data text-sm text-amax">V.{m.currentBios}</td>
                <td className="px-6 py-4 font-mono-data text-sm text-tdp">V.{m.currentBmc}</td>
                <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
                <td className="px-6 py-4 text-xs text-tm font-mono-data">{m.firmwares.length + m.bmcVersions.length}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openModal('model', m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">
                      <Pencil className="w-3.5 h-3.5 text-tm" />
                    </button>
                    <button onClick={() => handleDeleteModel(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-tdf/10">
                      <Trash2 className="w-3.5 h-3.5 text-tdf" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {models.length === 0 && <EmptyState icon={Server} message="暂无机型数据" />}
      </div>
    </div>
  );

  /* ================================================================
     RENDER: Firmwares
     ================================================================ */
  const renderFirmwares = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-tm">共 {allFirmwares.length} 个文件版本（BIOS + BMC + 驱动）</p>
      </div>
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">
              {['类型', '版本', '所属机型', '发布日期', '大小', '状态', 'MD5', '备注', '操作'].map(h => (
                <th key={h} className="text-left text-xs text-tm font-medium uppercase tracking-wider px-6 py-4">{h}</th>
              ))}
            </tr></thead>
            <tbody>{allFirmwares.map((fw, i) => (
              <tr key={`${fw.parentId}-${fw.id}-${i}`} className="admin-row border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    fw.fwType === 'BIOS' ? 'bg-amax/10 text-amax' : fw.fwType === 'BMC' ? 'bg-tdp/10 text-tdp' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {fw.fwType === 'BIOS' ? <Cpu className="w-2.5 h-2.5" /> : fw.fwType === 'BMC' ? <Shield className="w-2.5 h-2.5" /> : <Package className="w-2.5 h-2.5" />}
                    {fw.fwType === 'DRIVER' ? '驱动' : fw.fwType}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono-data text-sm text-white">V.{fw.version}</td>
                <td className="px-6 py-4 text-sm text-ts">{fw.parentName}</td>
                <td className="px-6 py-4 text-xs text-tm">{new Date(fw.releaseDate).toLocaleDateString('zh-CN')}</td>
                <td className="px-6 py-4 text-xs text-tm font-mono-data">{fw.size}</td>
                <td className="px-6 py-4">
                  <select
                    value={fw.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as FirmwareVersion['status'];
                      if (fw.fwType === 'BIOS') {
                        updateFirmware(fw.parentId, fw.id, { status: newStatus });
                      } else if (fw.fwType === 'BMC') {
                        updateBmcVersion(fw.parentId, fw.id, { status: newStatus });
                      } else {
                        updateDriverDownload(fw.parentId, fw.id, { status: newStatus });
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white focus:outline-none focus:border-amax/30 cursor-pointer"
                  >
                    <option value="synced">已同步</option>
                    <option value="pending">待审核</option>

                  </select>
                </td>
                <td className="px-6 py-4 text-xs text-tm font-mono-data truncate max-w-[120px]">{fw.md5}</td>
                <td className="px-6 py-4 min-w-[240px]">
                  {editingFirmwareNoteId === `${fw.parentId}-${fw.id}` ? (
                    <div className="space-y-2">
                      <textarea
                        value={firmwareNoteDraft}
                        onChange={(e) => setFirmwareNoteDraft(e.target.value)}
                        className="w-full h-20 p-2 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 resize-none"
                        placeholder="填写固件备注..."
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={cancelEditFirmwareNote} className="px-2 py-1 rounded text-xs text-tm hover:bg-white/5">取消</button>
                        <button onClick={() => saveFirmwareNote(fw)} className="px-2 py-1 rounded text-xs text-amax bg-amax/10 hover:bg-amax/15">保存</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditFirmwareNote(fw)}
                      className="max-w-[220px] text-left text-xs text-ts hover:text-amax transition-colors"
                      title="点击编辑备注"
                    >
                      <span className="line-clamp-2 whitespace-pre-wrap">{fw.changelog || '暂无备注，点击编辑'}</span>
                    </button>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (fw.fwType === 'BIOS') {
                          updateFirmware(fw.parentId, fw.id, { status: 'synced' });
                        } else if (fw.fwType === 'BMC') {
                          updateBmcVersion(fw.parentId, fw.id, { status: 'synced' });
                        } else {
                          updateDriverDownload(fw.parentId, fw.id, { status: 'synced' });
                        }
                      }}
                      disabled={fw.status === 'synced'}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        color: fw.status === 'synced' ? 'var(--text-muted)' : 'var(--status-synced)',
                        border: '1px solid',
                        borderColor: fw.status === 'synced' ? 'var(--border)' : 'var(--status-synced)',
                        backgroundColor: fw.status === 'synced' ? 'transparent' : 'rgba(54,244,194,0.05)',
                      }}
                    >
                      通过审核
                    </button>
                    <button
                      onClick={() => {
                        if (fw.fwType === 'BIOS') {
                          deleteFirmware(fw.parentId, fw.id);
                        } else if (fw.fwType === 'BMC') {
                          deleteBmcVersion(fw.parentId, fw.id);
                        } else {
                          deleteDriverDownload(fw.parentId, fw.id);
                        }
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-tdf/10 transition-colors"
                      title="删除固件"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-tdf" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {allFirmwares.length === 0 && <EmptyState icon={FileCode} message="暂无固件数据" />}
      </div>
    </div>
  );

  /* ================================================================
     RENDER: Tools
     ================================================================ */
  const renderTools = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-tm">共 {tools.length} 个运维工具</p>
        <button onClick={() => openModal('tool')} className="liquid-cta-btn py-2.5 px-4 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1.5" />发布工具
        </button>
      </div>
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">
              {['工具', '分类', '版本', '作者', '状态', '下载', '发布日期', '操作'].map(h => (
                <th key={h} className="text-left text-xs text-tm font-medium uppercase tracking-wider px-6 py-4">{h}</th>
              ))}
            </tr></thead>
            <tbody>{tools.map(t => {
              const cat = categories.find(c => c.id === t.category);
              const ToolIcon = TOOL_ICONS[t.icon] || Package;
              return (
                <tr key={t.id} className="admin-row border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amax/5 flex items-center justify-center border border-[#36F4C2]/10">
                        <ToolIcon className="w-4 h-4 text-amax" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{t.name}</p>
                        <p className="text-xs text-tm truncate max-w-[200px]">{t.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {cat && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: cat.color, backgroundColor: cat.color + '15' }}>
                        {cat.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-ts font-mono-data">v{t.version}</td>
                  <td className="px-6 py-4 text-xs text-ts">{t.author}</td>
                  <td className="px-6 py-4">
                    <select
                      value={t.status || 'active'}
                      onChange={(e) => updateSoftwareTool(t.id, { status: e.target.value as 'active' | 'pending' })}
                      className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white focus:outline-none focus:border-amax/30 cursor-pointer"
                    >
                      <option value="active">已通过</option>
                      <option value="pending">待审核</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-xs text-amax font-mono-data">{t.downloads.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs text-tm">{t.publishDate}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openModal('tool', t.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10">
                        <Pencil className="w-3.5 h-3.5 text-tm" />
                      </button>
                      <button onClick={() => handleDeleteTool(t.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-tdf/10">
                        <Trash2 className="w-3.5 h-3.5 text-tdf" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {tools.length === 0 && <EmptyState icon={Box} message="暂无工具数据" />}
      </div>
    </div>
  );

  /* ================================================================
     RENDER: Logs
     ================================================================ */
  const renderLogs = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-tm">共 {logs.length} 条审计日志</p>
      </div>
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">
              {['时间', '操作', '用户', '目标', '详情'].map(h => (
                <th key={h} className="text-left text-xs text-tm font-medium uppercase tracking-wider px-6 py-4">{h}</th>
              ))}
            </tr></thead>
            <tbody>{logs.map(log => {
              const actionColors: Record<string, string> = {
                update: '#36F4C2', upload: '#D9A14C', download: '#60a5fa',
                delete: '#F24C36', note_added: '#a78bfa',
              };
              const actionLabels: Record<string, string> = {
                update: '更新', upload: '上传', download: '下载',
                delete: '删除', note_added: '备注',
              };
              return (
                <tr key={log.id} className="admin-row border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-xs text-tm font-mono-data whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: actionColors[log.action], backgroundColor: actionColors[log.action] + '15' }}>
                      {actionLabels[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-ts font-mono-data">{log.user}</td>
                  <td className="px-6 py-4 text-sm text-white">{log.target}</td>
                  <td className="px-6 py-4 text-xs text-ts max-w-md truncate">{log.details}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );

  /* ================================================================
     RENDER: Modals
     ================================================================ */

  const renderModal = () => {
    if (!modalType) return null;

    if (modalType === 'brand') {
      return (
        <Modal title={editingId ? '编辑品牌' : '添加品牌'} onClose={closeModal}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="品牌名称" value={brandForm.name} onChange={v => setBrandForm(p => ({ ...p, name: v }))} placeholder="Dell" />
              <FormInput label="Logo字母" value={brandForm.logo} onChange={v => setBrandForm(p => ({ ...p, logo: v }))} placeholder="D" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="国家/地区" value={brandForm.country} onChange={v => setBrandForm(p => ({ ...p, country: v }))} placeholder="美国" />
              <FormInput label="官网" value={brandForm.website} onChange={v => setBrandForm(p => ({ ...p, website: v }))} placeholder="https://" />
            </div>
            <FormInput label="支持页面" value={brandForm.supportUrl} onChange={v => setBrandForm(p => ({ ...p, supportUrl: v }))} placeholder="https://support." />
            <FormTextArea label="品牌描述" value={brandForm.description} onChange={v => setBrandForm(p => ({ ...p, description: v }))} placeholder="描述品牌信息..." />
          </div>
          <div className="flex items-center gap-3 mt-8">
            <button onClick={closeModal} className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-sm text-ts hover:text-tp transition-all">取消</button>
            <button onClick={saveBrand} disabled={!brandForm.name} className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50">{editingId ? '保存修改' : '添加品牌'}</button>
          </div>
        </Modal>
      );
    }

    if (modalType === 'category') {
      return (
        <Modal title={editingId ? '编辑分类' : '添加分类'} onClose={closeModal}>
          <div className="space-y-4">
            <FormInput label="分类名称" value={categoryForm.name} onChange={v => setCategoryForm(p => ({ ...p, name: v }))} placeholder="诊断工具" />
            <FormTextArea label="描述" value={categoryForm.description} onChange={v => setCategoryForm(p => ({ ...p, description: v }))} placeholder="描述该分类的用途..." />
            <div>
              <label className="text-xs text-tm mb-1.5 block">标识色</label>
              <div className="flex items-center gap-3">
                <input type="color" value={categoryForm.color} onChange={e => setCategoryForm(p => ({ ...p, color: e.target.value }))} className="w-10 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer" />
                <span className="text-sm text-ts font-mono-data">{categoryForm.color}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-8">
            <button onClick={closeModal} className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-sm text-ts hover:text-tp transition-all">取消</button>
            <button onClick={saveCategory} disabled={!categoryForm.name} className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50">{editingId ? '保存修改' : '添加分类'}</button>
          </div>
        </Modal>
      );
    }

    if (modalType === 'isoCategory') {
      return (
        <Modal title={editingId ? '编辑镜像分类' : '添加镜像分类'} onClose={closeModal}>
          <div className="space-y-4">
            <FormInput label="分类名称" value={categoryForm.name} onChange={v => setCategoryForm(p => ({ ...p, name: v }))} placeholder="例如: Proxmox" />
            <FormTextArea label="描述" value={categoryForm.description} onChange={v => setCategoryForm(p => ({ ...p, description: v }))} placeholder="描述该镜像分类的用途..." />
            <div>
              <label className="text-xs text-tm mb-1.5 block">标识色</label>
              <div className="flex items-center gap-3">
                <input type="color" value={categoryForm.color} onChange={e => setCategoryForm(p => ({ ...p, color: e.target.value }))} className="w-10 h-10 rounded-lg bg-transparent border border-white/10 cursor-pointer" />
                <span className="text-sm text-ts font-mono-data">{categoryForm.color}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-8">
            <button onClick={closeModal} className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-sm text-ts hover:text-tp transition-all">取消</button>
            <button onClick={saveISOCategory} disabled={!categoryForm.name} className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50">{editingId ? '保存修改' : '添加分类'}</button>
          </div>
        </Modal>
      );
    }

    if (modalType === 'isoMirror') {
      return (
        <Modal title="编辑 ISO 镜像" onClose={closeModal}>
          <div className="space-y-4">
            <FormInput label="镜像名称" value={isoForm.name} onChange={v => setIsoForm(p => ({ ...p, name: v }))} placeholder="Ubuntu Server 24.04" />
            <FormTextArea label="描述" value={isoForm.description} onChange={v => setIsoForm(p => ({ ...p, description: v }))} placeholder="镜像说明..." rows={3} />
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="分类" value={isoForm.categoryId} onChange={v => setIsoForm(p => ({ ...p, categoryId: v }))}
                options={isoCategories.map(c => ({ value: c.id, label: c.name }))} />
              <FormSelect label="状态" value={isoForm.status} onChange={v => setIsoForm(p => ({ ...p, status: v as ISOMirror['status'] }))}
                options={[{ value: 'active', label: '可用' }, { value: 'pending', label: '审核中' }, { value: 'deprecated', label: '已弃用' }]} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormInput label="版本" value={isoForm.version} onChange={v => setIsoForm(p => ({ ...p, version: v }))} placeholder="24.04" />
              <FormInput label="架构" value={isoForm.architecture} onChange={v => setIsoForm(p => ({ ...p, architecture: v }))} placeholder="x86_64" />
              <FormInput label="大小" value={isoForm.size} onChange={v => setIsoForm(p => ({ ...p, size: v }))} placeholder="5.8 GB" />
            </div>
            <FormInput label="MD5" value={isoForm.md5} onChange={v => setIsoForm(p => ({ ...p, md5: v }))} placeholder="md5" />
            <FormInput label="SHA256" value={isoForm.sha256} onChange={v => setIsoForm(p => ({ ...p, sha256: v }))} placeholder="sha256" />
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-tm mb-1">镜像附件</p>
                  <p className="text-sm text-white font-mono-data">{isoForm.fileName || '暂无附件'}</p>
                </div>
                {isoForm.downloadUrl && <span className="text-xs text-amax">已上传</span>}
              </div>
              <FileDropZone
                onFileSelect={handleISOMirrorFileSelect}
                maxSizeText="最大文件大小: 2 GB"
                progress={fileUploadProgress}
                uploadingFileName={uploadingFileName}
                error={fileUploadError}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="上传者" value={isoForm.uploadBy} onChange={v => setIsoForm(p => ({ ...p, uploadBy: v }))} placeholder="admin" />
              <FormInput label="标签" value={isoForm.tags} onChange={v => setIsoForm(p => ({ ...p, tags: v }))} placeholder="tag1, tag2" />
            </div>
            <FormTextArea label="备注" value={isoForm.notes} onChange={v => setIsoForm(p => ({ ...p, notes: v }))} placeholder="镜像备注..." rows={3} />
          </div>
          <div className="flex items-center gap-3 mt-8">
            <button onClick={closeModal} className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-sm text-ts hover:text-tp transition-all">取消</button>
            <button onClick={saveISOMirror} disabled={!isoForm.name || !isoForm.categoryId || Boolean(uploadingFileName)} className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50">{uploadingFileName ? '文件上传中...' : '保存修改'}</button>
          </div>
        </Modal>
      );
    }

    if (modalType === 'model') {
      return (
        <Modal title={editingId ? '编辑机型' : '添加机型'} onClose={closeModal}>
          <div className="space-y-4">
            <FormInput label="机型名称" value={[modelForm.manufacturer, modelForm.modelNumber, modelForm.amaxModel].filter(Boolean).join(' ')} onChange={() => {}} placeholder="自动由厂商 + 主板/BB型号 + Amax型号生成" readOnly />
            <div className="grid grid-cols-3 gap-4">
              <FormSelect label="厂商" value={modelForm.manufacturer} onChange={v => setModelForm(p => ({ ...p, manufacturer: v }))}
                options={[{ value: '', label: '选择厂商' }, ...brands.map(b => ({ value: b.name, label: b.name }))]} />
              <FormInput label="主板/BB型号" value={modelForm.modelNumber} onChange={v => setModelForm(p => ({ ...p, modelNumber: v }))} placeholder="R750-2U" />
              <FormInput label="Amax型号" value={modelForm.amaxModel} onChange={v => setModelForm(p => ({ ...p, amaxModel: v }))} placeholder="AMX-750" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="平台类型" value={modelForm.chipset} onChange={v => setModelForm(p => ({ ...p, chipset: v }))}
                options={[{ value: 'Intel', label: 'Intel' }, { value: 'AMD', label: 'AMD' }]} />
              <FormInput label="内存插槽" value={modelForm.memorySlots} onChange={v => setModelForm(p => ({ ...p, memorySlots: parseInt(v) || 0 }))} placeholder="16" type="number" />
            </div>
            <FormInput label="CPU支持" value={modelForm.cpuSupport} onChange={v => setModelForm(p => ({ ...p, cpuSupport: v }))} placeholder="Intel Xeon Scalable" />
            <FormTextArea label="备注" value={modelForm.notes} onChange={v => setModelForm(p => ({ ...p, notes: v }))} placeholder="添加备注..." />
          </div>
          <div className="flex items-center gap-3 mt-8">
            <button onClick={closeModal} className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-sm text-ts hover:text-tp transition-all">取消</button>
            <button onClick={saveModel} disabled={!modelForm.manufacturer} className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50">{editingId ? '保存修改' : '添加机型'}</button>
          </div>
        </Modal>
      );
    }

    if (modalType === 'tool') {
      return (
        <Modal title={editingId ? '编辑工具' : '发布工具'} onClose={closeModal}>
          <div className="space-y-4">
            <FormInput label="工具名称" value={toolForm.name} onChange={v => setToolForm(p => ({ ...p, name: v }))} placeholder="Server Health Monitor" />
            <FormTextArea label="描述" value={toolForm.description} onChange={v => setToolForm(p => ({ ...p, description: v }))} placeholder="简要描述工具功能..." rows={3} />
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="分类" value={toolForm.category} onChange={v => setToolForm(p => ({ ...p, category: v as ToolCategory }))}
                options={TOOL_CATEGORIES} />
              <FormInput label="版本" value={toolForm.version} onChange={v => setToolForm(p => ({ ...p, version: v }))} placeholder="1.0.0" />
            </div>
            <FormInput label="作者" value={toolForm.author} onChange={v => setToolForm(p => ({ ...p, author: v }))} placeholder="用户名" />
            <FormInput label="标签" value={toolForm.tags} onChange={v => setToolForm(p => ({ ...p, tags: v }))} placeholder="tag1, tag2, tag3" />
            <FormTextArea label="README" value={toolForm.readme} onChange={v => setToolForm(p => ({ ...p, readme: v }))} placeholder="# 工具名称..." rows={4} />
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-tm mb-1">工具附件</p>
                  <p className="text-sm text-white font-mono-data">{toolForm.fileName || '暂无附件'}</p>
                  {(toolForm.size || toolForm.md5) && <p className="text-xs text-tm font-mono-data mt-1">{toolForm.size || '未知大小'} / MD5: {toolForm.md5 || 'pending'}</p>}
                </div>
                {toolForm.downloadUrl && <span className="text-xs text-amax">已上传</span>}
              </div>
              <FileDropZone
                onFileSelect={handleToolFileSelect}
                acceptAll
                title="拖拽工具文件到此处"
                hint="或点击浏览文件（文件类型不限）"
                maxSizeText="最大文件大小: 2 GB"
                progress={fileUploadProgress}
                uploadingFileName={uploadingFileName}
                error={fileUploadError}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-8">
            <button onClick={closeModal} className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-sm text-ts hover:text-tp transition-all">取消</button>
            <button onClick={saveTool} disabled={!toolForm.name || !toolForm.version || Boolean(uploadingFileName)} className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50">{uploadingFileName ? '文件上传中...' : editingId ? '保存修改' : '发布工具'}</button>
          </div>
        </Modal>
      );
    }

    return null;
  };

  /* ================================================================
     MAIN LAYOUT
     ================================================================ */
  return (
    <div className="min-h-screen bg-tbase pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amax/10 flex items-center justify-center border border-amax/20">
              <Shield className="w-5 h-5 text-amax" />
            </div>
            <span className="text-xs text-amax font-mono-data uppercase tracking-wider">Admin Panel</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            <HackerText text="管理后台" trigger="mount" />
          </h1>
          <p className="text-ts">全面管理品牌、分类、机型、固件、工具和审计日志</p>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  isActive
                    ? 'bg-amax/10 text-amax border-amax/20'
                    : 'text-tm bg-white/[0.02] border-transparent hover:text-tp hover:border-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div ref={contentRef}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'brands' && renderBrands()}
          {activeTab === 'categories' && renderCategories()}
          {activeTab === 'isoCategories' && renderISOCategories()}
          {activeTab === 'isoMirrors' && renderISOMirrors()}
          {activeTab === 'models' && renderModels()}
          {activeTab === 'firmwares' && renderFirmwares()}
          {activeTab === 'tools' && renderTools()}
          {activeTab === 'logs' && renderLogs()}
        </div>
      </div>

      {/* Modals */}
      {renderModal()}
    </div>
  );
}
