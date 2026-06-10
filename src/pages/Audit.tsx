import { useState } from 'react';
import {
  Clock,
  Filter,
  Search,
  Download,
} from 'lucide-react';
import AuditTimeline from '@/components/AuditTimeline';
import { useData } from '@/contexts/DataContext';

export default function Audit() {
  const { auditLogs } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = auditLogs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (searchQuery && !log.target.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.user.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ['时间', '操作', '用户', '目标', '详情'],
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString('zh-CN'),
        log.action,
        log.user,
        log.target,
        log.details,
      ]),
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-tbase pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amax/10 flex items-center justify-center border border-amax/20">
                <Clock className="w-5 h-5 text-amax" />
              </div>
              <span className="text-xs text-amax font-mono-data uppercase tracking-wider">
                Audit Trail
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              合规监控
            </h1>
            <p className="text-ts">
              追踪所有BIOS相关的操作记录与变更历史
            </p>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-sm font-medium text-ts hover:text-tp hover:border-white/20 hover:bg-white/5 transition-all"
          >
            <Download className="w-4 h-4" />
            导出日志
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索目标或用户..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-tm" />
            {['all', 'upload', 'download', 'update', 'delete', 'note_added'].map(action => (
              <button
                key={action}
                onClick={() => setActionFilter(action)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  actionFilter === action
                    ? 'bg-amax/10 text-amax border border-amax/20'
                    : 'text-tm hover:text-tp bg-white/[0.02] border border-transparent hover:border-white/10'
                }`}
              >
                {action === 'all' ? '全部' :
                 action === 'upload' ? '上传' :
                 action === 'download' ? '下载' :
                 action === 'update' ? '更新' :
                 action === 'delete' ? '删除' :
                 '备注'}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <AuditTimeline logs={filteredLogs} />
      </div>
    </div>
  );
}
