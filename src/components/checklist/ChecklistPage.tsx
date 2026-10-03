import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Pencil,
  Search,
  Users,
  Baby,
  FileText,
  Smartphone,
  HeartPulse,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { useActiveTrip } from '../../stores/selectors';
import { hasModule } from '../../config/modules';
import { useConfirm } from '../ui/ConfirmDialog';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../ui/PageHeader';
import type { ChecklistCategory, ChecklistItem } from '../../types';

interface CategoryConfig {
  key: ChecklistCategory | 'all';
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

export const ChecklistPage: React.FC = () => {
  const activeTrip = useActiveTrip();
  const { checklist, toggleChecklistItem, addChecklistItem, updateChecklistItem, deleteChecklistItem, config } = useTripStore();
  const confirm = useConfirm();

  const isSwiss = hasModule(activeTrip?.modules, 'swiss');

  const categories: CategoryConfig[] = useMemo(() => [
    { key: 'all', label: '全部清單', icon: Layers, description: '顯示所有打包與行李備品', color: '#0EA5E9' },
    {
      key: 'clothing',
      label: '衣物穿搭',
      icon: Package,
      description: isSwiss ? '洋蔥式穿搭：0m 至 3,883m 全海拔保暖防風防雪衣物' : '日常換洗衣物、保暖外套、休閒鞋與雨具',
      color: '#10B981',
    },
    {
      key: 'seniors',
      label: '長輩專屬',
      icon: Users,
      description: '避震登山杖、護膝、保溫熱水瓶與關節常備藥',
      color: '#F59E0B',
    },
    {
      key: 'kids',
      label: '幼童專屬',
      icon: Baby,
      description: '替換乾淨衣物、兒童防曬乳、濕紙巾與隨身安撫零嘴',
      color: '#EC4899',
    },
    {
      key: 'documents',
      label: '證件檔案',
      icon: FileText,
      description: isSwiss ? '護照正本、Swiss Travel Pass 與申根英文保單' : '護照、簽證、電子機票、保險單與重要身分證件',
      color: '#8B5CF6',
    },
    {
      key: 'electronics',
      label: '電子電器',
      icon: Smartphone,
      description: isSwiss ? '瑞士 Type J 專用六角轉接頭、大容量行動電源、充電線' : '萬國轉接頭、行動電源、相機、充電器',
      color: '#3B82F6',
    },
    {
      key: 'medicine',
      label: '醫藥保健',
      icon: HeartPulse,
      description: isSwiss ? '高山適應備藥、暈車藥、腸胃消炎與止痛外用藥' : '感冒常備藥、腸胃藥、防蚊液、止痛藥與急救包',
      color: '#EF4444',
    },
    {
      key: 'other',
      label: '其他備忘',
      icon: Sparkles,
      description: '購物袋、筆記本、小零錢包、特殊用品',
      color: '#64748B',
    },
  ], [isSwiss]);

  // 當前選取的分類
  const [selectedCategory, setSelectedCategory] = useState<ChecklistCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 新增項目狀態
  const [newItemText, setNewItemText] = useState('');
  const [altitudeRange, setAltitudeRange] = useState('');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newAssignedTo, setNewAssignedTo] = useState('');

