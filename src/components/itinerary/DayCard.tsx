import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  ShoppingCart, 
  CloudSun, 
  Backpack, 
  MapPin, 
  PlusCircle,
  Plus,
  Edit2,
  Trash2,
  X,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DayItinerary, TimeBlock, PersonaTag, TransportType, STPCoverage } from '../../types';
import { useTripStore } from '../../stores/tripStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDayDate } from '../../utils/dates';
import { TimeBlockCard } from './TimeBlockCard';

interface DayCardProps {
  dayData: DayItinerary;
}

export const DayCard: React.FC<DayCardProps> = ({ dayData }) => {
  const navigate = useNavigate();
  const { config, updateDay, deleteDay, addTimeBlock, updateTimeBlock, deleteTimeBlock } = useTripStore();
  const { expandedDays, toggleDayExpanded } = useUIStore();

  const isExpanded = expandedDays.includes(dayData.day);
  const base = config.bases.find((b) => b.id === dayData.baseId);
  const formattedDate = formatDayDate(config.startDate, dayData.day);

  // 編輯當天資訊 Modal
  const [showEditDayModal, setShowEditDayModal] = useState(false);
  const [dayTitle, setDayTitle] = useState(dayData.title);
  const [daySubtitle, setDaySubtitle] = useState(dayData.subtitle);
  const [dayBaseId, setDayBaseId] = useState(dayData.baseId);

  // 編輯/新增活動 Modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);
  const [blockPeriod, setBlockPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [blockPeriodLabel, setBlockPeriodLabel] = useState('上午 09:00 - 12:00');
  const [blockTitle, setBlockTitle] = useState('');
  const [blockDesc, setBlockDesc] = useState('');
  const [blockAltitude, setBlockAltitude] = useState<string>('');
  const [blockTransportFrom, setBlockTransportFrom] = useState('');
  const [blockTransportTo, setBlockTransportTo] = useState('');
  const [blockTransportType, setBlockTransportType] = useState<TransportType>('train');
  const [blockSTPCoverage, setBlockSTPCoverage] = useState<STPCoverage>('free');
  const [blockTags, setBlockTags] = useState<PersonaTag[]>(['senior-friendly']);

  // 開啟新增活動
  const handleOpenAddBlock = () => {
    setEditingBlockIndex(null);
    setBlockPeriod('morning');
    setBlockPeriodLabel('上午 09:00 - 12:00');
    setBlockTitle('');
    setBlockDesc('');
    setBlockAltitude('');
    setBlockTransportFrom('');
    setBlockTransportTo('');
    setBlockTransportType('train');
    setBlockSTPCoverage('free');
    setBlockTags(['senior-friendly']);
    setShowBlockModal(true);
  };

  // 開啟編輯活動
  const handleOpenEditBlock = (block: TimeBlock, idx: number) => {
    setEditingBlockIndex(idx);
    setBlockPeriod(block.period);
    setBlockPeriodLabel(block.periodLabel);
    setBlockTitle(block.title);
    setBlockDesc(block.description);
    setBlockAltitude(block.altitude ? String(block.altitude) : '');
    setBlockTransportFrom(block.transport?.from || '');
    setBlockTransportTo(block.transport?.to || '');
    setBlockTransportType(block.transport?.type || 'train');
    setBlockSTPCoverage(block.transport?.stpCoverage || 'free');
    setBlockTags(block.tags || ['senior-friendly']);
    setShowBlockModal(true);
  };

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle.trim()) return;

    const blockData: TimeBlock = {
      period: blockPeriod,
      periodLabel: blockPeriodLabel,
      title: blockTitle.trim(),
      description: blockDesc.trim(),
      altitude: blockAltitude ? parseInt(blockAltitude) : undefined,
      tags: blockTags,
      transport: blockTransportFrom && blockTransportTo ? {
        type: blockTransportType,
        from: blockTransportFrom,
        to: blockTransportTo,
        stpCoverage: blockSTPCoverage,
        discountNote: blockSTPCoverage === 'free' ? 'STP 100% 免費' : 'STP 50% 折扣',
      } : undefined,
    };

    if (editingBlockIndex !== null) {
      updateTimeBlock(dayData.day, editingBlockIndex, blockData);
    } else {
      addTimeBlock(dayData.day, blockData);
    }

    setShowBlockModal(false);
  };

  const handleSaveDayInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateDay(dayData.day, {
      title: dayTitle.trim(),
      subtitle: daySubtitle.trim(),
      baseId: dayBaseId,
    });
    setShowEditDayModal(false);
  };

  const handleDeleteCurrentDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`確定要刪除 Day ${dayData.day} 整天的行程規劃嗎？`)) {
      deleteDay(dayData.day);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl transition-all duration-200 hover:border-slate-700/80 mb-4">
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

        {/* 右側操作按鈕 */}
        <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDayTitle(dayData.title);
              setDaySubtitle(dayData.subtitle);
              setDayBaseId(dayData.baseId);
              setShowEditDayModal(true);
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="自由編輯此天標題與基地"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDeleteCurrentDay}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
            title="刪除此天行程"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors ml-1">
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
              {/* 1. 三時段活動列表 + 新增活動按鈕 (需求 2 行程自由規劃) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>當日活動時序 ({dayData.timeBlocks.length} 項)</span>
                  </h4>
                  <button
                    onClick={handleOpenAddBlock}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-800/60 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增活動/景點</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {dayData.timeBlocks.map((block, idx) => (
                    <TimeBlockCard
                      key={idx}
                      block={block}
                      onEdit={() => handleOpenEditBlock(block, idx)}
                      onDelete={() => deleteTimeBlock(dayData.day, idx)}
                    />
                  ))}
                </div>
              </div>

              {/* 2. 美食與餐飲建議區塊 */}
              {dayData.foodNotes && dayData.foodNotes.length > 0 && (
                <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800/80 space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>美食推薦 & 自煮筆記</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {dayData.foodNotes.map((food, fIdx) => (
                      <div
                        key={fIdx}
                        className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 space-y-1"
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
                  <div className="bg-sky-950/30 border border-sky-900/50 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-sky-200">
                    <CloudSun className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sky-300 block mb-0.5">天氣與氣溫提醒</span>
                      <p className="leading-relaxed opacity-90">{dayData.weatherAlert}</p>
                    </div>
                  </div>
                )}

                {dayData.packingReminders && dayData.packingReminders.length > 0 && (
                  <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-200">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>在地圖中查看路線</span>
                  </button>

                  <button
                    onClick={() => navigate('/bookings')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>住宿與車票須知</span>
                  </button>
                </div>

                <button
                  onClick={() => navigate('/budget')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition-colors ml-auto"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>記錄此天支出</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal 1: 編輯當天整體資訊 */}
      {showEditDayModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">編輯 Day {dayData.day} 資訊</h3>
              <button onClick={() => setShowEditDayModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDayInfo} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">所屬基地城市</label>
                <select
                  value={dayBaseId}
                  onChange={(e) => setDayBaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {config.bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameZh} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">當天主要標題</label>
                <input
                  type="text"
                  required
                  value={dayTitle}
                  onChange={(e) => setDayTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">路線與副標題</label>
                <input
                  type="text"
                  value={daySubtitle}
                  onChange={(e) => setDaySubtitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditDayModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
                >
                  儲存資訊
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: 自由新增 / 編輯活動景點 */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingBlockIndex !== null ? '編輯活動時段' : '新增自訂活動景點'}
              </h3>
              <button onClick={() => setShowBlockModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">時段分組</label>
                  <select
                    value={blockPeriod}
                    onChange={(e) => setBlockPeriod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="morning">上午 (Morning)</option>
                    <option value="afternoon">下午 (Afternoon)</option>
                    <option value="evening">晚上 (Evening)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">時間標記 (文字)</label>
                  <input
                    type="text"
                    value={blockPeriodLabel}
                    onChange={(e) => setBlockPeriodLabel(e.target.value)}
                    placeholder="例如: 上午 09:00 - 12:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">活動/景點標題</label>
                <input
                  type="text"
                  required
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="例如: First 懸崖天空步道散步"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">活動細節說明</label>
                <textarea
                  rows={3}
                  value={blockDesc}
                  onChange={(e) => setBlockDesc(e.target.value)}
                  placeholder="詳細行程規劃、注意事宜..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">海拔公尺 (選填)</label>
                <input
                  type="number"
                  value={blockAltitude}
                  onChange={(e) => setBlockAltitude(e.target.value)}
                  placeholder="例如: 2168"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              {/* 交通細節 */}
              <div className="border-t border-slate-800 pt-2 space-y-2">
                <span className="font-bold text-sky-400 block">交通安排 (選填)：</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={blockTransportFrom}
                    onChange={(e) => setBlockTransportFrom(e.target.value)}
                    placeholder="出發站 (例: Luzern)"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={blockTransportTo}
                    onChange={(e) => setBlockTransportTo(e.target.value)}
                    placeholder="抵達站 (例: Interlaken)"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={blockTransportType}
                    onChange={(e) => setBlockTransportType(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                  >
                    <option value="train">火車 (Train)</option>
                    <option value="cogwheel">齒軌火車 (Cogwheel)</option>
                    <option value="cable-car">高空纜車 (Cable Car)</option>
                    <option value="boat">渡輪遊船 (Boat)</option>
                    <option value="bus">公車 (Bus)</option>
                    <option value="walk">步行慢活 (Walk)</option>
                  </select>
                  <select
                    value={blockSTPCoverage}
                    onChange={(e) => setBlockSTPCoverage(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white"
                  >
                    <option value="free">STP 100% 免費</option>
                    <option value="half-price">STP 50% 折扣</option>
                    <option value="not-covered">自費無折扣</option>
                  </select>
                </div>
              </div>

              {/* 角色標籤選擇 */}
              <div className="border-t border-slate-800 pt-2">
                <span className="font-bold text-slate-300 block mb-1">適合成員標籤：</span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { tag: 'senior-friendly' as PersonaTag, label: '🧓 長輩友善' },
                    { tag: 'kids-highlight' as PersonaTag, label: '🧒 兒童亮點' },
                    { tag: 'budget-shopping' as PersonaTag, label: '🛒 超市/購物' },
                    { tag: 'scenic-train' as PersonaTag, label: '🚂 景觀交通' },
                  ].map(({ tag, label }) => {
                    const isSelected = blockTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setBlockTags(blockTags.filter((t) => t !== tag));
                          } else {
                            setBlockTags([...blockTags, tag]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-slate-800 text-white border-sky-400'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  儲存活動
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
