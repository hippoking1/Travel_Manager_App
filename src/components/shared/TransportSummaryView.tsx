import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Clock, 
  AlertTriangle,
  Repeat
} from 'lucide-react';
import type { TransportDetail, TransitLeg } from '../../types';
import { 
  TRANSPORT_TYPE_CONFIG, 
  buildGoogleMapsTransitUrl, 
  calculateTransferBuffer,
  formatMinutes
} from '../../lib/transit';

export interface TransportSummaryViewProps {
  transport?: TransportDetail;
  className?: string;
  defaultExpanded?: boolean;
  showNavigationLink?: boolean;
}

export const TransportSummaryView: React.FC<TransportSummaryViewProps> = ({
  transport,
  className = '',
  defaultExpanded = false,
  showNavigationLink = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!transport || (!transport.from && !transport.to && (!transport.legs || transport.legs.length === 0))) {
    return null;
  }

  // 確保擁有 legs 清單供展開檢視
  const legs: TransitLeg[] = (transport.legs && transport.legs.length > 0)
    ? transport.legs
    : [
        {
          id: 'single-leg',
          type: transport.type,
          from: transport.from,
          to: transport.to,
          departureTime: transport.departureTime,
          arrivalTime: transport.arrivalTime,
          duration: transport.duration,
          lineName: transport.lineInfo,
          passCoverage: transport.discountNote,
          cost: transport.cost,
          notes: transport.notes,
        },
      ];

  const isMultiLeg = legs.length > 1;
  const transitUrl = buildGoogleMapsTransitUrl({
    from: transport.from,
    to: transport.to,
    routeUrl: transport.routeUrl,
  });

  const primaryMeta = TRANSPORT_TYPE_CONFIG[transport.type] || TRANSPORT_TYPE_CONFIG.train;

  return (
    <div className={`bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/60 dark:border-stone-800 transition-all ${className}`}>
      {/* 摘要列 (可收合/展開) */}
      <div className="p-2.5 sm:p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* 左側：路線車種鏈與起訖站 */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {isMultiLeg ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 shadow-2xs">
                <Repeat className="w-3 h-3 text-teal-600" />
                <span>{legs.length} 段轉乘</span>
              </span>
            ) : (
              <span
                style={{
                  backgroundColor: primaryMeta.bgLight,
                  color: primaryMeta.color,
                  borderColor: primaryMeta.badgeBorder,
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border shadow-2xs"
              >
                <span>{primaryMeta.emoji}</span>
                <span>{primaryMeta.shortLabel}</span>
              </span>
            )}

            {/* 車種與路線標籤鏈 */}
            <div className="flex items-center gap-1 flex-wrap">
              {legs.map((leg, idx) => {
                const meta = TRANSPORT_TYPE_CONFIG[leg.type] || TRANSPORT_TYPE_CONFIG.train;
                return (
                  <React.Fragment key={leg.id || idx}>
                    {idx > 0 && <span className="text-stone-300 dark:text-stone-600 text-xs font-bold">➔</span>}
                    <span 
                      style={{ borderColor: meta.badgeBorder }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border shadow-2xs truncate max-w-[140px]"
                      title={`${meta.shortLabel} ${leg.lineName || ''}`}
                    >
                      <span>{meta.emoji}</span>
                      <span className="truncate">{leg.lineName || meta.shortLabel}</span>
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 右側：Google 路線按鈕與展開按鈕 */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {showNavigationLink && transitUrl && (
              <a
                href={transitUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-950/70 border border-teal-200 dark:border-teal-800/60 transition-colors"
                title="在 Google Maps 開啟完整大眾運輸轉乘路線"
              >
                <span>路線導航</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 px-1.5 py-1 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-colors cursor-pointer"
              title={isExpanded ? '收起轉乘細節' : '展開每段時刻與月台/出口細節'}
            >
              <span>{isExpanded ? '收起' : '轉乘明細'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 起訖站點與時刻車程資訊列 */}
        <div className="flex items-center justify-between gap-2 text-xs text-stone-700 dark:text-stone-300 flex-wrap pt-0.5">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="font-bold text-stone-900 dark:text-stone-100">{transport.from}</span>
            <span className="text-stone-400">➔</span>
            <span className="font-bold text-stone-900 dark:text-stone-100">{transport.to}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500 dark:text-stone-400">
            {transport.departureTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                <span>{transport.departureTime}{transport.arrivalTime ? ` ~ ${transport.arrivalTime}` : ''}</span>
              </span>
            )}
            {transport.duration && (
              <span className="px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-700/50 text-stone-600 dark:text-stone-300">
                {transport.duration}
              </span>
            )}
            {transport.cost && (
              <span className="font-bold text-stone-800 dark:text-stone-200">
                {transport.cost}
              </span>
            )}
            {transport.discountNote && (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                {transport.discountNote}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 展開之多段轉乘時間軸 Stepper */}
      {isExpanded && (
        <div className="border-t border-stone-200/80 dark:border-stone-800/80 p-3 sm:p-3.5 space-y-3 bg-white/60 dark:bg-stone-900/40 rounded-b-2xl">
          {legs.map((leg, idx) => {
            const meta = TRANSPORT_TYPE_CONFIG[leg.type] || TRANSPORT_TYPE_CONFIG.train;
            const nextLeg = legs[idx + 1];
            const transferWait = nextLeg ? calculateTransferBuffer(leg.arrivalTime, nextLeg.departureTime) : null;

            return (
              <React.Fragment key={leg.id || idx}>
                {/* 單段轉乘卡 */}
                <div className="relative pl-6 sm:pl-7 pb-1">
                  {/* Stepper 垂直連接線 */}
                  <div className="absolute left-2.5 top-2.5 bottom-0 w-0.5 bg-stone-200 dark:bg-stone-700 -translate-x-1/2" />

                  {/* Stepper 節點圖示 */}
                  <div 
                    style={{ backgroundColor: meta.color }}
                    className="absolute left-2.5 top-1 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] shadow-xs font-bold"
                  >
                    {idx + 1}
                  </div>

                  <div className="space-y-1.5">
                    {/* 車種、路線、車次與狀態標籤 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span 
                        style={{
                          backgroundColor: meta.bgLight,
                          color: meta.color,
                          borderColor: meta.badgeBorder,
                        }}
                        className="px-2 py-0.5 rounded-md text-xs font-bold border flex items-center gap-1"
                      >
                        <span>{meta.emoji}</span>
                        <span>{meta.shortLabel}</span>
                        {leg.lineName && <span className="font-bold ml-0.5">{leg.lineName}</span>}
                      </span>

                      {leg.duration && (
                        <span className="text-[11px] font-mono text-stone-500">
                          車程約 {leg.duration}
                        </span>
                      )}

                      {leg.cost && (
                        <span className="text-[11px] font-mono font-bold text-stone-700 dark:text-stone-300">
                          {leg.cost}
                        </span>
                      )}

                      {leg.passCoverage && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {leg.passCoverage}
                        </span>
                      )}
                    </div>

                    {/* 上車與下車節點詳細資訊 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {/* 上車站 */}
                      <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/50 dark:border-stone-800 flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-stone-400 block">
                            上車 / 出發站
                          </span>
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            {leg.from}
                          </span>
                          {leg.fromPlatform && (
                            <span className="block text-[11px] text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                              月台/出口：{leg.fromPlatform}
                            </span>
                          )}
                        </div>
                        {leg.departureTime && (
                          <span className="font-mono font-bold text-stone-800 dark:text-stone-200 text-xs shrink-0 bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                            {leg.departureTime}
                          </span>
                        )}
                      </div>

                      {/* 下車站 */}
                      <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200/50 dark:border-stone-800 flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-stone-400 block">
                            {nextLeg ? '下車 / 轉乘站' : '抵達站'}
                          </span>
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            {leg.to}
                          </span>
                          {leg.toPlatform && (
                            <span className="block text-[11px] text-teal-700 dark:text-teal-400 font-medium mt-0.5">
                              月台/出口：{leg.toPlatform}
                            </span>
                          )}
                        </div>
                        {leg.arrivalTime && (
                          <span className="font-mono font-bold text-stone-800 dark:text-stone-200 text-xs shrink-0 bg-white dark:bg-stone-900 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                            {leg.arrivalTime}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 單段注意事項 */}
                    {leg.notes && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 italic pt-0.5">
                        💡 備註：{leg.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* 轉乘節點提示 (介於第 i 段與第 i+1 段之間) */}
                {nextLeg && (
                  <div className="ml-5 sm:ml-6 pl-3 py-1 my-0.5 border-l-2 border-dashed border-teal-400/80 dark:border-teal-600 flex items-center gap-2 text-xs flex-wrap">
                    <span className="inline-flex items-center gap-1 font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
                      <Repeat className="w-3 h-3 text-teal-600" />
                      <span>於「{leg.to}」站內轉乘</span>
                    </span>

                    {transferWait !== null && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        transferWait < 4 
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                      }`}>
                        {transferWait < 4 && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        <span>預留轉乘時間：{formatMinutes(transferWait)}</span>
                        {transferWait < 4 && <span className="text-[10px] text-amber-700 font-bold">(時間緊湊，請留意走道與月台距離)</span>}
                      </span>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
