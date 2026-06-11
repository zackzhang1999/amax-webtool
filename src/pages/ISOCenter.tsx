import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  Disc3, Search, Upload, Download, X, Tag, Monitor, Terminal,
  Cloud, Wrench, HardDrive, Hash, Calendar, User, CheckCircle2,
  Clock, AlertTriangle, Copy, Check, FileText, ChevronRight, Trash2,
} from 'lucide-react';
import HackerText from '@/components/HackerText';
import FileDropZone from '@/components/FileDropZone';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import type { ISOMirror } from '@/types';

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
        reject(new Error(`上传 ISO 文件失败：${xhr.status}`));
        return;
      }
      try {
        onProgress?.(100);
        resolve(JSON.parse(xhr.responseText));
      } catch {
        reject(new Error('上传 ISO 文件响应解析失败'));
      }
    };
    xhr.onerror = () => reject(new Error('上传 ISO 文件网络错误'));
    xhr.onabort = () => reject(new Error('上传 ISO 文件已取消'));
    xhr.send(file);
  });
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getDownloadUrl(mirror: ISOMirror) {
  if (!mirror.downloadUrl) return '';
  const baseUrl = mirror.downloadUrl.startsWith('http') ? mirror.downloadUrl : `${API_BASE}${mirror.downloadUrl}`;
  if (!mirror.fileName) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}name=${encodeURIComponent(mirror.fileName)}`;
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('剪贴板复制失败，尝试备用复制方式', error);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  return ok;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Monitor, Terminal, Cloud, Wrench,
};

const STATUS_CONFIG = {
  active: { label: '可用', color: 'var(--status-synced)', icon: CheckCircle2 },
  pending: { label: '审核中', color: 'var(--status-pending)', icon: Clock },
  deprecated: { label: '已弃用', color: 'var(--status-failed)', icon: AlertTriangle },
};

export default function ISOCenter() {
  const { isoMirrors: mirrors, isoCategories: categories, addISOMirror, deleteISOMirror } = useData();
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedMirror, setSelectedMirror] = useState<ISOMirror | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState('');
  const [copied, setCopied] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    name: '', description: '', categoryId: 'iso-cat-linux',
    version: '', architecture: 'x86_64', size: '', md5: '', sha256: '', notes: '', tags: '', fileName: '', downloadUrl: '',
  });

  useEffect(() => {
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.iso-card');
      gsap.fromTo(cards, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
    }
  }, [mirrors, activeCategory, searchQuery]);

  const filteredMirrors = mirrors.filter(m => {
    if (activeCategory !== 'all' && m.categoryId !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q)) ||
        m.version.toLowerCase().includes(q);
    }
    return true;
  });

  const getCategory = (catId: string) => categories.find(c => c.id === catId);

  const handleDownload = (mirror: ISOMirror) => {
    if (mirror.status !== 'active') {
      alert('该镜像尚未审核通过，暂不开放下载');
      return;
    }
    if (!mirror.downloadUrl) {
      alert('该镜像没有可用下载地址');
      return;
    }

    let downloadUrl = getDownloadUrl(mirror);

    // 对于本地上传的文件，绕过 Vite 代理直接走后端，避免代理缓冲大文件导致延迟
    if (downloadUrl.startsWith('/api/')) {
      const directBase = API_BASE || `http://${window.location.hostname}:3201`;
      downloadUrl = `${directBase}${downloadUrl}`;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.rel = 'noopener noreferrer';

    if (/^https?:\/\//i.test(downloadUrl) && !downloadUrl.startsWith(window.location.origin) && !downloadUrl.startsWith(API_BASE || window.location.origin)) {
      a.target = '_blank';
    } else {
      a.download = mirror.fileName || `${mirror.name}_${mirror.version}`;
    }

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleUploadFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadingFileName(file.name);
    setUploadError('');
    setUploadProgress((p) => ({ ...p, [file.name]: 0 }));
    setUploadForm((p) => ({ ...p, fileName: '', downloadUrl: '', md5: '', size: formatFileSize(file.size) }));
    try {
      const uploaded = await uploadISOFile(file, (percent) => {
        setUploadProgress((p) => ({ ...p, [file.name]: percent }));
      });
      setUploadForm(p => ({
        ...p,
        fileName: uploaded.originalName,
        downloadUrl: uploaded.downloadUrl,
        size: formatFileSize(uploaded.size),
        md5: uploaded.md5,
      }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '上传 ISO 文件失败');
      setUploadProgress((p) => ({ ...p, [file.name]: 0 }));
      console.error('上传 ISO 文件失败', error);
    } finally {
      setUploadingFileName('');
    }
  };

  const handleUpload = () => {
    if (!uploadForm.name || !uploadForm.version || uploadingFileName) return;
    if (!uploadForm.downloadUrl) {
      setUploadError('请等待文件上传完成，或填写外部下载地址');
      return;
    }
    addISOMirror({
      name: uploadForm.name,
      description: uploadForm.description,
      categoryId: uploadForm.categoryId,
      version: uploadForm.version,
      architecture: uploadForm.architecture,
      size: uploadForm.size || '0 MB',
      md5: uploadForm.md5 || 'pending',
      sha256: uploadForm.sha256 || 'pending',
      uploadDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
      downloads: 0,
      status: 'pending',
      uploadBy: 'admin',
      notes: uploadForm.notes,
      tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      fileName: uploadForm.fileName,
      downloadUrl: uploadForm.downloadUrl,
    });
    setShowUpload(false);
    setUploadForm({ name: '', description: '', categoryId: 'iso-cat-linux', version: '', architecture: 'x86_64', size: '', md5: '', sha256: '', notes: '', tags: '', fileName: '', downloadUrl: '' });
    setUploadProgress({});
    setUploadError('');
    setUploadingFileName('');
  };

  const copyHash = async (hash: string) => {
    const ok = await copyText(hash);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyDownloadUrl = async (mirror: ISOMirror) => {
    if (!mirror.downloadUrl) return;
    let url = getDownloadUrl(mirror);
    // 对于本地上传的文件，复制直连地址
    if (url.startsWith('/api/')) {
      const directBase = API_BASE || `http://${window.location.hostname}:3201`;
      url = `${directBase}${url}`;
    }
    const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    const ok = await copyText(fullUrl);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteMirror = (mirror: ISOMirror) => {
    if (!hasPermission('isos', 'delete')) return;
    if (!confirm(`确认删除镜像 ${mirror.name}？已上传到服务器的文件也会同步删除。`)) return;
    deleteISOMirror(mirror.id);
    setSelectedMirror(null);
  };

  return (
    <div className="min-h-screen bg-tbase pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{ backgroundColor: 'var(--brand-dim)', borderColor: 'var(--brand-dim-2)' }}>
                <Disc3 className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              </div>
              <span className="text-xs font-mono-data uppercase tracking-wider" style={{ color: 'var(--brand)' }}>
                ISO Center
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              <HackerText text="镜像中心" trigger="mount" />
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              管理系统ISO安装镜像，共 {mirrors.length} 个镜像，支持上传、下载和维护
            </p>
          </div>

          {hasPermission('isos', 'create') && (
            <button onClick={() => setShowUpload(true)} className="liquid-cta-btn py-3 px-5 text-sm">
              <Upload className="w-4 h-4 mr-2" />
              上传镜像
            </button>
          )}
        </div>

        {/* Category tabs + Search */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={() => setActiveCategory('all')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all border"
            style={{
              backgroundColor: activeCategory === 'all' ? 'var(--brand-dim)' : 'var(--bg-card)',
              borderColor: activeCategory === 'all' ? 'var(--brand-dim-2)' : 'var(--border)',
              color: activeCategory === 'all' ? 'var(--brand)' : 'var(--text-secondary)',
            }}
          >
            全部 ({mirrors.length})
          </button>

          {categories.map(cat => {
            const CatIcon = CATEGORY_ICONS[cat.icon] || Disc3;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border"
                style={{
                  backgroundColor: active ? cat.color + '15' : 'var(--bg-card)',
                  borderColor: active ? cat.color + '40' : 'var(--border)',
                  color: active ? cat.color : 'var(--text-secondary)',
                }}
              >
                <CatIcon className="w-4 h-4" />
                {cat.name} ({cat.isoCount})
              </button>
            );
          })}

          <div className="flex-1 max-w-xs ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索镜像、标签..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm input-field"
              />
            </div>
          </div>
        </div>

        {/* ISO Grid */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMirrors.map(mirror => {
            const cat = getCategory(mirror.categoryId);
            const statusCfg = STATUS_CONFIG[mirror.status];
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={mirror.id}
                className="iso-card group p-6 rounded-2xl card-surface cursor-pointer"
                onClick={() => setSelectedMirror(mirror)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center border transition-all"
                    style={{
                      backgroundColor: cat ? cat.color + '10' : 'var(--brand-dim)',
                      borderColor: cat ? cat.color + '25' : 'var(--brand-dim-2)',
                    }}>
                    {cat && (() => {
                      const CatIcon = CATEGORY_ICONS[cat.icon] || Disc3;
                      return <CatIcon className="w-5 h-5" style={{ color: cat.color }} />;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    {cat && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ color: cat.color, backgroundColor: cat.color + '15' }}>
                        {cat.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ color: statusCfg.color, backgroundColor: statusCfg.color + '15' }}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <h3 className="font-semibold text-base mb-1.5 transition-colors group-hover:text-amax"
                  style={{ color: 'var(--text-primary)' }}>
                  {mirror.name}
                </h3>
                <p className="text-sm mb-4 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {mirror.description}
                </p>

                {/* Meta */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {mirror.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-mono-data"
                      style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {mirror.size}
                    </span>
                    <span className="font-mono-data">{mirror.architecture}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--brand)' }}>
                      <Download className="w-3 h-3" />
                      {mirror.downloads.toLocaleString()}
                    </span>
                    <ChevronRight className="w-4 h-4 transition-all group-hover:translate-x-1"
                      style={{ color: 'var(--brand)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMirrors.length === 0 && (
          <div className="py-20 text-center">
            <Disc3 className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>未找到匹配的镜像</p>
          </div>
        )}
      </div>

      {/* ---- Detail Modal ---- */}
      {selectedMirror && (() => {
        const mirror = selectedMirror;
        const cat = getCategory(mirror.categoryId);
        const statusCfg = STATUS_CONFIG[mirror.status];
        const StatusIcon = statusCfg.icon;
        const canDownload = mirror.status === 'active' && Boolean(mirror.downloadUrl);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 modal-backdrop" onClick={() => setSelectedMirror(null)} />
            <div className="relative w-full max-w-2xl rounded-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hover)' }}>
              <div className="p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border"
                      style={{ backgroundColor: cat ? cat.color + '15' : 'var(--brand-dim)', borderColor: cat ? cat.color + '30' : 'var(--brand-dim-2)' }}>
                      {cat && (() => {
                        const CatIcon = CATEGORY_ICONS[cat.icon] || Disc3;
                        return <CatIcon className="w-6 h-6" style={{ color: cat.color }} />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{mirror.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        {cat && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ color: cat.color, backgroundColor: cat.color + '15' }}>
                            {cat.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ color: statusCfg.color, backgroundColor: statusCfg.color + '15' }}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedMirror(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                    <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {mirror.description}
                </p>

                {/* Meta grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: '版本', value: mirror.version, icon: Tag },
                    { label: '架构', value: mirror.architecture, icon: HardDrive },
                    { label: '大小', value: mirror.size, icon: Disc3 },
                    { label: '发布日期', value: mirror.uploadDate, icon: Calendar },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <item.icon className="w-3.5 h-3.5 mb-1.5" style={{ color: 'var(--brand)' }} />
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                      <p className="text-xs font-medium font-mono-data" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Hashes */}
                <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                    <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <Hash className="w-3.5 h-3.5" />
                      校验信息
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>MD5</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono-data flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{mirror.md5}</code>
                        <button onClick={() => copyHash(mirror.md5)}
                          className="px-2 py-1 rounded-md text-[10px] transition-colors flex-shrink-0"
                          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                          {copied ? <Check className="w-3 h-3 text-amax" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>SHA256</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono-data flex-1 break-all" style={{ color: 'var(--text-secondary)' }}>{mirror.sha256}</code>
                        <button onClick={() => copyHash(mirror.sha256)}
                          className="px-2 py-1 rounded-md text-[10px] transition-colors flex-shrink-0"
                          style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                          {copied ? <Check className="w-3 h-3 text-amax" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {mirror.notes && (
                  <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                      <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                        <FileText className="w-3.5 h-3.5" />
                        备注
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{mirror.notes}</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {mirror.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg text-xs font-mono-data flex items-center gap-1"
                      style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Footer meta */}
                <div className="flex items-center gap-4 mb-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {mirror.uploadBy}
                  </span>
                  <span>更新于 {mirror.lastUpdated}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button onClick={() => handleDownload(mirror)} disabled={!canDownload} className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download className="w-4 h-4 mr-2" />
                    {mirror.status === 'active' ? '下载镜像' : '审核通过后开放下载'}
                  </button>
                  <button
                    onClick={() => copyDownloadUrl(mirror)}
                    disabled={!canDownload}
                    className="px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ color: copied ? 'var(--brand)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    title="复制下载地址"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? '已复制' : '复制地址'}</span>
                  </button>
                  {hasPermission('isos', 'delete') && (
                    <button
                      onClick={() => handleDeleteMirror(mirror)}
                      className="px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 hover:bg-tdf/10"
                      style={{ color: 'var(--status-failed)', border: '1px solid var(--border)' }}
                      title="删除镜像"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>删除</span>
                    </button>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    已下载 {mirror.downloads.toLocaleString()} 次
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ---- Upload Modal ---- */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 modal-backdrop" onClick={() => setShowUpload(false)} />
          <div className="relative w-full max-w-lg rounded-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hover)' }}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>上传ISO镜像</h2>
                <button onClick={() => setShowUpload(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>镜像名称 *</label>
                    <input type="text" value={uploadForm.name}
                      onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm input-field" placeholder="例如: Ubuntu Server 24.04" />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>版本 *</label>
                    <input type="text" value={uploadForm.version}
                      onChange={e => setUploadForm(p => ({ ...p, version: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm input-field" placeholder="24.04" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>分类</label>
                    <select value={uploadForm.categoryId}
                      onChange={e => setUploadForm(p => ({ ...p, categoryId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm input-field appearance-none">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>架构</label>
                    <select value={uploadForm.architecture}
                      onChange={e => setUploadForm(p => ({ ...p, architecture: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm input-field appearance-none">
                      {['x86_64', 'amd64', 'aarch64', 'x64'].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>描述</label>
                  <textarea value={uploadForm.description}
                    onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl text-sm input-field resize-none"
                    placeholder="描述该ISO镜像的用途和特点..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>大小</label>
                    <input type="text" value={uploadForm.size}
                      onChange={e => setUploadForm(p => ({ ...p, size: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm input-field" placeholder="2.63 GB" />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>标签</label>
                    <input type="text" value={uploadForm.tags}
                      onChange={e => setUploadForm(p => ({ ...p, tags: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl text-sm input-field" placeholder="ubuntu, lts, server" />
                  </div>
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>MD5</label>
                  <input type="text" value={uploadForm.md5}
                    onChange={e => setUploadForm(p => ({ ...p, md5: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm input-field font-mono-data" placeholder="e8c6c8e5f2d3a1b4..." />
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>SHA256</label>
                  <input type="text" value={uploadForm.sha256}
                    onChange={e => setUploadForm(p => ({ ...p, sha256: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm input-field font-mono-data" placeholder="a1b2c3d4e5f67890..." />
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>备注</label>
                  <textarea value={uploadForm.notes}
                    onChange={e => setUploadForm(p => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl text-sm input-field resize-none"
                    placeholder="安装注意事项、兼容性说明..." />
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>下载地址</label>
                  <input type="text" value={uploadForm.downloadUrl}
                    onChange={e => setUploadForm(p => ({ ...p, downloadUrl: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm input-field"
                    placeholder="可粘贴外部 ISO 下载地址，或上传本地 ISO 自动生成" />
                </div>

                <div>
                  <label className="text-xs block mb-1.5" style={{ color: 'var(--text-muted)' }}>上传ISO文件</label>
                  {uploadForm.fileName && (
                    <p className="text-xs mb-2 font-mono-data" style={{ color: 'var(--brand)' }}>已选择：{uploadForm.fileName}</p>
                  )}
                  <FileDropZone
                    onFileSelect={handleUploadFileSelect}
                    maxSizeText="最大文件大小: 2 GB"
                    progress={uploadProgress}
                    uploadingFileName={uploadingFileName}
                    error={uploadError}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button onClick={() => setShowUpload(false)}
                  className="flex-1 px-5 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                  取消
                </button>
                <button onClick={handleUpload}
                  disabled={!uploadForm.name || !uploadForm.version || Boolean(uploadingFileName)}
                  className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploadingFileName ? '文件上传中...' : '上传镜像'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
