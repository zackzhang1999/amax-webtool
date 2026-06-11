import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  AppWindow,
  Search,
  Upload,
  Download,
  Tag,
  User,
  Calendar,
  HardDrive,
  Hash,
  FileText,
  X,
  Copy,
  Check,
  Stethoscope,
  Monitor,
  Workflow,
  ShieldCheck,
  Activity,
  GitCompare,
  Globe,
  Lock,
  Scan,
  Network,
  Plus,
  Package,
} from 'lucide-react';
import HackerText from '@/components/HackerText';
import FileDropZone from '@/components/FileDropZone';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import type { SoftwareTool, ToolCategory } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function uploadSoftwareFile(file: File) {
  const res = await fetch(`${API_BASE}/api/uploads/firmware?name=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new Error('上传工具文件失败');
  return await res.json() as { originalName: string; size: number; md5: string; downloadUrl: string };
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getDownloadUrl(tool: SoftwareTool) {
  if (!tool.downloadUrl) return '';
  const baseUrl = tool.downloadUrl.startsWith('http') ? tool.downloadUrl : `${API_BASE}${tool.downloadUrl}`;
  if (!tool.fileName) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}name=${encodeURIComponent(tool.fileName)}`;
}

function getDirectDownloadUrl(url: string) {
  if (!url.startsWith('/api/')) return url;
  const directBase = API_BASE || `http://${window.location.hostname}:3201`;
  return `${directBase}${url}`;
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

const categoryConfig: Record<ToolCategory, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  diagnostic: { label: '诊断工具', color: 'text-cyan-500', bg: 'bg-cyan-500/10', icon: Stethoscope },
  automation: { label: '自动化', color: 'text-amax', bg: 'bg-amax/10', icon: Workflow },
  security: { label: '安全工具', color: 'text-tdf', bg: 'bg-tdf/10', icon: ShieldCheck },
  utility: { label: '实用工具', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Monitor },
  monitoring: { label: '监控工具', color: 'text-tdp', bg: 'bg-tdp/10', icon: Activity },
};

const iconMap: Record<string, React.ElementType> = {
  Stethoscope, Monitor, Workflow, ShieldCheck, Activity, GitCompare, Globe, Lock, Scan, Network,
};

export default function SoftwareHub() {
  const { softwareTools: tools, addSoftwareTool, updateSoftwareTool } = useData();
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ToolCategory | 'all'>('all');
  const [selectedTool, setSelectedTool] = useState<SoftwareTool | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: 'utility' as ToolCategory,
    version: '',
    author: '',
    tags: '',
    readme: '',
    fileName: '',
    downloadUrl: '',
    size: '',
    md5: '',
  });

  useEffect(() => {
    if (cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll('.tool-card');
      gsap.fromTo(
        cards,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' }
      );
    }
  }, [tools, categoryFilter, searchQuery]);

  const filteredTools = tools.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    return true;
  });

  const currentSelectedTool = selectedTool ? tools.find(t => t.id === selectedTool.id) || selectedTool : null;

  const handleDownload = (tool: SoftwareTool) => {
    if ((tool.status || 'active') !== 'active') {
      alert('该工具还未通过审核，审核通过后才能下载。');
      return;
    }
    if (!tool.downloadUrl) {
      alert('该工具暂无可下载附件，请先在工具管理中上传附件。');
      return;
    }

    const downloadUrl = getDirectDownloadUrl(getDownloadUrl(tool));
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.rel = 'noopener noreferrer';

    if (/^https?:\/\//i.test(downloadUrl) && !downloadUrl.startsWith(window.location.origin) && !downloadUrl.startsWith(API_BASE || window.location.origin)) {
      a.target = '_blank';
    } else {
      a.download = tool.fileName || `${tool.name}_v${tool.version}`;
    }

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    updateSoftwareTool(tool.id, { downloads: tool.downloads + 1 });
  };

  const handleSoftwareFileSelect = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const uploaded = await uploadSoftwareFile(file);
      setUploadForm(prev => ({
        ...prev,
        fileName: uploaded.originalName,
        downloadUrl: uploaded.downloadUrl,
        size: formatFileSize(uploaded.size),
        md5: uploaded.md5,
      }));
    } catch (error) {
      console.error('上传工具文件失败', error);
    }
  };

  const handleUpload = () => {
    if (!uploadForm.name || !uploadForm.version) return;
    addSoftwareTool({
      name: uploadForm.name,
      description: uploadForm.description,
      category: uploadForm.category,
      version: uploadForm.version,
      author: uploadForm.author || 'anonymous',
      publishDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0],
      downloads: 0,
      size: uploadForm.size || '0 MB',
      md5: uploadForm.md5 || 'pending',
      tags: uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      readme: uploadForm.readme || '# ' + uploadForm.name + '\n\n暂无详细说明。',
      status: 'pending',
      fileName: uploadForm.fileName,
      downloadUrl: uploadForm.downloadUrl,
      icon: 'Package',
    });
    setShowUpload(false);
    setUploadForm({ name: '', description: '', category: 'utility', version: '', author: '', tags: '', readme: '', fileName: '', downloadUrl: '', size: '', md5: '' });
  };

  const copyReadme = async () => {
    if (!currentSelectedTool) return;
    const ok = await copyText(currentSelectedTool.readme || '');
    if (!ok) {
      alert('复制失败，请手动选择 README 内容复制');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-tbase pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amax/10 flex items-center justify-center border border-amax/20">
                <AppWindow className="w-5 h-5 text-amax" />
              </div>
              <span className="text-xs text-amax font-mono-data uppercase tracking-wider">
                Software Hub
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              <HackerText text="软件中心" trigger="mount" />
            </h1>
            <p className="text-ts">
              发布、下载和管理运维工具集。共 {tools.length} 个实用工具
            </p>
          </div>

          {hasPermission('software', 'create') && (
            <button
              onClick={() => setShowUpload(true)}
              className="liquid-cta-btn py-3 px-5 text-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              发布工具
            </button>
          )}
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工具、标签..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === 'all'
                  ? 'bg-amax/10 text-amax border border-amax/20'
                  : 'text-tm hover:text-tp bg-white/[0.02] border border-transparent hover:border-white/10'
              }`}
            >
              全部
            </button>
            {(Object.entries(categoryConfig) as [ToolCategory, typeof categoryConfig[ToolCategory]][]).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    categoryFilter === key
                      ? `${config.bg} ${config.color} border-current/20`
                      : 'text-tm hover:text-tp bg-white/[0.02] border-transparent hover:border-white/10'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools Grid */}
        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTools.map(tool => {
            const catConfig = categoryConfig[tool.category];
            const CatIcon = catConfig.icon;
            const ToolIcon = iconMap[tool.icon] || Package;

            return (
              <div
                key={tool.id}
                className="tool-card group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amax/20 hover:bg-white/[0.04] transition-all cursor-pointer"
                onClick={() => setSelectedTool(tool)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-amax/5 flex items-center justify-center border border-[#36F4C2]/10 group-hover:border-amax/30 group-hover:bg-amax/10 transition-all">
                    <ToolIcon className="w-5 h-5 text-amax" />
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${catConfig.bg} ${catConfig.color}`}>
                    <CatIcon className="w-2.5 h-2.5" />
                    {catConfig.label}
                  </span>
                </div>

                {/* Info */}
                <h3 className="text-white font-semibold text-base mb-1.5 group-hover:text-amax transition-colors">
                  {tool.name}
                </h3>
                <p className="text-sm text-ts mb-4 line-clamp-2 leading-relaxed">
                  {tool.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tool.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 text-[10px] text-tm font-mono-data">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3 text-xs text-tm">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {tool.author}
                    </span>
                    <span className="font-mono-data">v{tool.version}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-amax">
                    <Download className="w-3 h-3" />
                    {tool.downloads.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
          <div className="py-20 text-center">
            <Search className="w-12 h-12 text-tm mx-auto mb-4" />
            <p className="text-ts">未找到匹配的工具</p>
          </div>
        )}
      </div>

      {/* Tool Detail Modal */}
      {currentSelectedTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedTool(null)} />
          <div className="relative w-full max-w-2xl rounded-3xl bg-tsurface border border-white/10 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amax/10 flex items-center justify-center border border-amax/20">
                    {(() => {
                      const Icon = iconMap[currentSelectedTool.icon] || Package;
                      return <Icon className="w-6 h-6 text-amax" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{currentSelectedTool.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${categoryConfig[currentSelectedTool.category].bg} ${categoryConfig[currentSelectedTool.category].color}`}>
                        {categoryConfig[currentSelectedTool.category].label}
                      </span>
                      <span className="text-xs text-tm font-mono-data">v{currentSelectedTool.version}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTool(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-tm" />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-ts mb-6 leading-relaxed">
                {currentSelectedTool.description}
              </p>

              {/* Meta grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <User className="w-3.5 h-3.5 text-amax mb-1.5" />
                  <p className="text-[10px] text-tm">作者</p>
                  <p className="text-xs text-white">{currentSelectedTool.author}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <Calendar className="w-3.5 h-3.5 text-amax mb-1.5" />
                  <p className="text-[10px] text-tm">发布日期</p>
                  <p className="text-xs text-white">{currentSelectedTool.publishDate}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <HardDrive className="w-3.5 h-3.5 text-amax mb-1.5" />
                  <p className="text-[10px] text-tm">文件大小</p>
                  <p className="text-xs text-white font-mono-data">{currentSelectedTool.size}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <Hash className="w-3.5 h-3.5 text-amax mb-1.5" />
                  <p className="text-[10px] text-tm">MD5</p>
                  <p className="text-xs text-white font-mono-data truncate">{currentSelectedTool.md5}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {currentSelectedTool.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-ts font-mono-data flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>

              {/* README */}
              <div className="rounded-xl bg-tbase border border-white/5 overflow-hidden mb-6">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <span className="text-xs text-ts flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    README
                  </span>
                  <button
                    onClick={copyReadme}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] border border-white/10 text-[10px] text-tm hover:text-tp transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-amax" /> : <Copy className="w-3 h-3" />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <div className="p-4 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-ts font-mono-data whitespace-pre-wrap leading-relaxed">
                    {currentSelectedTool.readme}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownload(currentSelectedTool)}
                  className="flex-1 liquid-cta-btn py-3 text-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {(currentSelectedTool.status || 'active') !== 'active' ? '审核通过后开放下载' : currentSelectedTool.downloadUrl ? '下载工具' : '暂无可下载文件'}
                </button>
                <span className="text-xs text-tm">
                  已下载 {currentSelectedTool.downloads.toLocaleString()} 次
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
          <div className="relative w-full max-w-lg rounded-3xl bg-tsurface border border-white/10 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amax" />
                  发布新工具
                </h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-tm" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-tm mb-1.5 block">工具名称</label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30"
                    placeholder="例如: Server Health Monitor"
                  />
                </div>

                <div>
                  <label className="text-xs text-tm mb-1.5 block">描述</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full h-20 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 resize-none"
                    placeholder="简要描述工具的功能和用途..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-tm mb-1.5 block">分类</label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value as ToolCategory }))}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-amax/30"
                    >
                      {(Object.entries(categoryConfig) as [ToolCategory, typeof categoryConfig[ToolCategory]][]).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-tm mb-1.5 block">版本</label>
                    <input
                      type="text"
                      value={uploadForm.version}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, version: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30"
                      placeholder="1.0.0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-tm mb-1.5 block">作者</label>
                  <input
                    type="text"
                    value={uploadForm.author}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30"
                    placeholder="用户名"
                  />
                </div>

                <div>
                  <label className="text-xs text-tm mb-1.5 block">标签 (逗号分隔)</label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div>
                  <label className="text-xs text-tm mb-1.5 block">README / 使用说明</label>
                  <textarea
                    value={uploadForm.readme}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, readme: e.target.value }))}
                    className="w-full h-24 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 resize-none"
                    placeholder="# 工具名称\n\n## 使用方法\n..."
                  />
                </div>

                <div>
                  <label className="text-xs text-tm mb-1.5 block">上传文件</label>
                  {uploadForm.fileName && (
                    <p className="text-xs text-amax mb-2 font-mono-data">已选择：{uploadForm.fileName}</p>
                  )}
                  <FileDropZone
                    onFileSelect={handleSoftwareFileSelect}
                    acceptAll
                    title="拖拽工具文件到此处"
                    hint="或点击浏览文件（文件类型不限）"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setShowUpload(false)}
                  className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-sm font-medium text-ts hover:text-tp hover:border-white/20 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadForm.name || !uploadForm.version}
                  className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  发布工具
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
