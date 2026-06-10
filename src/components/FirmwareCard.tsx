import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, HardDrive, Calendar, ArrowRight } from 'lucide-react';
import { getLatestBiosVersion, getLatestBmcVersionText } from '@/lib/firmware';
import type { ServerModel } from '@/types';

interface FirmwareCardProps {
  model: ServerModel;
  index: number;
  style?: React.CSSProperties;
}

const FirmwareCard = forwardRef<HTMLDivElement, FirmwareCardProps>(
  ({ model, index, style }, ref) => {
    const latestBiosVersion = getLatestBiosVersion(model);
    const latestBmcVersion = getLatestBmcVersionText(model);

    const getStatusColor = () => {
      switch (model.status) {
        case 'synced': return 'text-amax';
        case 'pending': return 'text-tdp';

      }
    };

    const getStatusLabel = () => {
      switch (model.status) {
        case 'synced': return '已同步';
        case 'pending': return '待审核';

      }
    };

    const getStatusDot = () => {
      switch (model.status) {
        case 'synced': return 'status-dot status-synced';
        case 'pending': return 'status-dot status-pending';

      }
    };

    return (
      <div
        ref={ref}
        className="fw-card group absolute cursor-pointer"
        style={{
          width: '280px',
          height: '340px',
          ...style,
        }}
        data-index={index}
        data-model-id={model.id}
      >
        <Link to={`/models/${model.id}`} className="block w-full h-full">
          <div className="firmware-model-card relative w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-tsurface transition-all duration-500 group-hover:border-[#36F4C2]/40 group-hover:shadow-[0_0_30px_rgba(54,244,194,0.15)]">
            {/* Background image */}
            <div
              className="firmware-model-card-image absolute inset-0 bg-cover bg-center opacity-30 transition-opacity duration-500 group-hover:opacity-50"
              style={{ backgroundImage: `url(${model.thumbnail})` }}
            />
            <div className="firmware-model-card-gradient absolute inset-0 bg-gradient-to-t from-[#0a0a0e] via-[#0a0a0e]/80 to-transparent" />

            {/* Content */}
            <div className="firmware-model-card-content relative h-full flex flex-col justify-end p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={getStatusDot()} />
                <span className={`text-xs font-mono-data font-medium ${getStatusColor()}`}>
                  {getStatusLabel()}
                </span>
              </div>

              <h3 className="text-white font-bold text-lg mb-1 leading-tight group-hover:text-amax transition-colors">
                {model.name}
              </h3>

              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono-data text-xs text-amax">BIOS V.{latestBiosVersion}</span>
                <span className="text-[#33333d]">|</span>
                <span className="font-mono-data text-xs text-tdp">BMC V.{latestBmcVersion}</span>
              </div>

              <div className="flex items-center gap-4 text-xs text-ts">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  {model.chipset}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  {model.memorySlots} slots
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-tm">
                  <Calendar className="w-3 h-3" />
                  {new Date(model.lastUpdated).toLocaleDateString('zh-CN')}
                </span>
                <ArrowRight className="w-4 h-4 text-amax opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </div>
            </div>

            {/* Hover glow */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 60px rgba(54, 244, 194, 0.08)',
              }}
            />
          </div>
        </Link>
      </div>
    );
  }
);

FirmwareCard.displayName = 'FirmwareCard';

export default FirmwareCard;
