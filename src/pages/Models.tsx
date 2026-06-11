import { useState } from 'react';
import {
  Server,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  X,
} from 'lucide-react';
import FirmwareMatrix from '@/components/FirmwareMatrix';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';

/* ---- Reusable form components (local) ---- */
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
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
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

/* ================================================================ */

export default function Models() {
  const { serverModels: models, addServerModel, brands } = useData();
  const { hasPermission } = useAuth();

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add machine modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    manufacturer: '',
    modelNumber: '',
    amaxModel: '',
    chipset: 'Intel',
    cpuSupport: '',
    memorySlots: 16,
    notes: '',
  });

  const manufacturers = [...new Set(models.map(m => m.manufacturer))];

  const filteredModels = models.filter(m => {
    if (manufacturerFilter !== 'all' && m.manufacturer !== manufacturerFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  const handleAddMachine = () => {
    if (!form.name || !form.manufacturer) return;

    addServerModel({
      name: form.name,
      manufacturer: form.manufacturer,
      modelNumber: form.modelNumber,
      amaxModel: form.amaxModel,
      chipset: form.chipset,
      cpuSupport: form.cpuSupport,
      memorySlots: Number(form.memorySlots) || 16,
      currentBios: 'N/A',
      currentBmc: 'N/A',
      status: 'synced',
      lastUpdated: new Date().toISOString(),
      thumbnail: '/motherboard-macro.jpg',
      notes: form.notes,
      firmwares: [],
      bmcVersions: [],
      drivers: [],
      manuals: [],
    });

    setShowAddModal(false);
    setManufacturerFilter('all');
    setStatusFilter('all');
    resetForm();
  };

  const resetForm = () => {
    setForm({
      name: '',
      manufacturer: '',
      modelNumber: '',
      amaxModel: '',
      chipset: 'Intel',
      cpuSupport: '',
      memorySlots: 16,
      notes: '',
    });
  };

  const updateForm = (key: string, value: string | number) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'manufacturer' || key === 'modelNumber' || key === 'amaxModel') {
        const manufacturer = key === 'manufacturer' ? (value as string) : prev.manufacturer;
        const boardModel = key === 'modelNumber' ? (value as string) : prev.modelNumber;
        const amaxModel = key === 'amaxModel' ? (value as string) : prev.amaxModel;
        next.name = [manufacturer, boardModel, amaxModel].filter(Boolean).join(' ');
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-tbase pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amax/10 flex items-center justify-center border border-amax/20">
                <Server className="w-5 h-5 text-amax" />
              </div>
              <span className="text-xs text-amax font-mono-data uppercase tracking-wider">
                Firmware Library
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              机型库
            </h1>
            <p className="text-ts">
              管理 {models.length} 个服务器机型的BIOS/BMC固件版本
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                showFilters
                  ? 'border-amax/30 text-amax bg-amax/5'
                  : 'border-white/10 text-ts hover:text-tp hover:border-white/20'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              筛选
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            {hasPermission('models', 'create') && (
              <button
                onClick={() => setShowAddModal(true)}
                className="liquid-cta-btn py-3 px-5 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加机器
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-8 p-5 rounded-2xl bg-white/[0.02] border border-white/5 animate-slide-up">
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="text-xs text-tm mb-2 block">厂商</label>
                <select
                  value={manufacturerFilter}
                  onChange={(e) => setManufacturerFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white focus:outline-none focus:border-amax/30"
                >
                  <option value="all">全部厂商</option>
                  {manufacturers.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-tm mb-2 block">状态</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white focus:outline-none focus:border-amax/30"
                >
                  <option value="all">全部状态</option>
                  <option value="synced">已同步</option>
                  <option value="pending">待审核</option>

                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <FirmwareMatrix models={filteredModels} />
      </div>

      {/* Add Machine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg rounded-3xl bg-tsurface border border-white/10 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">添加机器</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-tm" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <FormInput
                  label="机器名称 *"
                  value={form.name}
                  onChange={() => {}}
                  placeholder="自动由厂商 + 主板/BB型号 + Amax型号生成"
                  readOnly
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormSelect
                    label="厂商 *"
                    value={form.manufacturer}
                    onChange={(v) => updateForm('manufacturer', v)}
                    options={[
                      { value: '', label: '选择厂商' },
                      ...brands.map(b => ({ value: b.name, label: b.name })),
                    ]}
                  />
                  <FormInput
                    label="主板/BB型号"
                    value={form.modelNumber}
                    onChange={(v) => updateForm('modelNumber', v)}
                    placeholder="例如: R750-2U"
                  />
                  <FormInput
                    label="Amax型号"
                    value={form.amaxModel}
                    onChange={(v) => updateForm('amaxModel', v)}
                    placeholder="例如: AMX-750"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormSelect
                    label="平台类型"
                    value={form.chipset}
                    onChange={(v) => updateForm('chipset', v)}
                    options={[
                      { value: 'Intel', label: 'Intel' },
                      { value: 'AMD', label: 'AMD' },
                    ]}
                  />
                  <FormInput
                    label="内存插槽数"
                    value={form.memorySlots}
                    onChange={(v) => updateForm('memorySlots', v)}
                    placeholder="16"
                    type="number"
                  />
                </div>

                <FormInput
                  label="CPU支持"
                  value={form.cpuSupport}
                  onChange={(v) => updateForm('cpuSupport', v)}
                  placeholder="例如: Intel Xeon Scalable"
                />

                <FormTextArea
                  label="备注"
                  value={form.notes}
                  onChange={(v) => updateForm('notes', v)}
                  placeholder="添加关于这台机器的备注信息..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="flex-1 px-5 py-3 rounded-xl border border-white/10 text-sm font-medium text-ts hover:text-tp hover:border-white/20 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleAddMachine}
                  disabled={!form.name || !form.manufacturer}
                  className="flex-1 liquid-cta-btn py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加机器
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
