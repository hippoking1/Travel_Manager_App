import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Pencil,
  BadgePercent,
  CheckCircle2,
  Coins,
  ShoppingBag,
  PieChart as PieIcon,
  Filter,
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { useUIStore } from '../../stores/uiStore';
import { useActiveTrip } from '../../stores/selectors';
import { STP_RULES } from '../../data/stp-rules';
import { convertCurrency, formatMoney, calculateGermanTaxRefund } from '../../utils/currency';
import { hasModule } from '../../config/modules';
import { useConfirm } from '../ui/ConfirmDialog';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../ui/PageHeader';
import type { ExpenseCategory, ExpenseRecord } from '../../types';

const CATEGORY_MAP: Record<ExpenseCategory, { label: string; color: string }> = {
  food: { label: '餐飲/自煮採買', color: '#F59E0B' },
  transport: { label: '交通/纜車票', color: '#0EA5E9' },
  activity: { label: '活動/門票', color: '#10B981' },
  shopping: { label: '紀念品/藥妝', color: '#EC4899' },
  accommodation: { label: '住宿/房費', color: '#8B5CF6' },
  other: { label: '其他雜支', color: '#64748B' },
};

export const BudgetPage: React.FC = () => {
  const activeTrip = useActiveTrip();
  const { expenses, addExpense, updateExpense, deleteExpense, config, itinerary } = useTripStore();
  const { displayCurrency, setDisplayCurrency } = useUIStore();
  const confirm = useConfirm();

  const isSwiss = hasModule(activeTrip?.modules, 'swiss');

  // 取得支援幣別清單
  const availableCurrencies = useMemo(() => {
    const list = Object.keys(config.currencies?.rates || {});
    if (config.currencies?.primary && !list.includes(config.currencies.primary)) {
      list.unshift(config.currencies.primary);
    }
    const filtered = list.filter((c): c is 'CHF' | 'EUR' | 'TWD' => c === 'CHF' || c === 'EUR' || c === 'TWD');
    return filtered.length > 0 ? filtered : (['CHF', 'TWD', 'EUR'] as const);
  }, [config.currencies]);

  // 新增記帳表單狀態
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>(config.currencies?.primary || 'CHF');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [note, setNote] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>(config.travelers?.[0]?.name || '自己');
  const [dayNumber, setDayNumber] = useState<string>('1');

  // 編輯記帳彈窗狀態
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editCurrency, setEditCurrency] = useState<string>('CHF');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('food');
  const [editNote, setEditNote] = useState<string>('');
  const [editPaidBy, setEditPaidBy] = useState<string>('');
  const [editDayNumber, setEditDayNumber] = useState<string>('1');

  // 篩選分類
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // 德國購物退稅試算狀態 (僅瑞士/德瑞特色模組)
  const [germanyShoppingEUR, setGermanyShoppingEUR] = useState<string>('240');

  // 計算總支出 (依據當前選定的顯示幣別)
  const totalExpenseInDisplay = useMemo(() => {
    return expenses.reduce((sum, item) => {
      const converted = convertCurrency(item.amount, item.currency, displayCurrency, config.currencies.rates);
      return sum + converted;
    }, 0);
  }, [expenses, displayCurrency, config.currencies]);

  // 動態計算同行成人與兒童人數
  const { adultCount, childCount } = useMemo(() => {
    const travelers = config.travelers || [];
    if (travelers.length === 0) return { adultCount: 4, childCount: 3 };
    const children = travelers.filter((t) => t.role === 'kid' || t.age < 16).length;
    const adults = travelers.length - children;
    return { adultCount: Math.max(1, adults), childCount: children };
  }, [config.travelers]);

  // STP 省下的總金額 (動態人數)
  const totalSTPSavedCHF = useMemo(() => {
    return STP_RULES.reduce((acc, rule) => {
      const adultSavingPerPerson = rule.originalPriceCHF - rule.stpPriceCHF;
      const adultTotal = adultSavingPerPerson * adultCount;
      const kidTotal = rule.originalPriceCHF * childCount;
      return acc + adultTotal + kidTotal;
    }, 0);
  }, [adultCount, childCount]);

  // 類別支出統計
  const categoryStats = useMemo(() => {
    const stats: Record<ExpenseCategory, number> = {
      food: 0,
      transport: 0,
      activity: 0,
      shopping: 0,
      accommodation: 0,
      other: 0,
    };
    for (const exp of expenses) {
      const converted = convertCurrency(exp.amount, exp.currency, displayCurrency, config.currencies.rates);
      if (stats[exp.category] !== undefined) {
        stats[exp.category] += converted;
      } else {
        stats.other += converted;
      }
    }
    return stats;
  }, [expenses, displayCurrency, config.currencies]);

  // 篩選後的收據清單
  const filteredExpenses = useMemo(() => {
    if (filterCategory === 'all') return expenses;
    return expenses.filter((e) => e.category === filterCategory);
  }, [expenses, filterCategory]);

  // 每日平均花費
  const totalDays = config.totalDays || itinerary.length || 1;
  const dailyAverageInDisplay = totalDays > 0 ? totalExpenseInDisplay / totalDays : 0;

  // 最高花費類別
  const topCategory = useMemo(() => {
    let maxCat: ExpenseCategory = 'food';
    let maxVal = -1;
    (Object.keys(categoryStats) as ExpenseCategory[]).forEach((cat) => {
      if (categoryStats[cat] > maxVal) {
        maxVal = categoryStats[cat];
        maxCat = cat;
      }
    });
    return { category: maxCat, amount: maxVal, percent: totalExpenseInDisplay > 0 ? Math.round((maxVal / totalExpenseInDisplay) * 100) : 0 };
  }, [categoryStats, totalExpenseInDisplay]);

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    addExpense({
      amount: num,
      currency,
      category,
      note: note.trim() || '日常開支',
      paidBy: paidBy || '自己',
      dayNumber: parseInt(dayNumber) || 1,
    });

    setAmount('');
    setNote('');
  };

  const handleOpenEdit = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setEditAmount(String(exp.amount));
    setEditCurrency(exp.currency);
    setEditCategory(exp.category);
    setEditNote(exp.note || '');
    setEditPaidBy(exp.paidBy || '');
    setEditDayNumber(String(exp.dayNumber || 1));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const num = parseFloat(editAmount);
    if (isNaN(num) || num <= 0) return;

    updateExpense(editingExpense.id, {
      amount: num,
      currency: editCurrency,
      category: editCategory,
      note: editNote.trim() || '日常開支',
      paidBy: editPaidBy.trim(),
      dayNumber: parseInt(editDayNumber) || 1,
    });

    setEditingExpense(null);
  };

  const handleDeleteExpense = async (id: string, noteStr: string) => {
    const ok = await confirm({
      title: '刪除收據開銷',
      message: `確定要刪除「${noteStr || '這筆支出'}」嗎？此動作將同步移除記錄。`,
      confirmLabel: '確定刪除',
      danger: true,
    });
    if (ok) {
      deleteExpense(id);
    }
  };

  const refundResult = calculateGermanTaxRefund(parseFloat(germanyShoppingEUR) || 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <PageHeader
        title="旅行預算與記帳中心"
        subtitle="追蹤每筆旅行收據開銷、多幣別匯率換算與各類別支出佔比"
        emoji="💳"
        actions={
          <div className="flex items-center gap-2 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] p-1 rounded-xl">
            <span className="text-xs text-[var(--color-text-muted)] px-2 font-medium">切換幣別</span>
            <div className="flex gap-1">
              {availableCurrencies.map((curr) => (
                <button
                  key={curr}
                  onClick={() => setDisplayCurrency(curr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    displayCurrency === curr
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* 頂部數據看板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 看板 1: 目前累積總花費 */}
        <Card className="p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                累積總支出
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[var(--color-text)] font-mono">
              {formatMoney(totalExpenseInDisplay, displayCurrency)}
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            已記錄 {expenses.length} 筆明細 · 日均 {formatMoney(dailyAverageInDisplay, displayCurrency)}
          </p>
        </Card>

        {/* 看板 2: 瑞士特色或通用指標 */}
        {isSwiss ? (
          <Card className="p-5 border-emerald-500/40 relative overflow-hidden flex flex-col justify-between bg-emerald-500/5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  STP + 家庭卡已省下
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <BadgePercent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatMoney(
                  convertCurrency(totalSTPSavedCHF, 'CHF', displayCurrency, config.currencies.rates),
                  displayCurrency
                )}
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-3">
              依 {adultCount} 位大人 + {childCount} 位孩童免費家庭卡票價試算
            </p>
          </Card>
        ) : (
          <Card className="p-5 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  平均每日預算開銷
                </span>
                <div className="p-2 rounded-lg bg-teal-500/10 text-[var(--color-primary)]">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[var(--color-text)] font-mono">
                {formatMoney(dailyAverageInDisplay, displayCurrency)}
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-3">
              依全行程共 {totalDays} 天平攤統計
            </p>
          </Card>
        )}

        {/* 看板 3: 德國跨境退稅或最高支出類別 */}
        {isSwiss ? (
          <Card className="p-5 border-purple-500/40 relative overflow-hidden flex flex-col justify-between bg-purple-500/5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  德國 19% 跨境退稅
                </span>
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-300 font-mono">
                € {refundResult.estimatedRefundEUR}
                <span className="text-xs text-[var(--color-text-muted)] font-normal ml-2">
                  (約 NT$ {refundResult.estimatedRefundTWD})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-3">
              <span>採買試算 €</span>
              <input
                type="number"
                value={germanyShoppingEUR}
                onChange={(e) => setGermanyShoppingEUR(e.target.value)}
                className="w-16 bg-[var(--color-bg)] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs focus:ring-1 focus:ring-purple-400"
                placeholder="金額"
              />
              <span>(德瑞邊界滿 €50 退稅)</span>
            </div>
          </Card>
        ) : (
          <Card className="p-5 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  最大開銷類別
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <PieIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[var(--color-text)] font-mono flex items-baseline gap-2">
                <span>{CATEGORY_MAP[topCategory.category]?.label || '無'}</span>
                {topCategory.percent > 0 && (
                  <span className="text-sm font-semibold text-[var(--color-primary)]">
                    {topCategory.percent}%
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-3 font-mono">
              累積 {formatMoney(topCategory.amount > 0 ? topCategory.amount : 0, displayCurrency)}
            </p>
          </Card>
        )}
      </div>

      {/* 支出類別分佈長條 / 圖表 */}
      {totalExpenseInDisplay > 0 && (
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[var(--color-primary)]" />
              <span>費用類別分佈比例</span>
            </h3>
            <span className="text-xs text-[var(--color-text-muted)] font-mono">
              總計 {formatMoney(totalExpenseInDisplay, displayCurrency)}
            </span>
          </div>

          {/* 彩色進度條 */}
          <div className="h-3 w-full rounded-full bg-[var(--color-bg-subtle)] overflow-hidden flex">
            {(Object.keys(CATEGORY_MAP) as ExpenseCategory[]).map((cat) => {
              const amountVal = categoryStats[cat];
              const pct = totalExpenseInDisplay > 0 ? (amountVal / totalExpenseInDisplay) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={cat}
                  style={{ width: `${pct}%`, backgroundColor: CATEGORY_MAP[cat].color }}
                  title={`${CATEGORY_MAP[cat].label}: ${pct.toFixed(1)}% (${formatMoney(amountVal, displayCurrency)})`}
                  className="h-full transition-all duration-300"
                />
              );
            })}
          </div>

          {/* 圖例說明 */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-xs">
            {(Object.keys(CATEGORY_MAP) as ExpenseCategory[]).map((cat) => {
              const amountVal = categoryStats[cat];
              const pct = totalExpenseInDisplay > 0 ? (amountVal / totalExpenseInDisplay) * 100 : 0;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all ${
                    filterCategory === cat
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_MAP[cat].color }}
                  />
                  <span>{CATEGORY_MAP[cat].label}</span>
                  <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                    {pct.toFixed(0)}%
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* 中段：記帳表單與收據列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：快速記帳表單 */}
        <Card className="p-5 space-y-4">
          <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[var(--color-primary)]" />
            <span>新增收據開支</span>
          </h3>

          <form onSubmit={handleSubmitExpense} className="space-y-3">
            {/* 金額與幣別 */}
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                支出金額與幣別
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-bold"
                >
                  {availableCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 分類與所屬天數 */}
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="開支分類"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              >
                {(Object.keys(CATEGORY_MAP) as ExpenseCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_MAP[cat].label}
                  </option>
                ))}
              </Select>

              <Select
                label="所屬天數"
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
              >
                {Array.from({ length: totalDays }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Day {i + 1}
                  </option>
                ))}
              </Select>
            </div>

            {/* 付款人 */}
            <Select
              label="付款人 / 刷卡人"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              {(config.travelers || []).length > 0 ? (
                config.travelers.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} {t.roleLabel ? `(${t.roleLabel})` : ''}
                  </option>
                ))
              ) : (
                <option value="自己">自己</option>
              )}
            </Select>

            {/* 備註說明 */}
            <Input
              label="項目說明備註"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例如：超市採買、登山纜車票、午餐"
            />

            <Button type="submit" variant="primary" className="w-full justify-center">
              <Plus className="w-4 h-4 mr-1.5" />
              <span>記上一筆</span>
            </Button>
          </form>
        </Card>

        {/* 右側：收據明細列表 */}
        <Card className="lg:col-span-2 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--color-text)]">
                收據紀錄明細 ({filteredExpenses.length})
              </h3>
              {filterCategory !== 'all' && (
                <button
                  onClick={() => setFilterCategory('all')}
                  className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  <Filter className="w-3 h-3" />
                  <span>清除分類篩選</span>
                </button>
              )}
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">最新在上</span>
          </div>

          {filteredExpenses.length === 0 ? (
            <EmptyState
              title={expenses.length === 0 ? '目前尚未記錄任何開支' : '此分類無開銷紀錄'}
              description={expenses.length === 0 ? '在左側表單輸入金額與項目即可快速建立第一筆收據！' : '請選擇其他分類或清除篩選以查看全部。'}
            />
          ) : (
            <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
              {filteredExpenses.map((exp) => {
                const catDef = CATEGORY_MAP[exp.category] || CATEGORY_MAP.other;
                return (
                  <div
                    key={exp.id}
                    className="bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-3 hover:border-[var(--color-primary)]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 text-white"
                        style={{ backgroundColor: catDef.color }}
                      >
                        {exp.dayNumber ? `D${exp.dayNumber}` : '—'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--color-text)] truncate">
                            {exp.note}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] shrink-0">
                            {catDef.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                          {exp.paidBy && <span className="text-[var(--color-primary)] font-medium mr-2">由 {exp.paidBy} 支付</span>}
                          <span>{new Date(exp.timestamp).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold font-mono text-[var(--color-text)]">
                          {formatMoney(exp.amount, exp.currency)}
                        </div>
                        {exp.currency !== displayCurrency && (
                          <div className="text-[10px] text-[var(--color-text-muted)] font-mono">
                            ≈ {formatMoney(convertCurrency(exp.amount, exp.currency, displayCurrency, config.currencies.rates), displayCurrency)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors rounded-lg hover:bg-[var(--color-bg-subtle)]"
                          title="編輯收據"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id, exp.note)}
                          className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                          title="刪除此筆記錄"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* 編輯開支彈窗 Modal */}
      {editingExpense && (
        <Modal
          isOpen={true}
          onClose={() => setEditingExpense(null)}
          title="編輯支出開銷"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                支出金額與幣別
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono"
                />
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] font-bold"
                >
                  {availableCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                label="開支分類"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
              >
                {(Object.keys(CATEGORY_MAP) as ExpenseCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_MAP[cat].label}
                  </option>
                ))}
              </Select>

              <Select
                label="所屬天數"
                value={editDayNumber}
                onChange={(e) => setEditDayNumber(e.target.value)}
              >
                {Array.from({ length: totalDays }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Day {i + 1}
                  </option>
                ))}
              </Select>
            </div>

            <Select
              label="付款人 / 刷卡人"
              value={editPaidBy}
              onChange={(e) => setEditPaidBy(e.target.value)}
            >
              {(config.travelers || []).length > 0 ? (
                config.travelers.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} {t.roleLabel ? `(${t.roleLabel})` : ''}
                  </option>
                ))
              ) : (
                <option value="自己">自己</option>
              )}
            </Select>

            <Input
              label="項目說明備註"
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingExpense(null)}>
                取消
              </Button>
              <Button type="submit" variant="primary">
                儲存修改
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 底部模組：Swiss Travel Pass 16 天精算規則表 (僅瑞士模組顯示) */}
      {isSwiss && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Swiss Travel Pass (STP) 官方票價省錢計算表</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                依據 {adultCount} 位成人持有 STP 與 {childCount} 位孩童持有免費 Swiss Family Card 精算各名峰折扣。
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--color-text)]">
              <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-bold border-b border-[var(--color-border)] uppercase">
                <tr>
                  <th className="py-2.5 px-3">路線 / 名峰景點</th>
                  <th className="py-2.5 px-3">成人原價</th>
                  <th className="py-2.5 px-3">STP 特惠價</th>
                  <th className="py-2.5 px-3">折扣比例</th>
                  <th className="py-2.5 px-3">兒童家庭卡</th>
                  <th className="py-2.5 px-3">全家合計省下</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {STP_RULES.map((rule) => {
                  const adultSavings = (rule.originalPriceCHF - rule.stpPriceCHF) * adultCount;
                  const kidSavings = rule.originalPriceCHF * childCount;
                  const totalSaving = adultSavings + kidSavings;

                  return (
                    <tr key={rule.id} className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[var(--color-text)]">
                        <div>{rule.name}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">{rule.route}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--color-text-muted)]">
                        CHF {rule.originalPriceCHF}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-text)]">
                        {rule.stpPriceCHF === 0 ? (
                          <span className="text-emerald-500 font-bold">0 (全免)</span>
                        ) : (
                          `CHF ${rule.stpPriceCHF}`
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            rule.discountPercentage === 100
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {rule.discountPercentage}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-sky-600 dark:text-sky-400 font-medium">
                        {rule.familyCardRule}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        + CHF {totalSaving.toFixed(0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
