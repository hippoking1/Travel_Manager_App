import React from 'react';
import { 
  Train, 
  Bus, 
  Ship, 
  Footprints, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Mountain,
  Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TimeBlock, TransportDetail, STPCoverage } from '../../types';
import { PersonaBadge } from '../shared/PersonaBadge';

interface TimeBlockCardProps {
  block: TimeBlock;
}

export const TimeBlockCard: React.FC<TimeBlockCardProps> = ({ block }) => {
  const navigate = useNavigate();

  const getTransportIcon = (type?: TransportDetail['type']) => {
    switch (type) {
      case 'train':
      case 'cogwheel':
        return <Train className="w-3.5 h-3.5 text-sky-400" />;
      case 'funicular':
      case 'cable-car':
        return <Mountain className="w-3.5 h-3.5 text-amber-400" />;
      case 'boat':
        return <Ship className="w-3.5 h-3.5 text-blue-400" />;
      case 'bus':
        return <Bus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'walk':
      default:
        return <Footprints className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getSTPBadge = (coverage?: STPCoverage, note?: string) => {
    if (!coverage) return null;
    if (coverage === 'free') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" />
          <span>STP 100% 免費</span>
          {note && <span className="opacity-80 font-normal">({note})</span>}
        </span>
      );
    }
    if (coverage === 'half-price') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <span>STP 50% 折扣</span>
          {note && <span className="opacity-80 font-normal">({note})</span>}
        </span>
      );
    }
    return null;
  };

  const handleViewOnMap = () => {
    navigate('/map');
  };

  return (
    <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3">
      {/* 頂部：時段標籤 + 標題 + 海拔標示 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-800 text-sky-400 border border-slate-700">
            {block.periodLabel}
          </span>
          <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {block.title}
          </h4>
        </div>

        {/* 海拔高度標籤 */}
        {block.altitude && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{block.altitude.toLocaleString()} m</span>
          </span>
        )}
      </div>

      {/* 內文描述 */}
      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
        {block.description}
      </p>

      {/* 交通細節卡片 */}
      {block.transport && (
        <div className="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-slate-800">
              {getTransportIcon(block.transport.type)}
            </div>
            <div className="text-slate-200">
              <span className="font-semibold text-white">{block.transport.from}</span>
              <span className="text-slate-500 mx-1">➔</span>
              <span className="font-semibold text-white">{block.transport.to}</span>
              {block.transport.duration && (
                <span className="text-slate-400 ml-2">({block.transport.duration})</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getSTPBadge(block.transport.stpCoverage, block.transport.discountNote)}
          </div>
        </div>
      )}

      {/* 實用貼士 (長輩/兒童注意事項) */}
      {block.tips && block.tips.length > 0 && (
        <div className="space-y-1 pt-1">
          {block.tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-200/90">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}

      {/* 底部：Persona 標籤 + 在地圖上查看按鈕 */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          {block.tags.map((tag) => (
            <PersonaBadge key={tag} tag={tag} size="sm" />
          ))}
        </div>

        {block.coordinates && (
          <button
            onClick={handleViewOnMap}
            className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium py-1 px-2 rounded-lg hover:bg-slate-800 transition-colors ml-auto"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>地圖定位</span>
          </button>
        )}
      </div>
    </div>
  );
};
