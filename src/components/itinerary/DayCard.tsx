import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  ShoppingCart, 
  CloudSun, 
  Backpack, 
  MapPin, 
  PlusCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DayItinerary } from '../../types';
import { useTripStore } from '../../stores/tripStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDayDate } from '../../utils/dates';
import { TimeBlockCard } from './TimeBlockCard';

interface DayCardProps {
  dayData: DayItinerary;
}

export const DayCard: React.FC<DayCardProps> = ({ dayData }) => {
  const navigate = useNavigate();
  const { config } = useTripStore();
  const { expandedDays, toggleDayExpanded } = useUIStore();

  const isExpanded = expandedDays.includes(dayData.day);
  const base = config.bases.find((b) => b.id === dayData.baseId);
  const formattedDate = formatDayDate(config.startDate, dayData.day);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all duration-200 hover:border-slate-700/80 mb-4">
      {/* 卡片標題列 (可點擊切換折疊狀態) */}
      <div
        onClick={() => toggleDayExpanded(dayData.day)}
        className="p-4 sm:p-5 cursor-pointer select-none flex items-start sm:items-center justify-between gap-4 transition-colors hover:bg-slate-800/40"
      >
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 flex-1 min-w-0">
          {/* 左側天數方塊 */}
          <div className="flex flex-col items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white shadow-lg shadow-red-900/30 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">DAY</span>
            <span className="text-xl sm:text-2xl font-black font-mono leading-none">
              {String(dayData.day).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-medium opacity-90 truncate max-w-[50px]">
              {formattedDate}
            </span>
          </div>

          {/* 中間主要標題與亮點 */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {base && (
                <span
                  style={{ backgroundColor: `${base.color}25`, color: base.color, borderColor: `${base.color}40` }}
                  className="px-2 py-0.5 rounded-full text-xs font-semibold border"
                >
                  {base.nameZh}
                </span>
              )}
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {dayData.title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 truncate mb-2">
              {dayData.subtitle}
            </p>

            {/* 亮點標籤列 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {dayData.highlights.map((h, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60"
                >
                  ★ {h}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 右側展開/收合箭頭 */}
        <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-sky-400" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* 展開之詳細內容區塊 */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-slate-800/80 bg-slate-950/40"
          >
            <div className="p-4 sm:p-6 space-y-6">
              {/* 1. 三時段活動列表 */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>當日活動時序</span>
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {dayData.timeBlocks.map((block, idx) => (
                    <TimeBlockCard key={idx} block={block} />
                  ))}
                </div>
              </div>

              {/* 2. 美食與餐飲建議區塊 */}
              {dayData.foodNotes && dayData.foodNotes.length > 0 && (
                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>美食推薦 & 自煮筆記</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {dayData.foodNotes.map((food, fIdx) => (
                      <div
                        key={fIdx}
                        className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{food.mealLabel}</span>
                          {food.costEstimate && (
                            <span className="text-[11px] text-slate-400">{food.costEstimate}</span>
                          )}
                        </div>
                        <p className="text-slate-300 leading-relaxed">{food.suggestion}</p>
                      </div>
                    ))}
                  </div>

                  {/* 超市小撇步 */}
                  {dayData.supermarketTips && dayData.supermarketTips.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-xs text-purple-300">
                      <ShoppingCart className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-400" />
                      <div>
                        <span className="font-semibold text-purple-200">超市採買貼士：</span>
                        <span>{dayData.supermarketTips.join('；')}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. 天氣警訊與打包提醒 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dayData.weatherAlert && (
                  <div className="bg-sky-950/30 border border-sky-900/50 rounded-xl p-3 flex items-start gap-2.5 text-xs text-sky-200">
                    <CloudSun className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sky-300 block mb-0.5">天氣與氣溫提醒</span>
                      <p className="leading-relaxed opacity-90">{dayData.weatherAlert}</p>
                    </div>
                  </div>
                )}

                {dayData.packingReminders && dayData.packingReminders.length > 0 && (
                  <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-200">
                    <Backpack className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-emerald-300 block mb-0.5">出門必帶裝備</span>
                      <p className="leading-relaxed opacity-90">{dayData.packingReminders.join('、')}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. 卡片底部動作按鈕列 */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/map')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>在地圖中查看路線</span>
                  </button>

                  <button
                    onClick={() => navigate('/weather')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                    <span>即時視訊/氣象</span>
                  </button>
                </div>

                <button
                  onClick={() => navigate('/budget')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition-colors ml-auto"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>記錄此天支出</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
