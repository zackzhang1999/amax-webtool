import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Link } from 'react-router-dom';
import {
  Server,
  Microchip,
  ArrowRight,
  Activity,
  Zap,
  Shield,
  AppWindow,
} from 'lucide-react';
import HackerText from '@/components/HackerText';
import FirmwareMatrix from '@/components/FirmwareMatrix';
import AuditTimeline from '@/components/AuditTimeline';
import { useData } from '@/contexts/DataContext';

const statCards = [
  { key: 'totalModels', label: '管理机型', icon: Server, accent: 'var(--brand)', bg: 'var(--brand-dim)', hover: 'hover:border-amax/30' },
  { key: 'totalBmc', label: 'BMC版本', icon: Shield, accent: 'var(--status-pending)', bg: 'rgba(217,161,76,0.14)', hover: 'hover:border-tdp/30' },
  { key: 'totalBios', label: 'BIOS版本', icon: Microchip, accent: '#2563eb', bg: 'rgba(37,99,235,0.12)', hover: 'hover:border-blue-500/30' },
  { key: 'pendingModels', label: '待审核', icon: Activity, accent: 'var(--status-pending)', bg: 'rgba(217,161,76,0.14)', hover: 'hover:border-tdp/30' },
  { key: 'toolCount', label: '运维工具', icon: AppWindow, accent: '#7c3aed', bg: 'rgba(124,58,237,0.12)', hover: 'hover:border-purple-500/30' },
] as const;

export default function Dashboard() {
  const { serverModels, auditLogs, softwareTools } = useData();
  const heroRef = useRef<HTMLDivElement>(null);
  const totalBmc = serverModels.reduce((sum, m) => sum + m.bmcVersions.length, 0);
  const totalBios = serverModels.reduce((sum, m) => sum + m.firmwares.length, 0);
  const stats = {
    totalModels: serverModels.length,
    totalBmc: totalBmc,
    totalBios: totalBios,
    pendingModels: serverModels.filter(m => m.status === 'pending').length,
    toolCount: softwareTools.length,
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.hero-stat-card',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out', delay: 0.3 }
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-tbase">
      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-6 lg:px-12 overflow-hidden">
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-multiply dark:mix-blend-screen dark:opacity-10"
          style={{
            backgroundImage: 'url(/fiber-data-flow.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,var(--brand-dim-2),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(124,58,237,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.72)_0%,var(--bg-base)_78%)] dark:bg-[linear-gradient(180deg,transparent_0%,rgba(5,5,7,0.82)_48%,#050507_100%)]" />
        <div className="absolute left-6 right-6 top-28 h-px bg-gradient-to-r from-transparent via-amax/30 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Status header */}
          <div className="inline-flex items-center gap-3 mb-8 px-4 py-2 rounded-full border border-[color:var(--border-hover)] bg-[color:var(--bg-surface)]/80 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-amax animate-pulse" />
            <HackerText
              text="BIOS 监控运行中... 版本同步完成..."
              className="text-sm text-ts"
              trigger="mount"
            />
          </div>

          {/* Main title */}
          <h1 className="max-w-5xl text-5xl md:text-7xl lg:text-[80px] font-black text-tp leading-none tracking-tight mb-6 drop-shadow-[0_10px_30px_rgba(13,159,122,0.10)]">
            BIOS 版本
            <br />
            <span className="bg-gradient-to-r from-amax via-[#18b88f] to-[#0b6f56] bg-clip-text text-transparent dark:from-[#6fffe0] dark:via-amax dark:to-[#0d9f7a]">
              全生命周期
            </span>
            管理
          </h1>

          <p className="text-lg text-ts max-w-2xl mb-12 leading-relaxed">
            统一管理企业服务器BIOS/BMC固件，支持版本追踪、文件上传下载、备注记录与合规审计。
            内置软件中心发布运维工具，确保每一台服务器的固件都处于可控状态。
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-16">
            {statCards.map(({ key, label, icon: Icon, accent, bg, hover }) => (
              <div
                key={key}
                className={`hero-stat-card p-5 rounded-2xl bg-[color:var(--bg-surface)]/85 border border-[color:var(--border)] shadow-[var(--shadow-card)] ${hover} transition-all group`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: bg }}
                >
                  <Icon className="w-5 h-5" style={{ color: accent }} />
                </div>
                <p className="text-3xl font-bold text-tp font-mono-data">{stats[key]}</p>
                <p className="text-xs text-tm mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-4">
            <Link
              to="/models"
              className="liquid-cta-btn text-sm shadow-[0_16px_40px_var(--brand-dim-2)]"
            >
              <Zap className="w-4 h-4 mr-2" />
              开始管理
            </Link>

            <Link
              to="/software"
              className="flex items-center gap-2 px-6 py-4 rounded-full border border-[color:var(--border-hover)] text-sm font-medium text-ts bg-[color:var(--bg-surface)]/80 hover:text-tp hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
            >
              <AppWindow className="w-4 h-4" />
              软件中心
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/admin"
              className="flex items-center gap-2 px-6 py-4 rounded-full border border-[color:var(--border-hover)] text-sm font-medium text-ts bg-[color:var(--bg-surface)]/80 hover:text-tp hover:border-[color:var(--border-active)] hover:bg-amax/5 transition-all"
            >
              <Microchip className="w-4 h-4" />
              管理后台
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Firmware Matrix Section */}
      <section className="px-6 lg:px-12 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-tp mb-2">
                固件矩阵
              </h2>
              <p className="text-ts">浏览所有服务器机型及其BIOS/BMC版本状态</p>
            </div>
            <Link
              to="/models"
              className="hidden md:flex items-center gap-2 text-sm text-amax hover:underline"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <FirmwareMatrix models={serverModels.slice(0, 4)} />
        </div>
      </section>

      {/* Recent Audit Logs */}
      <section className="px-6 lg:px-12 py-20 border-t border-[color:var(--border)] bg-[linear-gradient(180deg,transparent,var(--bg-surface-2))]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-tp mb-2">
                审计日志
              </h2>
              <p className="text-ts">追踪所有BIOS/BMC相关的操作记录</p>
            </div>
            <Link
              to="/audit"
              className="hidden md:flex items-center gap-2 text-sm text-amax hover:underline"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <AuditTimeline logs={auditLogs.slice(0, 5)} />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-12 border-t border-[color:var(--border)] bg-[color:var(--bg-surface)]/60">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amax/10 flex items-center justify-center border border-amax/20">
              <Server className="w-4 h-4 text-amax" />
            </div>
            <span className="text-sm font-bold text-tp">
              Amax<span style={{ color: 'var(--brand)' }}>工具箱</span>
            </span>
          </div>
          <p className="text-xs text-tm">
            Amax 智控平台 - 企业级BIOS/BMC版本管理系统
          </p>
        </div>
      </footer>
    </div>
  );
}
