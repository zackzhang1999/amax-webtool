import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Grid3X3, List, Search } from 'lucide-react';
import FirmwareCard from './FirmwareCard';
import { getLatestBiosVersion } from '@/lib/firmware';
import type { ServerModel } from '@/types';

interface FirmwareMatrixProps {
  models: ServerModel[];
}

type ViewMode = 'grid' | 'list';

export default function FirmwareMatrix({ models }: FirmwareMatrixProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const trailRefs = useRef<Record<number, { x: number; y: number; z: number; r: number; alpha: number }>>({});
  const mouseRef = useRef({ x: 0, y: 0, lastX: 0, lastY: 0 });
  const rafRef = useRef<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getLatestBiosVersion(m).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 3D Grid layout
  useEffect(() => {
    if (viewMode !== 'grid') return;
    const container = containerRef.current;
    if (!container) return;

    const cards = cardsRef.current.filter(Boolean) as HTMLDivElement[];
    if (cards.length === 0) return;

    const columns = Math.min(4, Math.floor(window.innerWidth / 320));
    const unitWidth = container.offsetWidth / columns;
    const rowHeight = 380;

    gsap.set(container, { transformOrigin: '50% 50% 0px' });

    cards.forEach((card, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const nx = col * unitWidth + unitWidth / 2 - 140;
      const ny = row * rowHeight + 20;

      trailRefs.current[i] = { x: nx, y: ny, z: 0, r: 0, alpha: 1 };
      gsap.set(card, { x: nx, y: ny, opacity: 0, scale: 0.8 });

      gsap.to(card, {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        delay: i * 0.08,
        ease: 'power3.out',
      });
    });

    // Mouse parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const animate = () => {
      const dx = (mouseRef.current.x - mouseRef.current.lastX) * 15;
      const dy = (mouseRef.current.y - mouseRef.current.lastY) * 15;
      mouseRef.current.lastX += (mouseRef.current.x - mouseRef.current.lastX) * 0.05;
      mouseRef.current.lastY += (mouseRef.current.y - mouseRef.current.lastY) * 0.05;

      cards.forEach((card, i) => {
        const trail = trailRefs.current[i];
        if (!trail) return;

        const cardX = trail.x + dx * (i % 2 === 0 ? 1 : -1) * 0.3;
        const cardY = trail.y + dy * (i % 3 === 0 ? 1 : -1) * 0.2;

        const centerX = container.offsetWidth / 2;
        const centerY = container.offsetHeight / 2;
        const dist = Math.hypot(cardX - centerX + 140, cardY - centerY);
        const maxDist = Math.min(window.innerWidth, window.innerHeight) * 0.5;
        const intensity = Math.max(0, 1 - dist / maxDist);

        const lift = intensity * 40;
        const rot = (cardY - trail.y) * 0.02;
        const alpha = 0.7 + intensity * 0.3;

        gsap.set(card, {
          x: cardX,
          y: cardY,
          z: lift,
          rotateZ: rot,
          opacity: alpha,
        });
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    container.addEventListener('mousemove', handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [viewMode, filteredModels.length]);

  // List view animation
  useEffect(() => {
    if (viewMode !== 'list') return;
    const cards = cardsRef.current.filter(Boolean) as HTMLDivElement[];
    cards.forEach((card, i) => {
      gsap.set(card, { x: 0, y: 0, z: 0, rotateZ: 0, opacity: 0 });
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        delay: i * 0.05,
        ease: 'power2.out',
      });
    });
  }, [viewMode]);

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              viewMode === 'grid'
                ? 'bg-amax/10 text-amax border border-amax/20'
                : 'text-tm hover:text-tp hover:bg-white/5'
            }`}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              viewMode === 'list'
                ? 'bg-amax/10 text-amax border border-amax/20'
                : 'text-tm hover:text-tp hover:bg-white/5'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索机型、厂商或BIOS版本..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-white placeholder-[#595969] focus:outline-none focus:border-amax/30 transition-colors"
          />
        </div>

        <span className="text-xs text-tm font-mono-data">
          {filteredModels.length} 个机型
        </span>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div
          ref={containerRef}
          className="relative"
          style={{
            perspective: '1200px',
            minHeight: `${Math.ceil(filteredModels.length / 4) * 400}px`,
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
          {filteredModels.map((model, i) => (
            <div
              key={model.id}
              ref={(el) => { cardsRef.current[i] = el; }}
              className="fw-card"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <FirmwareCard model={model} index={i} />
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredModels.map((model, i) => (
            <div
              key={model.id}
              ref={(el) => { cardsRef.current[i] = el; }}
            >
              <ListCard model={model} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListCard({ model }: { model: ServerModel }) {
  const latestBiosVersion = getLatestBiosVersion(model);

  const getStatusColor = () => {
    switch (model.status) {
      case 'synced': return 'text-amax bg-amax/10';
      case 'pending': return 'text-tdp bg-tdp/10';

    }
  };

  const getStatusLabel = () => {
    switch (model.status) {
      case 'synced': return '已同步';
      case 'pending': return '待审核';

    }
  };

  return (
    <a
      href={`/models/${model.id}`}
      onClick={(e) => {
        e.preventDefault();
        window.location.href = `/models/${model.id}`;
      }}
      className="group flex items-center gap-6 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amax/20 hover:bg-white/[0.04] transition-all duration-300"
    >
      <div className="w-12 h-12 rounded-xl bg-amax/5 flex items-center justify-center border border-[#36F4C2]/10 group-hover:border-amax/30 transition-colors flex-shrink-0">
        <Cpu className="w-6 h-6 text-amax" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-white font-semibold text-base group-hover:text-amax transition-colors truncate">
            {model.name}
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-tm">
          <span>{model.manufacturer}</span>
          <span>{model.chipset}</span>
          <span>{model.cpuSupport}</span>
        </div>
      </div>

      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="font-mono-data text-sm text-amax">V.{latestBiosVersion}</p>
        <p className="text-xs text-tm mt-0.5">
          {model.firmwares.length} 个版本
        </p>
      </div>

      <ArrowRight className="w-5 h-5 text-tm group-hover:text-amax group-hover:translate-x-1 transition-all flex-shrink-0" />
    </a>
  );
}

import { Cpu, ArrowRight } from 'lucide-react';