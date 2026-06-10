import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Upload,
  Download,
  RefreshCw,
  Trash2,
  MessageSquarePlus,
  CircleDot,
} from 'lucide-react';
import type { AuditLog } from '@/types';

gsap.registerPlugin(ScrollTrigger);

interface AuditTimelineProps {
  logs: AuditLog[];
}

const actionConfig = {
  upload: { icon: Upload, color: 'text-amax', bg: 'bg-amax/10', label: '上传' },
  download: { icon: Download, color: 'text-blue-400', bg: 'bg-blue-500/10', label: '下载' },
  update: { icon: RefreshCw, color: 'text-tdp', bg: 'bg-tdp/10', label: '更新' },
  delete: { icon: Trash2, color: 'text-tdf', bg: 'bg-tdf/10', label: '删除' },
  note_added: { icon: MessageSquarePlus, color: 'text-purple-500', bg: 'bg-purple-500/10', label: '备注' },
};

export default function AuditTimeline({ logs }: AuditTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const items = itemsRef.current.filter(Boolean) as HTMLDivElement[];

    items.forEach((item, i) => {
      gsap.fromTo(
        item,
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
          delay: i * 0.05,
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, [logs]);

  return (
    <div ref={containerRef} className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-[#36F4C2]/30 via-white/10 to-transparent" />

      <div className="space-y-4">
        {logs.map((log, i) => {
          const config = actionConfig[log.action];
          const Icon = config.icon;

          return (
            <div
              key={log.id}
              ref={(el) => { itemsRef.current[i] = el; }}
              className="relative flex items-start gap-4 pl-12 group"
            >
              {/* Timeline node */}
              <div className={`absolute left-3 top-3 w-5 h-5 rounded-full ${config.bg} border border-white/10 flex items-center justify-center transition-all group-hover:scale-125`}>
                <CircleDot className={`w-3 h-3 ${config.color}`} />
              </div>

              {/* Content card */}
              <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>
                    <span className="text-xs text-tm">{log.target}</span>
                  </div>
                  <span className="text-xs text-tm font-mono-data">
                    {new Date(log.timestamp).toLocaleString('zh-CN')}
                  </span>
                </div>

                <p className="text-sm text-ts">{log.details}</p>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-tm">
                  <span className="w-5 h-5 rounded-full bg-amax/10 flex items-center justify-center text-[10px] text-amax font-medium">
                    {log.user.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-mono-data">{log.user}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
