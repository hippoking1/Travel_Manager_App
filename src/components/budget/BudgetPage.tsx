import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  BadgePercent, 
  CheckCircle2, 
  Coins, 
  ShoppingBag 
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { useUIStore } from '../../stores/uiStore';
import { STP_RULES } from '../../data/stp-rules';
import { convertCurrency, formatMoney, calculateGermanTaxRefund } from '../../utils/currency';
import type { ExpenseCategory } from '../../types';

export const BudgetPage: React.FC = () => {
  const { expenses, addExpense, deleteExpense, config, itinerary } = useTripStore();
  const { displayCurrency, setDisplayCurrency } = useUIStore();

  // 新增記帳表單狀態
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('CHF');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [note, setNote] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>('爸爸');
  const [dayNumber, setDayNumber] = useState<string>('1');

  // 德國購物退稅試算狀態
  const [germanyShoppingEUR, setGermanyShoppingEUR] = useState<string>('240');

  // 計算總支出 (依據當前選定的顯示幣別)
  const totalExpenseInDisplay = expenses.reduce((sum, item) => {
    const converted = convertCurrency(item.amount, item.currency, displayCurrency, config.currencies.rates);
    return sum + converted;
  }, 0);

  // 計算 STP 為全家 7 人所省下的總瑞士法郎金額
  // 4 位成人 (STP 免費或半價) + 3 位兒童 (Family Card 100% 免票)
  const totalSTPSavedCHF = STP_RULES.reduce((acc, rule) => {
    // 4 成人省下
    const adultSavingPerPerson = rule.originalPriceCHF - rule.stpPriceCHF;
    const adultTotal = adultSavingPerPerson * 4;
    // 3 兒童省下 (原價全部免費)
    const kidTotal = rule.originalPriceCHF * 3;
    return acc + adultTotal + kidTotal;
  }, 0);

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return;

    addExpense({
      amount: num,
      currency,
      category,
      note: note.trim() || '日常開支',
      paidBy,
      dayNumber: parseInt(dayNumber) || 1,
    });

    setAmount('');
    setNote('');
  };

  const refundResult = calculateGermanTaxRefund(parseFloat(germanyShoppingEUR) || 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* 頁面標題與幣別切換列 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-400" />
            <span>智能 STP 預算與記帳中心</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            預載瑞士通票 STP + 家庭卡免票規則，追蹤旅程實時開銷並試算德國 19% 退稅。
          </p>
        </div>

        {/* 幣別切換膠囊 */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl self-start sm:self-auto">
          <span className="text-xs text-slate-400 px-2 font-medium">顯示幣別：</span>
          {(['CHF', 'TWD', 'EUR'] as const).map((curr) => (
            <button
              key={curr}
              onClick={() => setDisplayCurrency(curr)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                displayCurrency === curr
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* 頂部數據看板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 看板 1: 目前累積總花費 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              全家旅費總支出
            </span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {formatMoney(totalExpenseInDisplay, displayCurrency)}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            共記錄 {expenses.length} 筆收據，即時同步至 Google Sheets
          </p>
        </div>

        {/* 看板 2: STP 通票省下金額 (神級指標) */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-emerald-900/60 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              STP + 家庭卡已省下
            </span>
            <BadgePercent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {formatMoney(
              convertCurrency(totalSTPSavedCHF, 'CHF', displayCurrency, config.currencies.rates),
              displayCurrency
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            含 4 位大人 15-Day STP 與 3 位孩童 Swiss Family Card 全程免票
          </p>
        </div>

        {/* 看板 3: 德國跨境退稅估算 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-900/60 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              德國 19% 跨境退稅
            </span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
              € {refundResult.estimatedRefundEUR}
              <span className="text-xs text-purple-400 font-normal ml-2">
                (約 NT$ {refundResult.estimatedRefundTWD})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
            <span>採買金額 €</span>
            <input
              type="number"
              value={germanyShoppingEUR}
              onChange={(e) => setGermanyShoppingEUR(e.target.value)}
              className="w-16 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700 text-white font-mono text-xs focus:ring-1 focus:ring-purple-400"
              placeholder="歐元"
            />
            <span>(滿€50退稅)</span>
          </div>
        </div>
      </div>

      {/* 中段：記帳表單與收據列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：快速記帳表單 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-red-500" />
            <span>新增一筆開銷</span>
          </h3>

          <form onSubmit={handleSubmitExpense} className="space-y-3">
            {/* 金額與幣別 */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
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
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-bold"
                >
                  <option value="CHF">CHF</option>
                  <option value="EUR">EUR</option>
                  <option value="TWD">TWD</option>
                </select>
              </div>
            </div>

            {/* 分類與所屬天數 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  費用分類
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="food">餐飲/自煮採買</option>
                  <option value="transport">交通/纜車票</option>
                  <option value="activity">活動/門票</option>
                  <option value="shopping">紀念品/藥妝</option>
                  <option value="accommodation">住宿/房費</option>
                  <option value="other">其他雜支</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  第幾天 (Day)
                </label>
                <select
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {Array.from({ length: config.totalDays || itinerary.length || 1 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Day {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 付款人 */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                付款人 / 刷卡人
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {config.travelers.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({t.roleLabel})
                  </option>
                ))}
              </select>
            </div>

            {/* 備註說明 */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                項目說明備註
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：Coop 鮮奶火腿、Gornergrat車票"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>記上一筆 (自動同步雲端)</span>
            </button>
          </form>
        </div>

        {/* 右側：費用收據明細列表 */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              收據紀錄明細 ({expenses.length})
            </h3>
            <span className="text-xs text-slate-400">最新在上</span>
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              目前尚未記錄任何開支，在左側表單快速新增第一筆吧！
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                      {exp.dayNumber ? `D${exp.dayNumber}` : '—'}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        {exp.note}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {exp.paidBy && <span className="text-sky-400 mr-2">由 {exp.paidBy} 支付</span>}
                        <span>{new Date(exp.timestamp).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
                        {formatMoney(exp.amount, exp.currency)}
                      </div>
                      {exp.currency !== displayCurrency && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          ≈ {formatMoney(convertCurrency(exp.amount, exp.currency, displayCurrency, config.currencies.rates), displayCurrency)}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="刪除此筆記錄"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 底部模組：Swiss Travel Pass 16 天精算規則表 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Swiss Travel Pass (STP) 官方票價省錢計算表</span>
            </h3>
            <p className="text-xs text-slate-400">
              4 位成人持有 15-Day STP；3 位孩童 (8, 10, 12歲) 持有免費 Swiss Family Card。
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase">
              <tr>
                <th className="py-2.5 px-3">路線 / 名峰景點</th>
                <th className="py-2.5 px-3">成人原價</th>
                <th className="py-2.5 px-3">STP 特惠價</th>
                <th className="py-2.5 px-3">折扣比例</th>
                <th className="py-2.5 px-3">兒童家庭卡</th>
                <th className="py-2.5 px-3">7人全家合計省下</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {STP_RULES.map((rule) => {
                const adultSavings = (rule.originalPriceCHF - rule.stpPriceCHF) * 4;
                const kidSavings = rule.originalPriceCHF * 3;
                const totalSaving = adultSavings + kidSavings;

                return (
                  <tr key={rule.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      <div>{rule.name}</div>
                      <div className="text-[10px] text-slate-400">{rule.route}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      CHF {rule.originalPriceCHF}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {rule.stpPriceCHF === 0 ? (
                        <span className="text-emerald-400">0 (全免)</span>
                      ) : (
                        `CHF ${rule.stpPriceCHF}`
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        rule.discountPercentage === 100
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {rule.discountPercentage}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-sky-300">
                      {rule.familyCardRule}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      + CHF {totalSaving.toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
