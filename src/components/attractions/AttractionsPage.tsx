import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Compass, 
  Plus, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  Clock, 
  Inbox, 
  Search, 
  Calendar, 
  Landmark, 
  Train,
  Map as MapIcon
} from 'lucide-react';
import type { TimeBlock, LocationCategory } from '../../types';
import { SCENIC_SUB_TAGS, PERSONA_CONFIG } from '../../types';
import { useTripStore } from '../../stores/tripStore';
import { useItinerary, useBacklog, useConfig } from '../../stores/selectors';
import { inferLocationCategory } from '../../lib/geo/extractLocations';
import { useConfirm } from '../ui/ConfirmDialog';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import { EmptyState } from '../ui/EmptyState';
import { ActivityEditor } from '../itinerary/planner/ActivityEditor';

interface ItineraryItemWithDay {
  block: TimeBlock;
  dayNumber: number;
  dayTitle: string;
  dayId?: string;
}

export const AttractionsPage: React.FC = () => {
  const navigate = useNavigate();
  const itinerary = useItinerary();
  const backlog = useBacklog();
  const config = useConfig();
  const { deleteTimeBlockById, moveBlock } = useTripStore();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'itinerary' | 'backlog'>('itinerary');
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [selectedCategories, setSelectedCategories] = useState<LocationCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 編輯與新增 Modal 狀態
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [targetDayForAdd, setTargetDayForAdd] = useState<number | 'backlog'>(1);

  // 攤平行程中的所有景點，標記天數
  const allItinerarySpots: ItineraryItemWithDay[] = useMemo(() => {
    const list: ItineraryItemWithDay[] = [];
    itinerary.forEach((day) => {
      day.timeBlocks.forEach((block) => {
        list.push({
          block,
          dayNumber: day.day,
          dayTitle: day.title,
          dayId: day.id,
        });
      });
    });
    return list;
  }, [itinerary]);

  // 次標籤分類統計 (用於按鈕計數)
  const categoryCounts = useMemo(() => {
    const counts: Record<LocationCategory, number> = {
      peak: 0,
      culture: 0,
      shopping: 0,
      attraction: 0,
      base: 0,
      station: 0,
    };

    const targetList = activeTab === 'itinerary' 
      ? allItinerarySpots.map((item) => item.block)
      : backlog;

    targetList.forEach((block) => {
      const cat = inferLocationCategory(block);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
      // 若有 subCategories 亦計數
      block.subCategories?.forEach((subCat) => {
        if (subCat !== cat && counts[subCat] !== undefined) {
          counts[subCat]++;
        }
      });
    });

    return counts;
  }, [allItinerarySpots, backlog, activeTab]);

  // 篩選行程景點
  const filteredItinerarySpots = useMemo(() => {
    return allItinerarySpots.filter(({ block, dayNumber }) => {
      // 1. 天數篩選
      if (selectedDay !== 'all' && dayNumber !== selectedDay) {
        return false;
      }

      // 2. 標籤多重篩選
      if (selectedCategories.length > 0) {
        const cat = inferLocationCategory(block);
        const hasDirectCat = selectedCategories.includes(cat);
        const hasSubCat = block.subCategories?.some((sc) => selectedCategories.includes(sc));
        if (!hasDirectCat && !hasSubCat) return false;
      }

      // 3. 搜尋字串
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = block.title.toLowerCase().includes(q);
        const matchLoc = block.locationName?.toLowerCase().includes(q) || false;
        const matchDesc = block.description?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchLoc && !matchDesc) return false;
      }

      return true;
    });
  }, [allItinerarySpots, selectedDay, selectedCategories, searchQuery]);

  // 篩選待排景點池 (Backlog)
  const filteredBacklogSpots = useMemo(() => {
    return backlog.filter((block) => {
      // 1. 標籤多重篩選
      if (selectedCategories.length > 0) {
        const cat = inferLocationCategory(block);
        const hasDirectCat = selectedCategories.includes(cat);
        const hasSubCat = block.subCategories?.some((sc) => selectedCategories.includes(sc));
        if (!hasDirectCat && !hasSubCat) return false;
      }

      // 2. 搜尋字串
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = block.title.toLowerCase().includes(q);
        const matchLoc = block.locationName?.toLowerCase().includes(q) || false;
        const matchDesc = block.description?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchLoc && !matchDesc) return false;
      }

      return true;
    });
  }, [backlog, selectedCategories, searchQuery]);

  // 切換次標籤多選狀態
  const handleToggleCategory = (cat: LocationCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // 開啟新增景點
  const handleOpenAdd = (isBacklog = false) => {
    setEditingBlock(null);
    setTargetDayForAdd(isBacklog ? 'backlog' : (selectedDay === 'all' ? 1 : selectedDay));
    setShowEditorModal(true);
  };

  // 開啟編輯景點
  const handleOpenEdit = (block: TimeBlock) => {
    setEditingBlock(block);
    setShowEditorModal(true);
  };

  // 刪除景點
  const handleDeleteSpot = async (block: TimeBlock) => {
    const ok = await confirm({
      title: `確定要刪除「${block.title}」嗎？`,
      message: '刪除後將無法還原此景點資料。',
      danger: true,
      confirmLabel: '確認刪除',
    });
    if (ok && block.id) {
      deleteTimeBlockById(block.id);
    }
  };

  // 移入待排景點池
  const handleMoveToBacklog = (block: TimeBlock) => {
    if (block.id) {
      moveBlock(block.id, 'backlog', 0);
    }
  };

  // 將待排景點排入指定天數
  const handleAssignToDay = (block: TimeBlock, targetDayNum: number) => {
    if (!block.id) return;
    const targetDay = itinerary.find((d) => d.day === targetDayNum);
    const containerId = targetDay?.id || String(targetDayNum);
    moveBlock(block.id, containerId, targetDay ? targetDay.timeBlocks.length : 0);
  };

  // 取得 Google Maps URL
  const getMapsUrl = (block: TimeBlock): string => {
    if (block.googleMapsUrl && block.googleMapsUrl.trim().length > 0) {
      return block.googleMapsUrl.trim();
    }
    if (block.coordinates && block.coordinates[0] !== 0 && block.coordinates[1] !== 0) {
      return `https://www.google.com/maps/search/?api=1&query=${block.coordinates[0]},${block.coordinates[1]}`;
    }
    const query = block.locationName || block.title;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
      {/* 頁面標題 */}
      <PageHeader
        title={`${config.tripName || '旅行'} 景點與景點池清單`}
        subtitle="集中檢視全行程景點、多重標籤精準篩選、快速開啟 Google 地圖導航與日程彈性調配"
        emoji="🏛️"
        actions={
          <div className="flex items-center gap-2.5">
            <SegmentedControl<'itinerary' | 'backlog'>
              value={activeTab}
              onChange={(val) => setActiveTab(val)}
              options={[
                {
                  value: 'itinerary',
                  label: `行程景點 (${allItinerarySpots.length})`,
                  icon: <Landmark className="w-4 h-4" />,
                },
                {
                  value: 'backlog',
                  label: `待排景點池 (${backlog.length})`,
                  icon: <Inbox className="w-4 h-4" />,
                },
              ]}
            />

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenAdd(activeTab === 'backlog')}
              icon={<Plus className="w-4 h-4" />}
            >
              {activeTab === 'itinerary' ? '新增景點' : '新增想去靈感'}
            </Button>
          </div>
        }
      />

      {/* 篩選控制器卡片 */}
      <Card className="p-4 space-y-3.5 shadow-xs">
        {/* 天數切換 Pills (僅在「行程景點」Tab 顯示) */}
        {activeTab === 'itinerary' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>行程天數：</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDay('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedDay === 'all'
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
              }`}
            >
              全部天數 ({allItinerarySpots.length})
            </button>
            {itinerary.map((d) => {
              const isSelected = selectedDay === d.day;
              const count = d.timeBlocks.length;
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setSelectedDay(d.day)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 text-white font-bold shadow-xs'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
                  }`}
                >
                  Day {d.day} <span className="opacity-75 font-normal">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 次標籤多重篩選器 (高山名峰、歷史文化、超市購物、親子風景) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-red-500" />
              <span>地圖次標籤：</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategories([])}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                selectedCategories.length === 0
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-bold shadow-xs'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-50'
              }`}
            >
              全部分類
            </button>

            {SCENIC_SUB_TAGS.map(({ category, label, emoji }) => {
              const isSelected = selectedCategories.includes(category);
              const count = categoryCounts[category] || 0;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleToggleCategory(category)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 border-2 border-red-500 font-bold shadow-xs ring-1 ring-red-500/20'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-red-300'
                  }`}
                  title="點擊可進行多重篩選"
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* 關鍵字即時搜尋 */}
          <div className="w-full sm:w-64 shrink-0 relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="搜尋景點名稱、站點或說明..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            />
          </div>
        </div>
      </Card>

      {/* 景點清單區塊：行程景點 */}
      {activeTab === 'itinerary' && (
        <div className="space-y-3.5">
          {filteredItinerarySpots.map(({ block, dayNumber, dayTitle }) => {
            const inferredCat = inferLocationCategory(block);
            const subTagMeta = SCENIC_SUB_TAGS.find((m) => m.category === inferredCat);

            return (
              <Card
                key={block.id || `${dayNumber}_${block.title}`}
                className="transition-all hover:border-stone-300 dark:hover:border-stone-700"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* 左側資訊 */}
                  <div className="flex-1 space-y-2">
                    {/* 標籤列 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        Day {dayNumber} • {dayTitle}
                      </span>

                      {block.startTime && (
                        <span className="flex items-center gap-1 font-mono text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-teal-600" />
                          <span>{block.startTime} {block.endTime ? `~ ${block.endTime}` : ''}</span>
                        </span>
                      )}

                      {/* 地圖次標籤徽章 */}
                      {subTagMeta && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                          {subTagMeta.emoji} {subTagMeta.label}
                        </span>
                      )}

                      {/* 成員 Persona 標籤 */}
                      {block.tags?.map((t) => {
                        const meta = PERSONA_CONFIG[t];
                        if (!meta) return null;
                        return (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                          >
                            {meta.emoji} {meta.label}
                          </span>
                        );
                      })}
                    </div>

                    {/* 景點主標題 */}
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                        {block.title}
                      </h3>
                      {block.locationName && (
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span>{block.locationName}</span>
                        </span>
                      )}
                      {block.altitude && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-cyan-600 dark:text-cyan-400 border border-stone-200 dark:border-stone-700">
                          {block.altitude}m
                        </span>
                      )}
                    </div>

                    {/* 詳細說明 */}
                    {block.description && (
                      <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                        {block.description}
                      </p>
                    )}

                    {/* 交通細節 */}
                    {block.transport && (
                      <div className="inline-flex items-center gap-2 bg-stone-50 dark:bg-stone-800/60 px-2.5 py-1.5 rounded-xl border border-stone-200/60 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300">
                        <Train className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-semibold">{block.transport.from}</span>
                        <span className="text-stone-400">➔</span>
                        <span className="font-semibold">{block.transport.to}</span>
                        {block.transport.discountNote && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                            • {block.transport.discountNote}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 右側操作按鈕 */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                    {/* 地圖導航按鈕 */}
                    <a
                      href={getMapsUrl(block)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
                      title="開啟 Google 地圖精準導航與規劃路線"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Google 導航</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    {/* 地理地圖跳轉按鈕 */}
                    <button
                      type="button"
                      onClick={() => navigate('/map')}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                      title="在地理地圖頁面檢視定位"
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">地理地圖</span>
                    </button>

                    {/* 移入待排池 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveToBacklog(block)}
                      icon={<Inbox className="w-3.5 h-3.5 text-amber-600" />}
                      title="移入待排景點池暫存"
                    >
                      移入景點池
                    </Button>

                    {/* 編輯 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(block)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    />

                    {/* 刪除 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSpot(block)}
                      icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                    />
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredItinerarySpots.length === 0 && (
            <EmptyState
              icon={<Landmark className="w-6 h-6" />}
              title="無符合條件的行程景點"
              description="可嘗試清除搜尋關鍵字、重設次標籤多重篩選或選擇「全部天數」。"
              action={
                <Button variant="primary" size="sm" onClick={() => handleOpenAdd(false)}>
                  新增景點
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* 待排景點池 Tab */}
      {activeTab === 'backlog' && (
        <div className="space-y-3.5">
          {filteredBacklogSpots.map((block) => {
            const inferredCat = inferLocationCategory(block);
            const subTagMeta = SCENIC_SUB_TAGS.find((m) => m.category === inferredCat);

            return (
              <Card
                key={block.id || block.title}
                className="transition-all hover:border-stone-300 dark:hover:border-stone-700 bg-stone-50/50 dark:bg-stone-900/40"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* 左側資訊 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <Inbox className="w-3.5 h-3.5 text-amber-600" />
                        <span>待排靈感池</span>
                      </span>

                      {/* 地圖次標籤徽章 */}
                      {subTagMeta && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                          {subTagMeta.emoji} {subTagMeta.label}
                        </span>
                      )}

                      {/* 成員 Persona 標籤 */}
                      {block.tags?.map((t) => {
                        const meta = PERSONA_CONFIG[t];
                        if (!meta) return null;
                        return (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300"
                          >
                            {meta.emoji} {meta.label}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                        {block.title}
                      </h3>
                      {block.locationName && (
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span>{block.locationName}</span>
                        </span>
                      )}
                      {block.altitude && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-cyan-600 dark:text-cyan-400 border border-stone-200 dark:border-stone-700">
                          {block.altitude}m
                        </span>
                      )}
                    </div>

                    {block.description && (
                      <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                        {block.description}
                      </p>
                    )}
                  </div>

                  {/* 右側操作按鈕 */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                    {/* 地圖導航按鈕 */}
                    <a
                      href={getMapsUrl(block)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
                      title="開啟 Google 地圖精準導航與規劃路線"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>導航</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    {/* 排入指定天數選單 */}
                    <div className="relative group">
                      <Select
                        className="text-xs py-1.5 h-8 w-28 font-semibold"
                        value=""
                        onChange={(e) => {
                          const dayNum = parseInt(e.target.value, 10);
                          if (!isNaN(dayNum)) {
                            handleAssignToDay(block, dayNum);
                          }
                        }}
                      >
                        <option value="" disabled>
                          排入天數...
                        </option>
                        {itinerary.map((d) => (
                          <option key={d.day} value={d.day}>
                            排入 Day {d.day}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {/* 編輯 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(block)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    />

                    {/* 刪除 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSpot(block)}
                      icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                    />
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredBacklogSpots.length === 0 && (
            <EmptyState
              icon={<Inbox className="w-6 h-6" />}
              title="待排景點池尚無項目"
              description="可隨時將行程卡片移入此處暫存，或點擊下方新增想要造訪的特色景點靈感。"
              action={
                <Button variant="primary" size="sm" onClick={() => handleOpenAdd(true)}>
                  新增想去景點靈感
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* 新增/編輯活動 Modal */}
      {showEditorModal && (
        <ActivityEditor
          isOpen={showEditorModal}
          onClose={() => setShowEditorModal(false)}
          dayIdOrNumber={targetDayForAdd === 'backlog' ? undefined : targetDayForAdd}
          isBacklog={targetDayForAdd === 'backlog'}
          initialBlock={editingBlock}
        />
      )}
    </div>
  );
};

export default AttractionsPage;
