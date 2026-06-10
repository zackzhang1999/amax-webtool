import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  ServerModel, FirmwareVersion, BmcVersion, DriverDownload, ManualDownload, AuditLog,
  SoftwareTool, ISOMirror, ISOCategory, Brand, ToolCategoryConfig,
} from '@/types';
import {
  serverModels as DEFAULT_MODELS,
  auditLogs as DEFAULT_LOGS,
  softwareTools as DEFAULT_TOOLS,
  isoMirrors as DEFAULT_ISOS,
  isoCategories as DEFAULT_ISO_CATS,
  brands as DEFAULT_BRANDS,
  categoryConfigs as DEFAULT_CATEGORIES,
} from '@/data/mockData';

/* ---------- API helpers ---------- */
const API_BASE = import.meta.env.VITE_API_BASE || '';
const DATA_ENDPOINT = `${API_BASE}/api/data`;

async function fetchServerData(): Promise<StoredData | null | undefined> {
  try {
    const res = await fetch(DATA_ENDPOINT);
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  }
}

async function persistServerData(data: StoredData) {
  await fetch(DATA_ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

function isUploadedFileUrl(downloadUrl?: string) {
  if (!downloadUrl) return false;
  const pathPart = downloadUrl.split('?')[0];
  if (pathPart.startsWith('/api/uploads/firmware/')) return true;
  if (API_BASE && pathPart.startsWith(`${API_BASE}/api/uploads/firmware/`)) return true;
  return false;
}

function getStoredNameFromDownloadUrl(downloadUrl?: string) {
  if (!downloadUrl) return '';
  const pathPart = downloadUrl.split('?')[0];
  const storedName = pathPart.split('/').pop();
  return storedName ? decodeURIComponent(storedName) : '';
}

async function deleteUploadedFile(downloadUrl?: string) {
  if (!isUploadedFileUrl(downloadUrl)) return;
  const storedName = getStoredNameFromDownloadUrl(downloadUrl);
  if (!storedName) return;
  try {
    await fetch(`${API_BASE}/api/uploads/firmware/${encodeURIComponent(storedName)}`, { method: 'DELETE' });
  } catch (error) {
    console.error('删除服务器文件失败', error);
  }
}

function getDefaultData(): StoredData {
  return {
    serverModels: DEFAULT_MODELS,
    auditLogs: DEFAULT_LOGS,
    softwareTools: DEFAULT_TOOLS,
    isoMirrors: DEFAULT_ISOS,
    isoCategories: DEFAULT_ISO_CATS,
    brands: DEFAULT_BRANDS,
    categories: DEFAULT_CATEGORIES,
  };
}

function normalizeData(data: Partial<StoredData> | null | undefined): StoredData {
  return {
    serverModels: (data?.serverModels ?? DEFAULT_MODELS).map((model) => ({
      ...model,
      drivers: (model.drivers || []).map((driver) => ({ ...driver, status: driver.status || 'pending' })),
      manuals: model.manuals || [],
    })),
    auditLogs: data?.auditLogs ?? DEFAULT_LOGS,
    softwareTools: data?.softwareTools ?? DEFAULT_TOOLS,
    isoMirrors: data?.isoMirrors ?? DEFAULT_ISOS,
    isoCategories: data?.isoCategories ?? DEFAULT_ISO_CATS,
    brands: data?.brands ?? DEFAULT_BRANDS,
    categories: data?.categories ?? DEFAULT_CATEGORIES,
  };
}

interface StoredData {
  serverModels: ServerModel[];
  auditLogs: AuditLog[];
  softwareTools: SoftwareTool[];
  isoMirrors: ISOMirror[];
  isoCategories: ISOCategory[];
  brands: Brand[];
  categories: ToolCategoryConfig[];
}

/* ---------- Context type ---------- */
interface DataContextValue {
  serverModels: ServerModel[];
  addServerModel: (model: Omit<ServerModel, 'id'>) => ServerModel;
  updateServerModel: (id: string, updates: Partial<ServerModel>) => void;
  deleteServerModel: (id: string) => void;
  addFirmware: (modelId: string, fw: Omit<FirmwareVersion, 'id'>) => void;
  updateFirmware: (modelId: string, fwId: string, updates: Partial<FirmwareVersion>) => void;
  deleteFirmware: (modelId: string, fwId: string) => void;
  addBmcVersion: (modelId: string, bmc: Omit<BmcVersion, 'id'>) => void;
  updateBmcVersion: (modelId: string, bmcId: string, updates: Partial<BmcVersion>) => void;
  deleteBmcVersion: (modelId: string, bmcId: string) => void;
  addDriverDownload: (modelId: string, driver: Omit<DriverDownload, 'id'>) => void;
  updateDriverDownload: (modelId: string, driverId: string, updates: Partial<DriverDownload>) => void;
  deleteDriverDownload: (modelId: string, driverId: string) => void;
  addManualDownload: (modelId: string, manual: Omit<ManualDownload, 'id'>) => void;
  deleteManualDownload: (modelId: string, manualId: string) => void;
  updateModelNotes: (modelId: string, notes: string) => void;

  auditLogs: AuditLog[];
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;

  softwareTools: SoftwareTool[];
  addSoftwareTool: (tool: Omit<SoftwareTool, 'id'>) => SoftwareTool;
  updateSoftwareTool: (id: string, updates: Partial<SoftwareTool>) => void;
  deleteSoftwareTool: (id: string) => void;

  isoMirrors: ISOMirror[];
  isoCategories: ISOCategory[];
  addISOMirror: (mirror: Omit<ISOMirror, 'id'>) => ISOMirror;
  updateISOMirror: (id: string, updates: Partial<ISOMirror>) => void;
  deleteISOMirror: (id: string) => void;
  updateISOCategory: (id: string, updates: Partial<ISOCategory>) => void;
  addISOCategory: (cat: Omit<ISOCategory, 'id'>) => ISOCategory;
  deleteISOCategory: (id: string) => void;

  brands: Brand[];
  addBrand: (brand: Omit<Brand, 'id'>) => Brand;
  updateBrand: (id: string, updates: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;

  categories: ToolCategoryConfig[];
  addCategory: (cat: Omit<ToolCategoryConfig, 'id'>) => ToolCategoryConfig;
  updateCategory: (id: string, updates: Partial<ToolCategoryConfig>) => void;
  deleteCategory: (id: string) => void;

  resetAllData: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoredData>(getDefaultData);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchServerData().then(async (serverData) => {
      if (cancelled) return;
      if (serverData) {
        setData(normalizeData(serverData));
        setLoaded(true);
        return;
      }

      if (serverData === null) {
        const initial = getDefaultData();
        setData(initial);
        await persistServerData(initial);
        setLoaded(true);
        return;
      }

      console.error('后端数据服务不可用，已停止写入默认演示数据');
      setLoadError(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persistServerData(data).catch((error) => {
      console.error('保存数据到 SQLite 失败', error);
    });
  }, [data, loaded]);

  /* ---------- Server Models ---------- */
  const addServerModel = useCallback(
    (model: Omit<ServerModel, 'id'>): ServerModel => {
      const newModel: ServerModel = {
        ...model,
        id: `srv-${String(data.serverModels.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`,
      };
      setData((prev) => ({
        ...prev,
        serverModels: [...prev.serverModels, newModel],
        auditLogs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'upload',
            user: 'admin',
            target: newModel.name,
            details: `添加新机型 ${newModel.name}`,
          },
          ...prev.auditLogs,
        ],
      }));
      return newModel;
    },
    [data.serverModels.length]
  );

  const updateServerModel = useCallback((id: string, updates: Partial<ServerModel>) => {
    setData((prev) => ({
      ...prev,
      serverModels: prev.serverModels.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  }, []);

  const deleteServerModel = useCallback((id: string) => {
    setData((prev) => {
      const model = prev.serverModels.find((m) => m.id === id);
      return {
        ...prev,
        serverModels: prev.serverModels.filter((m) => m.id !== id),
        auditLogs: model ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'delete',
            user: 'admin',
            target: model.name,
            details: `删除机型 ${model.name}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  const addFirmware = useCallback((modelId: string, fw: Omit<FirmwareVersion, 'id'>) => {
    const newFw: FirmwareVersion = {
      ...fw,
      id: `fw-${Date.now().toString(36)}`,
    };
    setData((prev) => ({
      ...prev,
      serverModels: prev.serverModels.map((m) =>
        m.id === modelId
          ? {
              ...m,
              firmwares: [newFw, ...m.firmwares],
              currentBios: newFw.status === 'synced' ? newFw.version : m.currentBios,
              lastUpdated: new Date().toISOString(),
            }
          : m
      ),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'upload',
          user: 'admin',
          target: modelId,
          details: `上传 BIOS 固件 ${newFw.version}`,
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  const updateFirmware = useCallback((modelId: string, fwId: string, updates: Partial<FirmwareVersion>) => {
    setData((prev) => ({
      ...prev,
      serverModels: prev.serverModels.map((m) => {
        if (m.id !== modelId) return m;
        const nextFirmwares = m.firmwares.map((f) => (f.id === fwId ? { ...f, ...updates } : f));
        const changed = nextFirmwares.find((f) => f.id === fwId);
        if (changed && updates.status === 'synced') {
          return { ...m, firmwares: nextFirmwares, currentBios: changed.version, status: 'synced', lastUpdated: new Date().toISOString() };
        }
        if (changed && updates.status === 'pending' && changed.version === m.currentBios) {
          const latestSynced = nextFirmwares.find((f) => f.status === 'synced');
          return { ...m, firmwares: nextFirmwares, currentBios: latestSynced?.version || 'N/A', status: 'pending' };
        }
        return { ...m, firmwares: nextFirmwares };
      }),
    }));
  }, []);

  const deleteFirmware = useCallback((modelId: string, fwId: string) => {
    setData((prev) => {
      const model = prev.serverModels.find((m) => m.id === modelId);
      const deleted = model?.firmwares.find((f) => f.id === fwId);
      return {
        ...prev,
        serverModels: prev.serverModels.map((m) => {
          if (m.id !== modelId) return m;
          const nextFirmwares = m.firmwares.filter((f) => f.id !== fwId);
          const latestSynced = nextFirmwares.find((f) => f.status === 'synced');
          return {
            ...m,
            firmwares: nextFirmwares,
            currentBios: latestSynced?.version || 'N/A',
            lastUpdated: new Date().toISOString(),
          };
        }),
        auditLogs: deleted ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'delete',
            user: 'admin',
            target: model?.name || modelId,
            details: `删除 BIOS 固件 ${deleted.version}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  const addBmcVersion = useCallback((modelId: string, bmc: Omit<BmcVersion, 'id'>) => {
    const newBmc: BmcVersion = {
      ...bmc,
      id: `bmc-${Date.now().toString(36)}`,
    };
    setData((prev) => ({
      ...prev,
      serverModels: prev.serverModels.map((m) =>
        m.id === modelId
          ? {
              ...m,
              bmcVersions: [newBmc, ...m.bmcVersions],
              currentBmc: newBmc.status === 'synced' ? newBmc.version : m.currentBmc,
              lastUpdated: new Date().toISOString(),
            }
          : m
      ),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'upload',
          user: 'admin',
          target: modelId,
          details: `上传 BMC 固件 ${newBmc.version}`,
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  const updateBmcVersion = useCallback((modelId: string, bmcId: string, updates: Partial<BmcVersion>) => {
    setData((prev) => ({
      ...prev,
      serverModels: prev.serverModels.map((m) => {
        if (m.id !== modelId) return m;
        const nextBmc = m.bmcVersions.map((b) => (b.id === bmcId ? { ...b, ...updates } : b));
        const changed = nextBmc.find((b) => b.id === bmcId);
        if (changed && updates.status === 'synced') {
          return { ...m, bmcVersions: nextBmc, currentBmc: changed.version, status: 'synced', lastUpdated: new Date().toISOString() };
        }
        if (changed && updates.status === 'pending' && changed.version === m.currentBmc) {
          const latestSynced = nextBmc.find((b) => b.status === 'synced');
          return { ...m, bmcVersions: nextBmc, currentBmc: latestSynced?.version || 'N/A', status: 'pending' };
        }
        return { ...m, bmcVersions: nextBmc };
      }),
    }));
  }, []);

  const deleteBmcVersion = useCallback((modelId: string, bmcId: string) => {
    setData((prev) => {
      const model = prev.serverModels.find((m) => m.id === modelId);
      const deleted = model?.bmcVersions.find((b) => b.id === bmcId);
      deleteUploadedFile(deleted?.downloadUrl);
      return {
        ...prev,
        serverModels: prev.serverModels.map((m) => {
          if (m.id !== modelId) return m;
          const nextBmcVersions = m.bmcVersions.filter((b) => b.id !== bmcId);
          const latestSynced = nextBmcVersions.find((b) => b.status === 'synced');
          return {
            ...m,
            bmcVersions: nextBmcVersions,
            currentBmc: latestSynced?.version || 'N/A',
            lastUpdated: new Date().toISOString(),
          };
        }),
        auditLogs: deleted ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'delete',
            user: 'admin',
            target: model?.name || modelId,
            details: `删除 BMC 固件 ${deleted.version}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  const addDriverDownload = useCallback((modelId: string, driver: Omit<DriverDownload, 'id'>) => {
    const newDriver: DriverDownload = {
      ...driver,
      id: `drv-${Date.now().toString(36)}`,
    };
    setData((prev) => ({
      ...prev,
      serverModels: prev.serverModels.map((m) =>
        m.id === modelId
          ? { ...m, drivers: [newDriver, ...(m.drivers || [])], lastUpdated: new Date().toISOString() }
          : m
      ),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'upload',
          user: 'admin',
          target: modelId,
          details: `上传驱动 ${newDriver.name}`,
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  const updateDriverDownload = useCallback((modelId: string, driverId: string, updates: Partial<DriverDownload>) => {
    setData((prev) => ({
      ...prev,
      serverModels: prev.serverModels.map((m) =>
        m.id === modelId
          ? { ...m, drivers: (m.drivers || []).map((d) => (d.id === driverId ? { ...d, ...updates } : d)), lastUpdated: new Date().toISOString() }
          : m
      ),
    }));
  }, []);

  const deleteDriverDownload = useCallback((modelId: string, driverId: string) => {
    setData((prev) => {
      const model = prev.serverModels.find((m) => m.id === modelId);
      const deleted = model?.drivers?.find((d) => d.id === driverId);
      deleteUploadedFile(deleted?.downloadUrl);
      return {
        ...prev,
        serverModels: prev.serverModels.map((m) =>
          m.id === modelId ? { ...m, drivers: (m.drivers || []).filter((d) => d.id !== driverId), lastUpdated: new Date().toISOString() } : m
        ),
        auditLogs: deleted ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'delete',
            user: 'admin',
            target: model?.name || modelId,
            details: `删除驱动 ${deleted.name}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  const addManualDownload = useCallback((modelId: string, manual: Omit<ManualDownload, 'id'>) => {
    const newManual: ManualDownload = {
      ...manual,
      id: `manual-${Date.now().toString(36)}`,
    };
    setData((prev) => ({
      ...prev,
      serverModels: prev.serverModels.map((m) =>
        m.id === modelId
          ? { ...m, manuals: [newManual, ...(m.manuals || [])], lastUpdated: new Date().toISOString() }
          : m
      ),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'upload',
          user: 'admin',
          target: modelId,
          details: `上传说明书 ${newManual.name}`,
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  const deleteManualDownload = useCallback((modelId: string, manualId: string) => {
    setData((prev) => {
      const model = prev.serverModels.find((m) => m.id === modelId);
      const deleted = model?.manuals?.find((d) => d.id === manualId);
      deleteUploadedFile(deleted?.downloadUrl);
      return {
        ...prev,
        serverModels: prev.serverModels.map((m) =>
          m.id === modelId ? { ...m, manuals: (m.manuals || []).filter((d) => d.id !== manualId), lastUpdated: new Date().toISOString() } : m
        ),
        auditLogs: deleted ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'delete',
            user: 'admin',
            target: model?.name || modelId,
            details: `删除说明书 ${deleted.name}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  const updateModelNotes = useCallback((modelId: string, notes: string) => {
    setData((prev) => ({
      ...prev,
      serverModels: prev.serverModels.map((m) => (m.id === modelId ? { ...m, notes } : m)),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'note_added',
          user: 'admin',
          target: modelId,
          details: '更新机型备注',
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  /* ---------- Audit Logs ---------- */
  const addAuditLog = useCallback((log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    setData((prev) => ({
      ...prev,
      auditLogs: [
        {
          ...log,
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  /* ---------- Software Tools ---------- */
  const addSoftwareTool = useCallback((tool: Omit<SoftwareTool, 'id'>): SoftwareTool => {
    const newTool: SoftwareTool = {
      ...tool,
      id: `tool-${String(data.softwareTools.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`,
    };
    setData((prev) => ({
      ...prev,
      softwareTools: [newTool, ...prev.softwareTools],
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'upload',
          user: 'admin',
          target: newTool.name,
          details: `发布工具 ${newTool.name} v${newTool.version}`,
        },
        ...prev.auditLogs,
      ],
    }));
    return newTool;
  }, [data.softwareTools.length]);

  const updateSoftwareTool = useCallback((id: string, updates: Partial<SoftwareTool>) => {
    setData((prev) => {
      const tool = prev.softwareTools.find((t) => t.id === id);
      if (updates.downloadUrl && updates.downloadUrl !== tool?.downloadUrl) {
        deleteUploadedFile(tool?.downloadUrl);
      }
      return {
        ...prev,
        softwareTools: prev.softwareTools.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      };
    });
  }, []);

  const deleteSoftwareTool = useCallback((id: string) => {
    setData((prev) => {
      const tool = prev.softwareTools.find((t) => t.id === id);
      deleteUploadedFile(tool?.downloadUrl);
      return {
        ...prev,
        softwareTools: prev.softwareTools.filter((t) => t.id !== id),
        auditLogs: tool ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'delete',
            user: 'admin',
            target: tool.name,
            details: `删除工具 ${tool.name}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  /* ---------- ISO ---------- */
  const addISOMirror = useCallback((mirror: Omit<ISOMirror, 'id'>): ISOMirror => {
    const newMirror: ISOMirror = {
      ...mirror,
      id: `iso-${String(data.isoMirrors.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`,
    };
    setData((prev) => ({
      ...prev,
      isoMirrors: [newMirror, ...prev.isoMirrors],
      isoCategories: prev.isoCategories.map((c) =>
        c.id === newMirror.categoryId ? { ...c, isoCount: c.isoCount + 1 } : c
      ),
      auditLogs: [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'upload',
          user: 'admin',
          target: newMirror.name,
          details: `上传 ISO 镜像 ${newMirror.name}`,
        },
        ...prev.auditLogs,
      ],
    }));
    return newMirror;
  }, [data.isoMirrors.length]);

  const updateISOMirror = useCallback((id: string, updates: Partial<ISOMirror>) => {
    setData((prev) => {
      const mirror = prev.isoMirrors.find((m) => m.id === id);
      if (updates.downloadUrl && updates.downloadUrl !== mirror?.downloadUrl) {
        deleteUploadedFile(mirror?.downloadUrl);
      }
      return {
        ...prev,
        isoMirrors: prev.isoMirrors.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        auditLogs: mirror ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'update',
            user: 'admin',
            target: mirror.name,
            details: `更新 ISO 镜像 ${updates.name || mirror.name}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  const deleteISOMirror = useCallback((id: string) => {
    setData((prev) => {
      const mirror = prev.isoMirrors.find((m) => m.id === id);
      deleteUploadedFile(mirror?.downloadUrl);
      return {
        ...prev,
        isoMirrors: prev.isoMirrors.filter((m) => m.id !== id),
        isoCategories: mirror
          ? prev.isoCategories.map((c) =>
              c.id === mirror.categoryId ? { ...c, isoCount: Math.max(0, c.isoCount - 1) } : c
            )
          : prev.isoCategories,
        auditLogs: mirror ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'delete',
            user: 'admin',
            target: mirror.name,
            details: `删除 ISO 镜像 ${mirror.name}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  const addISOCategory = useCallback((cat: Omit<ISOCategory, 'id'>): ISOCategory => {
    const newCat: ISOCategory = {
      ...cat,
      id: `iso-cat-${String(data.isoCategories.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`,
    };
    setData((prev) => ({ ...prev, isoCategories: [...prev.isoCategories, newCat] }));
    return newCat;
  }, [data.isoCategories.length]);

  const updateISOCategory = useCallback((id: string, updates: Partial<ISOCategory>) => {
    setData((prev) => ({
      ...prev,
      isoCategories: prev.isoCategories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, []);

  const deleteISOCategory = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      isoCategories: prev.isoCategories.filter((c) => c.id !== id),
    }));
  }, []);

  /* ---------- Brands ---------- */
  const addBrand = useCallback((brand: Omit<Brand, 'id'>): Brand => {
    const newBrand: Brand = {
      ...brand,
      id: `brand-${String(data.brands.length + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`,
    };
    setData((prev) => ({ ...prev, brands: [...prev.brands, newBrand] }));
    return newBrand;
  }, [data.brands.length]);

  const updateBrand = useCallback((id: string, updates: Partial<Brand>) => {
    setData((prev) => ({
      ...prev,
      brands: prev.brands.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  }, []);

  const deleteBrand = useCallback((id: string) => {
    setData((prev) => {
      const brand = prev.brands.find((b) => b.id === id);
      return {
        ...prev,
        brands: prev.brands.filter((b) => b.id !== id),
        auditLogs: brand ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'delete',
            user: 'admin',
            target: brand.name,
            details: `删除厂商 ${brand.name}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  /* ---------- Categories ---------- */
  const addCategory = useCallback((cat: Omit<ToolCategoryConfig, 'id'>): ToolCategoryConfig => {
    const newCat: ToolCategoryConfig = {
      ...cat,
      id: `${cat.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36).slice(-4)}` as ToolCategoryConfig['id'],
    };
    setData((prev) => ({ ...prev, categories: [...prev.categories, newCat] }));
    return newCat;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<ToolCategoryConfig>) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setData((prev) => {
      const category = prev.categories.find((c) => c.id === id);
      return {
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
        auditLogs: category ? [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'delete',
            user: 'admin',
            target: category.name,
            details: `删除工具分类 ${category.name}`,
          },
          ...prev.auditLogs,
        ] : prev.auditLogs,
      };
    });
  }, []);

  /* ---------- Reset ---------- */
  const resetAllData = useCallback(() => {
    const initial: StoredData = {
      serverModels: DEFAULT_MODELS,
      auditLogs: DEFAULT_LOGS,
      softwareTools: DEFAULT_TOOLS,
      isoMirrors: DEFAULT_ISOS,
      isoCategories: DEFAULT_ISO_CATS,
      brands: DEFAULT_BRANDS,
      categories: DEFAULT_CATEGORIES,
    };
    setData(initial);
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen bg-tbase flex items-center justify-center text-ts p-6 text-center">
        后端数据服务不可用，请先启动 API 服务后刷新页面，已阻止默认演示数据覆盖现有数据。
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-tbase flex items-center justify-center text-ts">
        正在加载数据...
      </div>
    );
  }

  return (
    <DataContext.Provider
      value={{
        serverModels: data.serverModels,
        addServerModel,
        updateServerModel,
        deleteServerModel,
        addFirmware,
        updateFirmware,
        deleteFirmware,
        addBmcVersion,
        updateBmcVersion,
        deleteBmcVersion,
        addDriverDownload,
        updateDriverDownload,
        deleteDriverDownload,
        addManualDownload,
        deleteManualDownload,
        updateModelNotes,

        auditLogs: data.auditLogs,
        addAuditLog,

        softwareTools: data.softwareTools,
        addSoftwareTool,
        updateSoftwareTool,
        deleteSoftwareTool,

        isoMirrors: data.isoMirrors,
        isoCategories: data.isoCategories,
        addISOMirror,
        updateISOMirror,
        deleteISOMirror,
        addISOCategory,
        updateISOCategory,
        deleteISOCategory,

        brands: data.brands,
        addBrand,
        updateBrand,
        deleteBrand,

        categories: data.categories,
        addCategory,
        updateCategory,
        deleteCategory,

        resetAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
