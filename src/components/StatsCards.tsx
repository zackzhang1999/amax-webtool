import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  Server,
  Microchip,
  Shield,
  AlertTriangle,

  Upload,
} from 'lucide-react';
import type { AdminStats } from '@/types';

interface StatsCardsProps {
  stats: AdminStats;
}

const statConfig = [
  { key: 'totalModels' as const, label: '管理机型', icon: Server, color: 'text-amax', bg: 'bg-amax/10' },
  { key: 'totalFirmwares' as const, label: 'BIOS固件', icon: Microchip, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { key: 'totalBmcFirmwares' as const, label: 'BMC固件', icon: Shield, color: 'text-tdp', bg: 'bg-tdp/10' },
  { key: 'pendingReviews' as const, label: '待审核', icon: AlertTriangle, color: 'text-tdp', bg: 'bg-tdp/10' },

  { key: 'recentUploads' as const, label: '本周上传', icon: Upload, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

export default function StatsCards({ stats }: StatsCardsProps) {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const cards = cardsRef.current.filter(Boolean) as HTMLDivElement[];
    cards.forEach((card, i) => {
      gsap.fromTo(
        card,
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          delay: i * 0.08,
          ease: 'power3.out',
        }
      );
    });
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statConfig.map((config, i) => {
        const Icon = config.icon;
        const value = stats[config.key];

        return (
          <div
            key={config.key}
            ref={(el) => { cardsRef.current[i] = el; }}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <p className="text-2xl font-bold text-white font-mono-data">{value}</p>
            <p className="text-xs text-tm mt-1">{config.label}</p>
          </div>
        );
      })}
    </div>
  );
}
