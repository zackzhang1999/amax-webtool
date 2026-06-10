import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  ArrowLeft,
  Cpu,
  HardDrive,
  Calendar,
  Hash,
  FileText,
  Edit3,
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Server,
  Shield,
  FileDown,
  Trash2,
} from 'lucide-react';
import HackerText from '@/components/HackerText';
import FileDropZone from '@/components/FileDropZone';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { getLatestBiosVersion, getLatestBmcVersionText } from '@/lib/firmware';
import type { FirmwareVersion, BmcVersion, DriverDownload, ManualDownload } from '@/types';

type ActiveTab = 'bios' | 'bmc' | 'driver' | 'manual';
const API_BASE = import.meta.env.VITE_API_BASE || '';

type FwOrBmc = FirmwareVersion | BmcVersion | DriverDownload | ManualDownload;

function getFirmwareVersionFromFileName(fileName: string) {
  return fileName.replace(/\.(rom|bin|cap|exe|zip|tar|gz|tgz|img|fd|pdf|doc|docx)$/i, '');
}

function isManualFile(file: File) {
  return /\.(pdf|doc|docx)$/i.test(file.name);
}

async function uploadFirmwareFile(file: File) {
  const res = await fetch(`${API_BASE}/api/uploads/firmware?name=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new Error('上传固件文件失败');
  return await res.json() as { originalName: string; storedName: string; size: number; md5: string; downloadUrl: string };
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getDownloadUrl(fw: FwOrBmc) {
  if (!fw.downloadUrl) return '';
  const baseUrl = fw.downloadUrl.startsWith('http') ? fw.downloadUrl : `${API_BASE}${fw.downloadUrl}`;
  if (!fw.fileName) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}name=${encodeURIComponent(fw.fileName)}`;
}

export default function FirmwareDetail() {
  const { id } = useParams<{ id: string }>();
  const {
    serverModels,
    updateModelNotes,
    addFirmware,
    addBmcVersion,
    updateFirmware,
    updateBmcVersion,
    addDriverDownload,
    deleteDriverDownload,
    addManualDownload,
    deleteManualDownload,
  } = useData();
  const { hasPermission } = useAuth();

  const model = serverModels.find((m) => m.id === id);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(model?.notes || '');
  const [activeTab, setActiveTab] = useState<ActiveTab>('bios');
  const [activeFirmware, setActiveFirmware] = useState<FwOrBmc | null>(null);
  const [editingFirmwareNoteId, setEditingFirmwareNoteId] = useState<string | null>(null);
  const [firmwareNoteDraft, setFirmwareNoteDraft] = useState('');
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (model) setNotes(model.notes);
  }, [model?.id, model?.notes]);

  useEffect(() => {
    if (detailRef.current) {
      gsap.fromTo(
        detailRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, []);

  if (!model) {
    return (
      <div className="min-h-screen bg-tbase flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-tdf mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">机型未找到</h2>
          <p className="text-ts mb-6">请求的服务器机型不存在或已被删除</p>
          <Link to="/models" className="text-amax hover:underline">
            返回机型库
          </Link>
        </div>
      </div>
    );
  }

  const getStatusDisplay = () => {
    switch (model.status) {
      case 'synced':
        return { label: '已同步', color: 'text-amax', bg: 'bg-amax/10', icon: CheckCircle2 };
      case 'pending':
        return { label: '待审核', color: 'text-tdp', bg: 'bg-tdp/10', icon: Clock };

    }
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  const handleDownload = async (fw: FwOrBmc) => {
    if (!fw.downloadUrl) return;
    if ('status' in fw && fw.status !== 'synced') return;
    try {
      const res = await fetch(getDownloadUrl(fw));
      if (!res.ok) throw new Error('下载固件失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fw.fileName || `${itemLabel}_${fw.version}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载固件失败', error);
    }
  };

  const handleSaveNotes = () => {
    updateModelNotes(model.id, notes);
    setEditingNotes(false);
  };

  const startEditFirmwareNote = (item: FwOrBmc) => {
    setEditingFirmwareNoteId(item.id);
    setFirmwareNoteDraft(item.changelog);
  };

  const saveFirmwareNote = (item: FwOrBmc) => {
    if (!('status' in item)) return;
    if ('bmcType' in item) {
      updateBmcVersion(model.id, item.id, { changelog: firmwareNoteDraft });
    } else {
      updateFirmware(model.id, item.id, { changelog: firmwareNoteDraft });
    }
    setEditingFirmwareNoteId(null);
    setFirmwareNoteDraft('');
  };

  const cancelEditFirmwareNote = () => {
    setEditingFirmwareNoteId(null);
    setFirmwareNoteDraft('');
  };

  const handleFileDrop = async (files: File[]) => {
    if (!files.length) return;
    const file = files[0];
    const isBmc = activeTab === 'bmc';
    const isDriver = activeTab === 'driver';
    const isManual = activeTab === 'manual';

    if (isManual && !isManualFile(file)) {
      alert('说明书仅支持 PDF、Word（.doc/.docx）格式');
      return;
    }

    try {
      const uploaded = await uploadFirmwareFile(file);
      if (isManual) {
        addManualDownload(model.id, {
          name: file.name,
          version: getFirmwareVersionFromFileName(file.name),
          releaseDate: new Date().toISOString().split('T')[0],
          md5: uploaded.md5,
          size: formatFileSize(uploaded.size),
          changelog: `从文件 ${uploaded.originalName} 上传`,
          fileName: uploaded.originalName,
          downloadUrl: uploaded.downloadUrl,
        });
        return;
      }
      if (isDriver) {
        addDriverDownload(model.id, {
          name: file.name,
          version: getFirmwareVersionFromFileName(file.name),
          releaseDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          md5: uploaded.md5,
          size: formatFileSize(uploaded.size),
          changelog: `从文件 ${uploaded.originalName} 上传`,
          fileName: uploaded.originalName,
          downloadUrl: uploaded.downloadUrl,
        });
        return;
      }

      const basePayload = {
        version: getFirmwareVersionFromFileName(file.name),
        releaseDate: new Date().toISOString().split('T')[0],
        status: 'pending' as const,
        md5: uploaded.md5,
        size: formatFileSize(uploaded.size),
        changelog: `从文件 ${uploaded.originalName} 上传`,
        fileName: uploaded.originalName,
        downloadUrl: uploaded.downloadUrl,
      };

      if (isBmc) {
        addBmcVersion(model.id, {
          ...basePayload,
          bmcType: model.bmcVersions[0]?.bmcType || 'Unknown',
        });
      } else {
        addFirmware(model.id, basePayload);
      }
    } catch (error) {
      console.error('上传固件文件失败', error);
    }
  };

  const currentItems: FwOrBmc[] = activeTab === 'bios' ? model.firmwares : activeTab === 'bmc' ? model.bmcVersions : activeTab === 'driver' ? (model.drivers || []) : (model.manuals || []);
  const itemLabel = activeTab === 'bios' ? 'BIOS' : activeTab === 'bmc' ? 'BMC' : activeTab === 'driver' ? '驱动' : '说明书';
  const latestBiosVersion = getLatestBiosVersion(model);
  const latestBmcVersion = getLatestBmcVersionText(model);
  const currentVer = activeTab === 'bios' ? latestBiosVersion : activeTab === 'bmc' ? latestBmcVersion : `${currentItems.length} 个`;
  const accentColor = activeTab === 'bios' ? '#36F4C2' : activeTab === 'bmc' ? '#D9A14C' : activeTab === 'driver' ? '#60A5FA' : '#A78BFA';

  return (
    <div ref={detailRef} className="min-h-screen bg-tbase pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          <Link to="/" className="text-tm hover:text-tp transition-colors">驾驶舱</Link>
          <ChevronRight className="w-3 h-3 text-tm" />
          <Link to="/models" className="text-tm hover:text-tp transition-colors">机型库</Link>
          <ChevronRight className="w-3 h-3 text-tm" />
          <span className="text-tp">{model.name}</span>
        </div>

        {/* Back button */}
        <Link
          to="/models"
          className="inline-flex items-center gap-2 text-sm text-ts hover:text-tp transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          返回机型库
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel - Model info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="firmware-detail-hero p-8 rounded-3xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
              <div
                className="firmware-detail-hero-image absolute inset-0 bg-cover bg-center opacity-10"
                style={{ backgroundImage: `url(${model.thumbnail})` }}
              />
              <div className="firmware-detail-hero-gradient absolute inset-0 bg-gradient-to-r from-[#050507] via-[#050507]/90 to-transparent" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                  <span className="text-xs text-tm font-mono-data">{model.modelNumber}</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  <HackerText text={model.name} trigger="mount" />
                </h1>

                {/* BIOS & BMC version badges */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amax/10 border border-amax/20 text-sm font-mono-data text-amax">
                    <Cpu className="w-3.5 h-3.5" />
                    BIOS: V.{latestBiosVersion}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tdp/10 border border-tdp/20 text-sm font-mono-data text-tdp">
                    <Shield className="w-3.5 h-3.5" />
                    BMC: V.{latestBmcVersion}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <Cpu className="w-4 h-4 text-amax mb-2" />
                    <p className="text-xs text-tm">平台类型</p>
                    <p className="text-sm text-white font-medium">{model.chipset}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <HardDrive className="w-4 h-4 text-amax mb-2" />
                    <p className="text-xs text-tm">CPU支持</p>
                    <p className="text-sm text-white font-medium truncate">{model.cpuSupport}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <Hash className="w-4 h-4 text-amax mb-2" />
                    <p className="text-xs text-tm">内存插槽</p>
                    <p className="text-sm text-white font-medium">{model.memorySlots} 槽</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <Calendar className="w-4 h-4 text-amax mb-2" />
                    <p className="text-xs text-tm">最后更新</p>
                    <p className="text-sm text-white font-medium">
                      {new Date(model.lastUpdated).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes section */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amax" />
                  备注
                </h3>
                <button
                  onClick={() => {
                    if (editingNotes) {
                      handleSaveNotes();
                    } else {
                      setEditingNotes(true);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-ts hover:text-tp hover:border-white/20 transition-all"
                >
                  {editingNotes ? (
                    <>
                      <Save className="w-3 h-3" />
                      保存
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3 h-3" />
                      编辑
                    </>
                  )}
                </button>
              </div>

              {editingNotes ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-32 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 resize-none"
                  placeholder="添加备注信息..."
                />
              ) : (
                <p className="text-sm text-ts leading-relaxed whitespace-pre-wrap">
                  {notes || '暂无备注'}
                </p>
              )}
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActiveTab('bios'); setActiveFirmware(null); }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === 'bios'
                    ? 'bg-amax/10 border-amax/20 text-amax'
                    : 'bg-white/[0.02] border-white/5 text-ts hover:text-tp hover:border-white/10'
                }`}
              >
                <Cpu className="w-4 h-4" />
                <span>BIOS 固件</span>
                <span className="ml-1 text-xs font-mono-data opacity-60">({model.firmwares.length})</span>
              </button>
              <button
                onClick={() => { setActiveTab('bmc'); setActiveFirmware(null); }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === 'bmc'
                    ? 'bg-tdp/10 border-tdp/20 text-tdp'
                    : 'bg-white/[0.02] border-white/5 text-ts hover:text-tp hover:border-white/10'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>BMC 固件</span>
                <span className="ml-1 text-xs font-mono-data opacity-60">({model.bmcVersions.length})</span>
              </button>
              <button
                onClick={() => { setActiveTab('driver'); setActiveFirmware(null); }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === 'driver'
                    ? 'bg-blue-500/10 border-blue-400/20 text-blue-400'
                    : 'bg-white/[0.02] border-white/5 text-ts hover:text-tp hover:border-white/10'
                }`}
              >
                <FileDown className="w-4 h-4" />
                <span>驱动下载</span>
                <span className="ml-1 text-xs font-mono-data opacity-60">({model.drivers?.length || 0})</span>
              </button>
              <button
                onClick={() => { setActiveTab('manual'); setActiveFirmware(null); }}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border ${
                  activeTab === 'manual'
                    ? 'bg-purple-500/10 border-purple-400/20 text-purple-400'
                    : 'bg-white/[0.02] border-white/5 text-ts hover:text-tp hover:border-white/10'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>说明书下载</span>
                <span className="ml-1 text-xs font-mono-data opacity-60">({model.manuals?.length || 0})</span>
              </button>
            </div>

            {/* Firmware / BMC version list */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  {activeTab === 'bios' ? (
                    <Cpu className="w-5 h-5" style={{ color: accentColor }} />
                  ) : activeTab === 'bmc' ? (
                    <Shield className="w-5 h-5" style={{ color: accentColor }} />
                  ) : activeTab === 'driver' ? (
                    <FileDown className="w-5 h-5" style={{ color: accentColor }} />
                  ) : (
                    <FileText className="w-5 h-5" style={{ color: accentColor }} />
                  )}
                  <span style={{ color: activeTab === 'bmc' ? '#D9A14C' : activeTab === 'driver' ? '#60A5FA' : activeTab === 'manual' ? '#A78BFA' : '#fff' }}>
                    {itemLabel} 版本历史
                  </span>
                </h3>
                <span className="text-xs text-tm font-mono-data">
                  {activeTab === 'driver' ? `共 ${currentVer}` : `当前: V.${currentVer}`}
                </span>
              </div>

              <div className="space-y-3">
                {currentItems.map((item) => {
                  const isBmc = 'bmcType' in item;
                  const canDownload = Boolean(item.downloadUrl) && (!('status' in item) || item.status === 'synced');
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveFirmware(activeFirmware?.id === item.id ? null : item)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        activeFirmware?.id === item.id
                          ? activeTab === 'bios'
                            ? 'border-amax/30 bg-amax/5'
                            : 'border-[#D9A14C]/30 bg-tdp/5'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            'status' in item
                              ? item.status === 'synced'
                                ? 'bg-amax'
                                : 'bg-[#D9A14C]'
                              : 'bg-blue-400'
                          }`} />
                          <span className="font-mono-data text-sm text-white font-medium">
                            {'name' in item ? item.name : `V.${item.version}`}
                          </span>
                          <span className="text-xs text-tm">
                            {new Date(item.releaseDate).toLocaleDateString('zh-CN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-tm font-mono-data">{item.size}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(item);
                            }}
                            disabled={!canDownload}
                            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-amax/10 hover:border-amax/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/[0.03] disabled:hover:border-white/10"
                            title={canDownload ? `下载${itemLabel}` : ('status' in item && item.status !== 'synced' ? '审核通过后开放下载' : '暂无可下载文件')}
                          >
                            <Download className="w-4 h-4" style={{ color: accentColor }} />
                          </button>
                          {(activeTab === 'driver' || activeTab === 'manual') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeTab === 'driver') deleteDriverDownload(model.id, item.id);
                                else deleteManualDownload(model.id, item.id);
                              }}
                              className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-tdf/10 hover:border-tdf/30 transition-all"
                              title="删除驱动"
                            >
                              <Trash2 className="w-4 h-4 text-tdf" />
                            </button>
                          )}
                        </div>
                      </div>

                      {activeFirmware?.id === item.id && (
                        <div className="mt-4 pt-4 border-t border-white/5 animate-slide-up">
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-tm">固件备注</p>
                              {hasPermission('models', 'edit') && activeTab !== 'driver' && 'status' in item && editingFirmwareNoteId !== item.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditFirmwareNote(item);
                                  }}
                                  className="text-xs text-amax hover:underline"
                                >
                                  编辑备注
                                </button>
                              )}
                            </div>
                            {editingFirmwareNoteId === item.id ? (
                              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                <textarea
                                  value={firmwareNoteDraft}
                                  onChange={(e) => setFirmwareNoteDraft(e.target.value)}
                                  className="w-full h-24 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 resize-none"
                                  placeholder="填写固件备注..."
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={cancelEditFirmwareNote} className="px-3 py-1.5 rounded-lg text-xs text-tm hover:bg-white/5">
                                    取消
                                  </button>
                                  <button onClick={() => saveFirmwareNote(item)} className="px-3 py-1.5 rounded-lg text-xs text-amax bg-amax/10 hover:bg-amax/15">
                                    保存
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-ts whitespace-pre-wrap">{item.changelog || '暂无备注'}</p>
                            )}
                          </div>
                          {isBmc && (
                            <div className="flex items-center gap-4 mb-2 text-xs">
                              <span className="flex items-center gap-1 text-tdp">
                                <Server className="w-3 h-3" />
                                {(item as BmcVersion).bmcType}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs text-tm font-mono-data">
                            <Hash className="w-3 h-3" />
                            MD5: {item.md5}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right panel - Upload */}
          {hasPermission('models', 'create') && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 sticky top-28">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Upload className="w-5 h-5" style={{ color: accentColor }} />
                  上传新{itemLabel}
                </h3>
                <p className="text-xs text-tm mb-6">
                  上传 {model.name} 的新{itemLabel}固件版本
                </p>

                <FileDropZone
                  onFileSelect={handleFileDrop}
                  acceptAll={activeTab === 'driver'}
                  accept={activeTab === 'manual' ? '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document' : undefined}
                  title={activeTab === 'driver' ? '拖拽驱动文件到此处' : activeTab === 'manual' ? '拖拽说明书文件到此处' : '拖拽固件文件到此处'}
                  hint={activeTab === 'driver' ? '或点击浏览文件（文件类型不限）' : activeTab === 'manual' ? '或点击浏览文件（PDF、Word）' : '或点击浏览文件 (.rom, .bin, .cap, .hpm, .iso)'}
                />

                <div className="mt-6 p-4 rounded-xl bg-amax/5 border border-[#36F4C2]/10">
                  <p className="text-xs text-amax font-medium mb-1">上传须知</p>
                  <ul className="text-xs text-ts space-y-1 list-disc list-inside">
                    <li>{activeTab === 'driver' ? '驱动文件类型不限' : activeTab === 'manual' ? '说明书支持 PDF、Word（.doc/.docx）格式' : activeTab === 'bios' ? 'BIOS 支持 .rom, .bin, .cap, .hpm 格式' : 'BMC 支持 .rom, .bin, .cap 格式'}</li>
                    {activeTab !== 'manual' && <li>上传前请验证MD5校验</li>}
                    {activeTab !== 'driver' && activeTab !== 'manual' && <li>新上传的固件需审核后才能部署</li>}
                    {activeTab === 'bmc' && (
                      <li>BMC更新可能导致远程管理断开</li>
                    )}
                    <li>建议在维护窗口期上传</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
