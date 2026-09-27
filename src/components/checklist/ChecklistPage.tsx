import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Layers, 
  ChevronDown, 
  Users, 
  Baby, 
  FileText, 
  Smartphone, 
  HeartPulse, 
  Package 
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import type { ChecklistCategory } from '../../types';

interface CategoryConfig {
  key: ChecklistCategory | 'all';
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'all', label: '全部清單', icon: Layers, description: '顯示所有出國行李與備品', color: '#0EA5E9' },
  { key: 'clothing', label: '洋蔥式穿搭', icon: Package, description: '0m 至 3,883m 全海拔保暖防風防雪衣物', color: '#10B981' },
  { key: 'seniors', label: '長輩專屬', icon: Users, description: '避震登山杖、護膝、保溫熱水瓶與關節常備藥', color: '#F59E0B' },
  { key: 'kids', label: '幼童專屬', icon: Baby, description: '高山雪圈玩水替換乾衣物、兒童防曬乳與隨身零嘴', color: '#EC4899' },
  { key: 'documents', label: '證件檔案', icon: FileText, description: '護照正本、Swiss Travel Pass 與申根英文保單', color: '#8B5CF6' },
  { key: 'electronics', label: '電子電器', icon: Smartphone, description: '瑞士 Type J 專用六角轉接頭、大容量行動電源', color: '#3B82F6' },
  { key: 'medicine', label: '醫藥保健', icon: HeartPulse, description: '高山適應備藥、暈車藥、腸胃消炎與止痛外用藥', color: '#EF4444' },
];

export const ChecklistPage: React.FC = () => {
  const { checklist, toggleChecklistItem, addChecklistItem } = useTripStore();
  
  // 當前選取的分類 (預設為 'clothing' 或 'all'，支援下拉選單如圖二)
  const [selectedCategory, setSelectedCategory] = useState<ChecklistCategory | 'all'>('all');
  const [newItemText, setNewItemText] = useState('');
  const [altitudeRange, setAltitudeRange] = useState('');

  // 依據所選分類篩選清單
  const filteredList = useMemo(() => {
    if (selectedCategory === 'all') {
      return checklist;
    }
    return checklist.filter((item) => item.category === selectedCategory);
  }, [checklist, selectedCategory]);

  // 全域總進度
  const totalCompleted = checklist.filter((c) => c.checked).length;
  const totalPercent = checklist.length > 0 ? Math.round((totalCompleted / checklist.length) * 100) : 0;

  // 當前類別進度
  const currentCategoryCompleted = filteredList.filter((c) => c.checked).length;
  const currentCategoryPercent = filteredList.length > 0 
    ? Math.round((currentCategoryCompleted / filteredList.length) * 100) 
    : 0;

  const currentCatMeta = CATEGORIES.find((c) => c.key === selectedCategory) || CATEGORIES[0];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const targetCategory: ChecklistCategory = selectedCategory === 'all' ? 'clothing' : selectedCategory;
    const catLabel = CATEGORIES.find((c) => c.key === targetCategory)?.label || '行李清單';

    addChecklistItem({
      category: targetCategory,
      categoryLabel: catLabel,
      item: newItemText.trim(),
      checked: false,
      priority: 'high',
      altitudeRange: altitudeRange.trim() || undefined,
    });

    setNewItemText('');
    setAltitudeRange('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 頁面標題與總進度看板 */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🧳</span>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                全家出國行前準備與行李清單 (Checklist)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              三代同堂 7 人專屬清單：洋蔥式穿搭、長輩照護配件、幼童隨身備品、瑞士專用轉接頭與證件。
            </p>
          </div>

          {/* 全域打包進度大膠囊 */}
          <div className="bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 min-w-[200px] shrink-0">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-semibold">總體準備進度</span>
              <span className="text-emerald-400 font-bold font-mono text-sm">{totalPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden mb-1">
              <div
                style={{ width: `${totalPercent}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              />
            </div>
            <div className="text-[11px] text-slate-500 text-right">
              已完成 {totalCompleted} / {checklist.length} 項
            </div>
          </div>
        </div>
      </div>

      {/* 類別篩選控制區 (如圖二所示：下拉選單 + 橫向切換藥丸) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              整理類別選擇：
            </span>
            {/* 下拉選單 (如圖二操作) */}
            <div className="relative inline-block">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ChecklistCategory | 'all')}
                className="appearance-none bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-8 py-1.5 text-xs sm:text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-md"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 當前類別小計 */}
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>{currentCatMeta.label}進度：</span>
            <span className="font-bold text-emerald-400 font-mono">
              {currentCategoryCompleted} / {filteredList.length} ({currentCategoryPercent}%)
            </span>
          </div>
        </div>

        {/* 橫向切換 Pills 標籤列 (手機可滑動) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800/80 pt-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            const count = cat.key === 'all' 
              ? checklist.length 
              : checklist.filter(c => c.category === cat.key).length;

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-slate-800 text-white border-emerald-500 shadow-md ring-1 ring-emerald-500'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-70 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 快速新增備品表單 */}
        <form onSubmit={handleAddItem} className="pt-2 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder={`新增項目至【${currentCatMeta.label}】...`}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={altitudeRange}
            onChange={(e) => setAltitudeRange(e.target.value)}
            placeholder="海拔/用途標註 (選填，如: 3000m+)"
            className="w-full sm:w-48 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-md shadow-emerald-950"
          >
            <Plus className="w-4 h-4" />
            <span>新增備品</span>
          </button>
        </form>
      </div>

      {/* 清單卡片清單 (依所選類別過濾顯示，達成需求 4) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold flex items-center gap-1.5">
            <currentCatMeta.icon className="w-4 h-4 text-emerald-400" />
            <span>
              {selectedCategory === 'all' 
                ? '全部清單一覽' 
                : `【${currentCatMeta.label}】應整理之專屬備品清單`}
            </span>
          </span>
          <span className="text-[11px] text-slate-500">點擊整列直接標記完成</span>
        </div>

        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            此類別目前尚無項目，可在上方直接新增！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none ${
                  item.checked
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md'
                }`}
              >
                <div className="mt-0.5 text-emerald-400 shrink-0">
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span
                    className={`text-xs sm:text-sm font-medium block leading-relaxed ${
                      item.checked ? 'line-through text-slate-500' : 'text-slate-100 font-semibold'
                    }`}
                  >
                    {item.item}
                  </span>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {item.altitudeRange && (
                      <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-900/60">
                        {item.altitudeRange}
                      </span>
                    )}
                    {item.categoryLabel && (
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        #{item.categoryLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