  // 編輯項目狀態
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editItemText, setEditItemText] = useState('');
  const [editCategory, setEditCategory] = useState<ChecklistCategory>('clothing');
  const [editAltitudeRange, setEditAltitudeRange] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editAssignedTo, setEditAssignedTo] = useState('');

  // 依據分類、搜尋字串與狀態篩選
  const filteredList = useMemo(() => {
    return checklist.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (statusFilter === 'pending' && item.checked) return false;
      if (statusFilter === 'done' && !item.checked) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.item.toLowerCase().includes(query);
        const matchCategory = item.categoryLabel?.toLowerCase().includes(query);
        const matchAssignee = item.assignedTo?.toLowerCase().includes(query);
        if (!matchTitle && !matchCategory && !matchAssignee) return false;
      }
      return true;
    });
  }, [checklist, selectedCategory, statusFilter, searchQuery]);

  // 全域總進度
  const totalCompleted = checklist.filter((c) => c.checked).length;
  const totalPercent = checklist.length > 0 ? Math.round((totalCompleted / checklist.length) * 100) : 0;

  // 當前類別進度
  const currentCategoryList = useMemo(() => {
    return selectedCategory === 'all' ? checklist : checklist.filter((c) => c.category === selectedCategory);
  }, [checklist, selectedCategory]);

  const currentCategoryCompleted = currentCategoryList.filter((c) => c.checked).length;
  const currentCategoryPercent = currentCategoryList.length > 0
    ? Math.round((currentCategoryCompleted / currentCategoryList.length) * 100)
    : 0;

  const currentCatMeta = categories.find((c) => c.key === selectedCategory) || categories[0];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const targetCategory: ChecklistCategory = selectedCategory === 'all' ? 'clothing' : selectedCategory;
    const catLabel = categories.find((c) => c.key === targetCategory)?.label || '行李清單';

    addChecklistItem({
      category: targetCategory,
      categoryLabel: catLabel,
      item: newItemText.trim(),
      checked: false,
      priority: newPriority,
      assignedTo: newAssignedTo.trim() || undefined,
      altitudeRange: altitudeRange.trim() || undefined,
    });

    setNewItemText('');
    setAltitudeRange('');
  };

  const handleOpenEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setEditItemText(item.item);
    setEditCategory(item.category);
    setEditAltitudeRange(item.altitudeRange || '');
    setEditPriority(item.priority || 'medium');
    setEditAssignedTo(item.assignedTo || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editItemText.trim()) return;

    const catLabel = categories.find((c) => c.key === editCategory)?.label || '行李清單';

    updateChecklistItem(editingItem.id, {
      item: editItemText.trim(),
      category: editCategory,
      categoryLabel: catLabel,
      altitudeRange: editAltitudeRange.trim() || undefined,
      priority: editPriority,
      assignedTo: editAssignedTo.trim() || undefined,
    });

    setEditingItem(null);
  };

  const handleDeleteItem = async (id: string, itemText: string) => {
    const ok = await confirm({
      title: '刪除備忘項目',
      message: `確定要刪除「${itemText}」嗎？此動作將移除該打包清單。`,
      confirmLabel: '確定刪除',
      danger: true,
    });
    if (ok) {
      deleteChecklistItem(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 頁面標題 */}
      <PageHeader
        title="行前準備與行李打包清單"
        subtitle="分類管理出國備品、同行長輩與幼童專屬照護裝備，實時追蹤打包進度"
        emoji="🧳"
        actions={
          <div className="flex items-center gap-3 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-4 py-2 rounded-2xl">
            <div>
              <div className="text-[11px] text-[var(--color-text-muted)] font-medium">總體打包進度</div>
              <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                {totalCompleted} / {checklist.length} ({totalPercent}%)
              </div>
            </div>
            <div className="w-20 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                style={{ width: `${totalPercent}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        }
      />

      {/* 類別篩選膠囊列 */}
      <Card className="p-4 sm:p-5 space-y-4">
        {/* 橫向切換 Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            const count = cat.key === 'all'
              ? checklist.length
              : checklist.filter((c) => c.category === cat.key).length;

            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white border-transparent shadow-sm'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: isSelected ? 'white' : cat.color }} />
                <span>{cat.label}</span>
                <span className="text-[10px] opacity-80 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 類別說明與小進度 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
          <p className="leading-relaxed">
            {currentCatMeta.description}
          </p>
          <div className="shrink-0 font-medium text-right font-mono">
            {currentCatMeta.label}進度：
            <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">
              {currentCategoryCompleted} / {currentCategoryList.length} ({currentCategoryPercent}%)
            </span>
          </div>
        </div>

        {/* 搜尋與狀態切換列 */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋清單備忘、負責人或標籤..."
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="flex gap-1 bg-[var(--color-bg)] border border-[var(--color-border)] p-1 rounded-xl shrink-0 self-start sm:self-auto">
            {(['all', 'pending', 'done'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === mode
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {mode === 'all' ? '全部' : mode === 'pending' ? '未打包' : '已完成'}
              </button>
            ))}
          </div>
        </div>

        {/* 快速新增備品表單 */}
        <form onSubmit={handleAddItem} className="pt-2 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            required
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder={`新增備忘至【${currentCatMeta.label}】...`}
            className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />

          <input
            type="text"
            value={altitudeRange}
            onChange={(e) => setAltitudeRange(e.target.value)}
            placeholder="海拔/規格備註 (選填)"
            className="w-full sm:w-44 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs sm:text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />

          {config.travelers?.length > 0 && (
            <select
              value={newAssignedTo}
              onChange={(e) => setNewAssignedTo(e.target.value)}
              className="w-full sm:w-32 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-2 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">負責人 (選填)</option>
              {config.travelers.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as 'high' | 'medium' | 'low')}
            className="w-full sm:w-28 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-2 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="high">高優先</option>
            <option value="medium">一般</option>
            <option value="low">低優先</option>
          </select>

          <Button type="submit" variant="primary" className="shrink-0 justify-center">
            <Plus className="w-4 h-4 mr-1" />
            <span>新增</span>
          </Button>
        </form>
      </Card>

      {/* 清單項目列表 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
          <span className="font-semibold flex items-center gap-1.5">
            <currentCatMeta.icon className="w-4 h-4 text-[var(--color-primary)]" />
            <span>
              {selectedCategory === 'all'
                ? '全部清單一覽'
                : `【${currentCatMeta.label}】專屬備品清單`}
            </span>
          </span>
          <span className="text-[11px]">點擊核取方塊標記完成</span>
        </div>

        {filteredList.length === 0 ? (
          <EmptyState
            title="目前尚無符合的備品項目"
            description="可在上方輸入名稱與備註快速新增，或切換篩選條件查看其他項目。"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 select-none ${
                  item.checked
                    ? 'bg-[var(--color-bg-subtle)] border-[var(--color-border)] opacity-60'
                    : 'bg-[var(--color-card)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40 shadow-sm'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleChecklistItem(item.id)}
                  className="mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0 hover:scale-110 transition-transform"
                >
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Square className="w-5 h-5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]" />
                  )}
                </button>

                <div className="flex-1 min-w-0" onClick={() => toggleChecklistItem(item.id)}>
                  <span
                    className={`text-xs sm:text-sm font-medium block leading-relaxed cursor-pointer ${
                      item.checked
                        ? 'line-through text-[var(--color-text-muted)]'
                        : 'text-[var(--color-text)] font-semibold'
                    }`}
                  >
                    {item.item}
                  </span>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {item.priority === 'high' && (
                      <span className="text-[10px] text-red-600 dark:text-red-400 font-bold bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20">
                        重要
                      </span>
                    )}
                    {item.assignedTo && (
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded">
                        @{item.assignedTo}
                      </span>
                    )}
                    {item.altitudeRange && (
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                        {item.altitudeRange}
                      </span>
                    )}
                    {item.categoryLabel && (
                      <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] px-1.5 py-0.5 rounded">
                        #{item.categoryLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(item);
                    }}
                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors rounded-lg hover:bg-[var(--color-bg-subtle)]"
                    title="編輯項目"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id, item.item);
                    }}
                    className="p-1 text-[var(--color-text-muted)] hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                    title="刪除項目"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 編輯清單項目 Modal */}
      {editingItem && (
        <Modal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          title="編輯行李備忘項目"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="備忘項目名稱"
              type="text"
              required
              value={editItemText}
              onChange={(e) => setEditItemText(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                label="項目分類"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as ChecklistCategory)}
              >
                {categories.filter((c) => c.key !== 'all').map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>

              <Select
                label="優先等級"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as 'high' | 'medium' | 'low')}
              >
                <option value="high">高優先 (必備)</option>
                <option value="medium">一般</option>
                <option value="low">低優先 (非必要)</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="海拔 / 用途標註 (選填)"
                type="text"
                value={editAltitudeRange}
                onChange={(e) => setEditAltitudeRange(e.target.value)}
                placeholder="例如: 3000m+ 或 健行用"
              />

              <Select
                label="負責打包成員"
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
              >
                <option value="">不指定</option>
                {(config.travelers || []).map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                取消
              </Button>
              <Button type="submit" variant="primary">
                儲存修改
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
