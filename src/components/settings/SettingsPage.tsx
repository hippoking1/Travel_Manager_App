import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Cloud,
  Save,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Check,
  Compass,
  MapPin,
  Users,
  Coins,
  Sparkles,
  Pencil,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { useActiveTrip } from '../../stores/selectors';
import { MODULE_REGISTRY } from '../../config/modules';
import { syncManager } from '../../services/syncManager';
import { NewTripModal } from '../shared/NewTripModal';
import { useConfirm } from '../ui/ConfirmDialog';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { EmptyState } from '../ui/EmptyState';
import type { TravelerProfile, BaseInfo, DestinationModule } from '../../types';

type SettingsTab = 'general' | 'travelers' | 'bases' | 'currencies' | 'sync' | 'trips';

export const SettingsPage: React.FC = () => {
  const activeTrip = useActiveTrip();
  const {
    config,
    itinerary,
    backlog,
    trips,
    activeTripId,
    switchTrip,
    deleteTrip,
    duplicateTrip,
    updateConfig,
    deleteBase,
    setStartDate,
    setTotalDays,
    setModules,
    fetchLatestFromSheets,
    isFetchingRemote,
    pushActiveTripToSheets,
  } = useTripStore();

  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showNewTripModal, setShowNewTripModal] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      days?: number;
      accommodations?: number;
      transports?: number;
      checklist?: number;
      expenses?: number;
    };
  } | null>(null);

  // 表單內部狀態
  const [tripName, setTripName] = useState(config.tripName);
  const [subtitle, setSubtitle] = useState(config.subtitle);
  const [totalDays, setTotalDaysState] = useState(config.totalDays || itinerary.length || 16);
  const [dateInput, setDateInput] = useState(config.startDate || '');
  const [activeModules, setActiveModules] = useState<DestinationModule[]>(activeTrip?.modules || []);

  // 僅當 activeTripId 改變時同步內部表單，避免背景同步覆蓋使用者輸入
  useEffect(() => {
    setTripName(config.tripName);
    setSubtitle(config.subtitle);
    setTotalDaysState(config.totalDays || itinerary.length || 16);
    setDateInput(config.startDate || '');
    setActiveModules(activeTrip?.modules || []);
  }, [activeTripId]);

  // 匯率
  const [primaryCurrency, setPrimaryCurrency] = useState(config.currencies.primary || 'CHF');
  const [chfTwd, setChfTwd] = useState(String(config.currencies.rates.CHF_TWD || 36.5));
  const [eurTwd, setEurTwd] = useState(String(config.currencies.rates.EUR_TWD || 34.2));

  // Google Sheets 連線設定
  const [gasUrl, setGasUrl] = useState(localStorage.getItem('travel_gas_url') || '');
  const [secret, setSecret] = useState(localStorage.getItem('travel_family_secret') || 'SWISS_ODYSSEY_2027_SECRET');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // 旅伴 Modal 狀態
  const [editingTraveler, setEditingTraveler] = useState<TravelerProfile | null>(null);
  const [showTravelerModal, setShowTravelerModal] = useState(false);
  const [travName, setTravName] = useState('');
  const [travRole, setTravRole] = useState<'adult' | 'senior' | 'kid'>('adult');
  const [travAge, setTravAge] = useState(30);
  const [travRoleLabel, setTravRoleLabel] = useState('成人');
  const [travNotes, setTravNotes] = useState('');

  // 基地 Modal 狀態
  const [editingBase, setEditingBase] = useState<BaseInfo | null>(null);
  const [showBaseModal, setShowBaseModal] = useState(false);
  const [baseId, setBaseId] = useState('');
  const [baseName, setBaseName] = useState('');
  const [baseNameZh, setBaseNameZh] = useState('');
  const [baseColor, setBaseColor] = useState('#0EA5E9');
  const [baseHotelName, setBaseHotelName] = useState('');
  const [baseLat, setBaseLat] = useState('47.0502');
  const [baseLng, setBaseLng] = useState('8.3093');
  const [baseNotes, setBaseNotes] = useState('');

  // 儲存基本設定
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();

    if (totalDays < itinerary.length) {
      const ok = await confirm({
        title: '縮減旅行天數注意',
        message: `旅行天數將由 ${itinerary.length} 天縮減為 ${totalDays} 天，第 ${totalDays + 1} 天之後的自訂排程將會被修剪。確定要儲存嗎？`,
        confirmLabel: '確認縮減天數',
        danger: true,
      });
      if (!ok) return;
    }

    setTotalDays(totalDays);
    setStartDate(dateInput.trim() ? dateInput.trim() : null);
    setModules(activeModules);

    updateConfig({
      tripName: tripName.trim(),
      subtitle: subtitle.trim(),
      totalDays: totalDays,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // 儲存匯率設定
  const handleSaveCurrencies = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      currencies: {
        ...config.currencies,
        primary: primaryCurrency,
        rates: {
          ...config.currencies.rates,
          CHF_TWD: parseFloat(chfTwd) || 36.5,
          EUR_TWD: parseFloat(eurTwd) || 34.2,
        },
      },
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // 儲存 GAS 設定
  const handleSaveGasConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('travel_gas_url', gasUrl.trim());
    localStorage.setItem('travel_family_secret', secret.trim());
    setTestResult('測試連線中...');

    const success = await fetchLatestFromSheets();
    if (success) {
      setTestResult('🟢 連線成功！已從 Google Sheets 載入最新數據。');
    } else {
      setTestResult('⚠️ 連線設定已儲存 (若無網路或未部署，將先行暫存本機)。');
    }
  };

  // 全量發布至 Google 試算表
  const handlePushTrip = async () => {
    if (!gasUrl.trim()) {
      setPushResult({
        success: false,
        message: '請先在下方填寫 Google Apps Script Web App URL 並儲存。',
      });
      return;
    }
    setIsPushing(true);
    setPushResult(null);
    try {
      const res = await pushActiveTripToSheets();
      if (res.success) {
        setPushResult({
          success: true,
          message: res.message || '旅程資料已成功同步發布至 Google 試算表！',
          stats: res.stats,
        });
      } else {
        setPushResult({
          success: false,
          message: res.error || '發布失敗，請確認 Apps Script 部署 URL 與密鑰是否相符。',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPushResult({ success: false, message: `發布發生錯誤: ${msg}` });
    } finally {
      setIsPushing(false);
    }
  };

  // 一鍵清理排隊佇列
  const handleClearQueue = () => {
    syncManager.clearQueue();
    setTestResult('✅ 本地同步佇列已成功清空！指示燈已恢復就緒狀態。');
  };

  // 旅伴 CRUD
  const handleOpenAddTraveler = () => {
    setEditingTraveler(null);
    setTravName('');
    setTravRole('adult');
    setTravAge(30);
    setTravRoleLabel('成人');
    setTravNotes('');
    setShowTravelerModal(true);
  };

  const handleOpenEditTraveler = (t: TravelerProfile) => {
    setEditingTraveler(t);
    setTravName(t.name);
    setTravRole(t.role);
    setTravAge(t.age);
    setTravRoleLabel(t.roleLabel || '');
    setTravNotes(t.notes || '');
    setShowTravelerModal(true);
  };

  const handleSaveTraveler = (e: React.FormEvent) => {
    e.preventDefault();
    if (!travName.trim()) return;

    const list = [...(config.travelers || [])];
    if (editingTraveler) {
      const idx = list.findIndex((t) => t.id === editingTraveler.id);
      if (idx !== -1) {
        list[idx] = {
          ...editingTraveler,
          name: travName.trim(),
          role: travRole,
          roleLabel: travRoleLabel.trim() || (travRole === 'senior' ? '長輩' : travRole === 'kid' ? '兒童' : '成人'),
          age: Number(travAge) || 30,
          notes: travNotes.trim() || undefined,
        };
      }
    } else {
      list.push({
        id: `trav_${Date.now()}`,
        name: travName.trim(),
        role: travRole,
        roleLabel: travRoleLabel.trim() || (travRole === 'senior' ? '長輩' : travRole === 'kid' ? '兒童' : '成人'),
        age: Number(travAge) || 30,
        tags: travRole === 'senior' ? ['senior-friendly'] : travRole === 'kid' ? ['kids-highlight'] : [],
        notes: travNotes.trim() || undefined,
      });
    }

    updateConfig({ travelers: list });
    setShowTravelerModal(false);
  };

  const handleDeleteTraveler = async (id: string, name: string) => {
    const ok = await confirm({
      title: '刪除旅伴成員',
      message: `確定要從同行名單中移除「${name}」嗎？`,
      confirmLabel: '確認移除',
      danger: true,
    });
    if (ok) {
      const list = (config.travelers || []).filter((t) => t.id !== id);
      updateConfig({ travelers: list });
    }
  };

  // 基地 CRUD
  const handleOpenAddBase = () => {
    setEditingBase(null);
    setBaseId(`base_${Date.now().toString(36).slice(-4)}`);
    setBaseName('');
    setBaseNameZh('');
    setBaseColor('#0EA5E9');
    setBaseHotelName('');
    setBaseLat('');
    setBaseLng('');
    setBaseNotes('');
    setShowBaseModal(true);
  };

  const handleOpenEditBase = (b: BaseInfo) => {
    setEditingBase(b);
    setBaseId(b.id);
    setBaseName(b.name);
    setBaseNameZh(b.nameZh);
    setBaseColor(b.color || '#0EA5E9');
    setBaseHotelName(b.hotelName || '');
    setBaseLat(b.coordinates ? String(b.coordinates[0]) : '');
    setBaseLng(b.coordinates ? String(b.coordinates[1]) : '');
    setBaseNotes(b.notes || '');
    setShowBaseModal(true);
  };

  const handleSaveBase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseNameZh.trim()) return;

    const coords: [number, number] | undefined =
      baseLat && baseLng ? [parseFloat(baseLat), parseFloat(baseLng)] : undefined;
    const finalEnName = baseName.trim() || baseNameZh.trim();

    const list = [...(config.bases || [])];
    if (editingBase) {
      const idx = list.findIndex((b) => b.id === editingBase.id);
      if (idx !== -1) {
        list[idx] = {
          ...editingBase,
          name: finalEnName,
          nameZh: baseNameZh.trim(),
          color: baseColor,
          hotelName: baseHotelName.trim(),
          coordinates: coords,
          notes: baseNotes.trim() || undefined,
        };
      }
    } else {
      list.push({
        id: baseId.trim() || `base_${Date.now()}`,
        name: finalEnName,
        nameZh: baseNameZh.trim(),
        days: [],
        color: baseColor,
        hotelName: baseHotelName.trim(),
        coordinates: coords,
        notes: baseNotes.trim() || undefined,
      });
    }

    updateConfig({ bases: list });
    setShowBaseModal(false);
  };

  const handleDeleteBase = async (id: string, nameZh: string) => {
    const ok = await confirm({
      title: '刪除景點區域',
      message: `確定要刪除「${nameZh}」區域嗎？若有行程或待排景點綁定於此區域，關聯將會自動清除。`,
      confirmLabel: '確認刪除',
      danger: true,
    });
    if (ok) {
      deleteBase(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <PageHeader
        title="系統與旅程管理設定"
        subtitle="自由調整出發日、管理同行成員與基地坐標、設定特色模組，並綁定雲端資料庫"
        emoji="⚙️"
        actions={
          saveSuccess ? (
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              <span>設定已儲存！</span>
            </span>
          ) : undefined
        }
      />

      {/* 設定功能分頁導覽籤 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[var(--color-border)]">
        {[
          { key: 'general', label: '基本與日程', icon: Calendar },
          { key: 'travelers', label: '同行成員', icon: Users, count: config.travelers?.length },
          { key: 'bases', label: '景點區域', icon: MapPin, count: config.bases?.length },
          { key: 'currencies', label: '幣別匯率', icon: Coins },
          { key: 'sync', label: '雲端同步', icon: Cloud },
          { key: 'trips', label: '所有旅程', icon: Compass, count: trips.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as SettingsTab)}
              className={`px-3.5 py-2 rounded-t-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border-b-2 -mb-[2px] shrink-0 ${
                isActive
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-bg-subtle)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--color-border)] font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: 基本與日程 */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
              <span>旅程基本資訊</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="旅行名稱"
                type="text"
                required
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
              />
              <Input
                label="副標題 / 行程備註"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            {/* 出發日期選擇器 */}
            <div className="bg-[var(--color-bg-subtle)] p-4 rounded-xl border border-[var(--color-border)] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--color-text)]">
                  旅行出發首日 (Day 1)
                </label>
                {dateInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateInput('');
                      setStartDate(null);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    清空為相對天數 (Day 1 - {totalDays})
                  </button>
                )}
              </div>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full sm:w-60"
              />
              <p className="text-[11px] text-[var(--color-text-muted)]">
                設定首日後全行程各天將自動依序計算確切日期；若不設定則顯示「Day 01、Day 02」。
              </p>
            </div>

            {/* 總天數設定 */}
            <div className="bg-[var(--color-bg-subtle)] p-4 rounded-xl border border-[var(--color-border)] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--color-text)]">
                  旅行總天數 ({totalDays} 天)
                </label>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg)] w-fit">
                  <button
                    type="button"
                    onClick={() => setTotalDaysState((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg font-bold select-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={totalDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setTotalDaysState(Math.max(1, Math.min(90, val)));
                    }}
                    className="w-16 bg-transparent text-center font-mono font-bold text-base text-[var(--color-text)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setTotalDaysState((prev) => Math.min(90, prev + 1))}
                    className="w-10 h-10 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg font-bold select-none"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-[var(--color-text-muted)] mr-1">快捷預設:</span>
                  {[5, 7, 10, 14, 16, 21].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTotalDaysState(d)}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                        totalDays === d
                          ? 'bg-[var(--color-primary)] text-white font-bold shadow-sm'
                          : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {d} 天
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 目的地特色模組開關 */}
            <div className="bg-[var(--color-bg-subtle)] p-4 rounded-xl border border-[var(--color-border)] space-y-3">
              <label className="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>目的地專屬特色功能模組</span>
              </label>
              <div className="space-y-2">
                {Object.values(MODULE_REGISTRY).map((mod) => {
                  const isEnabled = activeModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      className="p-3 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{mod.emoji}</span>
                          <span className="text-xs sm:text-sm font-bold text-[var(--color-text)]">
                            {mod.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                          {mod.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (isEnabled) {
                            setActiveModules(activeModules.filter((m) => m !== mod.id));
                          } else {
                            setActiveModules([...activeModules, mod.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isEnabled
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                        }`}
                      >
                        {isEnabled ? '已啟用' : '未開啟'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button type="submit" variant="primary">
              <Save className="w-4 h-4 mr-1.5" />
              <span>儲存基本與日程設定</span>
            </Button>
          </Card>
        </form>
      )}

      {/* Tab 2: 同行成員 */}
      {activeTab === 'travelers' && (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-primary)]" />
                <span>同行成員檔案 ({config.travelers?.length || 0} 位)</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                建立同行家人或朋友的檔案，系統會依年齡自動精算通票優惠與行李打包建議。
              </p>
            </div>
            <Button type="button" variant="primary" onClick={handleOpenAddTraveler}>
              <Plus className="w-4 h-4 mr-1.5" />
              <span>新增成員</span>
            </Button>
          </div>

          {(config.travelers || []).length === 0 ? (
            <EmptyState
              title="尚未建立任何同行成員"
              description="點擊上方「新增成員」按鈕為家人或朋友建立專屬檔案。"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {config.travelers.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col justify-between gap-3 hover:border-[var(--color-primary)]/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-[var(--color-text)]">{t.name}</h4>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-bg-subtle)] font-medium text-[var(--color-primary)]">
                        {t.roleLabel || t.role}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">年齡: {t.age} 歲</p>
                    {t.notes && (
                      <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mt-1">
                        {t.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-1 pt-2 border-t border-[var(--color-border)]">
                    <button
                      type="button"
                      onClick={() => handleOpenEditTraveler(t)}
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-bg-subtle)]"
                      title="編輯成員"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTraveler(t.id, t.name)}
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 rounded-lg hover:bg-red-500/10"
                      title="刪除成員"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: 景點區域 */}
      {activeTab === 'bases' && (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                <span>景點區域與地理中心 ({config.bases?.length || 0} 個)</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                自訂旅程劃分的景點區域（如城市、城鎮或活動區塊），供日程分配、景點池篩選、氣象預報與地圖自動定位。
              </p>
            </div>
            <Button type="button" variant="primary" onClick={handleOpenAddBase}>
              <Plus className="w-4 h-4 mr-1.5" />
              <span>新增區域</span>
            </Button>
          </div>

          {(config.bases || []).length === 0 ? (
            <EmptyState
              title="尚未建立任何景點區域"
              description="點擊「新增區域」建立第一個城市、城鎮或活動據點。"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {config.bases.map((b) => {
                const assignedDays = (itinerary || [])
                  .filter((d) => d.baseId === b.id)
                  .map((d) => `Day ${d.day}`);
                const backlogCount = (backlog || []).filter((item) => item.baseId === b.id).length;

                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col justify-between gap-3 hover:border-[var(--color-primary)]/40 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: b.color || '#0EA5E9' }}
                          />
                          <h4 className="font-bold text-sm text-[var(--color-text)]">
                            {b.nameZh}{' '}
                            {b.name && b.name !== b.nameZh && (
                              <span className="text-xs text-[var(--color-text-muted)] font-normal">
                                ({b.name})
                              </span>
                            )}
                          </h4>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                          ID: {b.id}
                        </span>
                      </div>

                      {/* 關聯統計標籤 */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {assignedDays.length > 0 ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium">
                            🗓️ {assignedDays.join(', ')}
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
                            未綁定日程天數
                          </span>
                        )}

                        {backlogCount > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                            📌 待排景點 {backlogCount} 個
                          </span>
                        )}
                      </div>

                      {b.hotelName && (
                        <p className="text-xs text-[var(--color-text)] font-medium">
                          住宿/地標: {b.hotelName}
                        </p>
                      )}

                      {b.coordinates && (
                        <p className="text-[11px] text-[var(--color-text-muted)] font-mono flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[var(--color-primary)]" />
                          <span>
                            [{b.coordinates[0].toFixed(4)}, {b.coordinates[1].toFixed(4)}]
                          </span>
                        </p>
                      )}

                      {b.notes && (
                        <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">
                          {b.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-1 pt-2 border-t border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBase(b)}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-bg-subtle)]"
                        title="編輯區域"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBase(b.id, b.nameZh)}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 rounded-lg hover:bg-red-500/10"
                        title="刪除區域"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: 幣別匯率 */}
      {activeTab === 'currencies' && (
        <form onSubmit={handleSaveCurrencies} className="space-y-4">
          <Card className="p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
              <Coins className="w-4 h-4 text-[var(--color-primary)]" />
              <span>幣別與自訂匯率換算</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="主要記帳幣別 (Primary)"
                value={primaryCurrency}
                onChange={(e) => setPrimaryCurrency(e.target.value)}
              >
                <option value="CHF">瑞士法郎 (CHF)</option>
                <option value="EUR">歐元 (EUR)</option>
                <option value="TWD">新台幣 (TWD)</option>
                <option value="USD">美元 (USD)</option>
                <option value="JPY">日圓 (JPY)</option>
              </Select>

              <Input
                label="瑞士法郎匯率 (1 CHF = ? TWD)"
                type="number"
                step="0.01"
                value={chfTwd}
                onChange={(e) => setChfTwd(e.target.value)}
              />

              <Input
                label="歐元匯率 (1 EUR = ? TWD)"
                type="number"
                step="0.01"
                value={eurTwd}
                onChange={(e) => setEurTwd(e.target.value)}
              />
            </div>

            <Button type="submit" variant="primary">
              <Save className="w-4 h-4 mr-1.5" />
              <span>儲存匯率設定</span>
            </Button>
          </Card>
        </form>
      )}

      {/* Tab 5: 雲端同步 */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          {/* 1. 一鍵全量發布至 Google 試算表 */}
          <Card className="p-5 sm:p-6 space-y-4 border-l-4 border-l-[var(--color-primary)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-[var(--color-primary)]" />
                  <span>發布目前旅程至 Google 試算表</span>
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  將目前選定的「<strong className="text-[var(--color-text)]">{activeTrip?.name || '當前行程'}</strong>」全部天數日程、住宿、交通預訂與清單一鍵完整寫入雲端試算表。
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handlePushTrip}
                disabled={isPushing || !gasUrl.trim()}
                className="shrink-0 font-medium"
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${isPushing ? 'animate-spin' : ''}`} />
                <span>{isPushing ? '正在發布中...' : '🚀 一鍵發布此旅程至雲端'}</span>
              </Button>
            </div>

            {/* 發布結果通知 */}
            {pushResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  pushResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300'
                }`}
              >
                {pushResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold">{pushResult.message}</p>
                  {pushResult.stats && (
                    <p className="text-[11px] opacity-90">
                      寫入統計：{pushResult.stats.days ?? 0} 天行程、{pushResult.stats.accommodations ?? 0} 筆住宿、
                      {pushResult.stats.transports ?? 0} 筆交通預訂、{pushResult.stats.checklist ?? 0} 項檢查清單
                    </p>
                  )}
                  {!pushResult.success && (
                    <div className="text-[11px] pt-1 text-red-700 dark:text-red-300/90 space-y-0.5 border-t border-red-500/20 mt-1">
                      <p className="font-semibold">💡 常見解決步驟：</p>
                      <p>1. <strong>部署為新版本</strong>：Apps Script 部署作業請務必建立「新版本」部署（切勿僅儲存未部署）。</p>
                      <p>2. <strong>存取權限設為「所有人」</strong>：Apps Script 部署設定中的「誰可以存取」必須設定為「所有人 (Anyone)」。</p>
                      <p>3. <strong>更新 Web App URL</strong>：若重新建立了新的部署作業，請確認下方輸入框貼上的是最新的 Web App URL。</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-[var(--color-bg-subtle)] p-3.5 rounded-xl text-xs space-y-2 border border-[var(--color-border)]">
              <div className="font-semibold text-[var(--color-text)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>為什麼之前建立/AI 匯入新行程後試算表是空白的？</span>
              </div>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                App 為了極致流暢與支援離線使用，AI 匯入或新建行程時會先完整保存在瀏覽器本機儲存區；底部顯示的「已連線」代表已綁定 Apps Script 網址且無離線暫存堆疊。點擊上方的<strong>【一鍵發布此旅程至雲端】</strong>，即會一次性將整份行程、住宿基地、交通班次與行前清單寫入 Google 試算表的分頁，讓所有成員開啟試算表或各自 App 時都能同步檢視！
              </p>
            </div>
          </Card>

          {/* 2. GAS 連線設定 */}
          <form onSubmit={handleSaveGasConfig} className="space-y-4">
            <Card className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-500" />
                  <span>Google Sheets 試算表資料庫綁定</span>
                </h3>

                <a
                  href="https://github.com/hippoking1/Travel_Manager_App/blob/main/google-apps-script/SETUP.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>部署圖文教學</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                將部署完成的 Google Apps Script (GAS) 網頁應用程式 URL 填入下方，即可與家人即時記帳、打勾行李與同步備忘。
              </p>

              <Input
                label="Apps Script Web App URL"
                type="url"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              />

              <Input
                label="自訂防護密鑰 (Family Secret Key)"
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="SWISS_ODYSSEY_2027_SECRET"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <Button type="submit" variant="primary" disabled={isFetchingRemote}>
                  <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetchingRemote ? 'animate-spin' : ''}`} />
                  <span>儲存設定並從試算表讀取</span>
                </Button>

                {testResult && (
                  <span className="text-xs font-semibold text-[var(--color-text)]">
                    {testResult}
                  </span>
                )}
              </div>

              {/* 佇列診斷與清理 */}
              <div className="border-t border-[var(--color-border)] pt-4 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[var(--color-text-muted)]">
                  <span>若同步指示燈卡在待同步狀態，可點擊重設本地排隊佇列：</span>
                </div>
                <Button type="button" variant="outline" onClick={handleClearQueue}>
                  清空待同步佇列
                </Button>
              </div>
            </Card>
          </form>
        </div>
      )}

      {/* Tab 6: 旅程計畫列表 */}
      {activeTab === 'trips' && (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                <Compass className="w-4 h-4 text-[var(--color-primary)]" />
                <span>全部旅遊計畫 (共 {trips.length} 場)</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                切換不同旅遊計畫、建立新旅程或複製現有行程副本。
              </p>
            </div>

            <Button type="button" variant="primary" onClick={() => setShowNewTripModal(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              <span>建立全新計畫</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {trips.map((trip) => {
              const isActive = trip.id === activeTripId;
              const daysCount = trip.config?.totalDays || trip.itinerary?.length || 1;
              return (
                <div
                  key={trip.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isActive
                      ? 'bg-[var(--color-bg)] border-[var(--color-primary)] ring-1 ring-[var(--color-primary)] shadow-sm'
                      : 'bg-[var(--color-bg)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="text-2xl p-2 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] shrink-0">
                        {trip.coverEmoji || '✈️'}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--color-text)] truncate">
                          {trip.name}
                        </h4>
                        <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 mt-1">
                          {trip.destination && (
                            <span className="truncate flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span>{trip.destination}</span>
                            </span>
                          )}
                          <span>•</span>
                          <span className="font-mono font-semibold text-[var(--color-text)]">
                            {daysCount} 天
                          </span>
                        </div>
                        {trip.config?.startDate && (
                          <p className="text-[11px] text-[var(--color-text-muted)] font-mono mt-0.5">
                            首日: {trip.config.startDate}
                          </p>
                        )}
                      </div>
                    </div>

                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>規劃中</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
                    {!isActive ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => switchTrip(trip.id)}
                      >
                        切換至此旅程
                      </Button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        目前作用中的計畫
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => duplicateTrip(trip.id)}
                        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors"
                        title="複製旅程"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {trips.length > 1 && (
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await confirm({
                              title: '刪除旅遊計畫',
                              message: `確定要刪除「${trip.name}」這場旅遊計畫嗎？此動作無法復原。`,
                              confirmLabel: '確認刪除',
                              danger: true,
                            });
                            if (ok) deleteTrip(trip.id);
                          }}
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="刪除旅程"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 旅伴 Modal */}
      {showTravelerModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowTravelerModal(false)}
          title={editingTraveler ? '編輯同行成員' : '新增同行成員'}
        >
          <form onSubmit={handleSaveTraveler} className="space-y-4">
            <Input
              label="姓名 / 暱稱"
              type="text"
              required
              value={travName}
              onChange={(e) => setTravName(e.target.value)}
              placeholder="例如: 爸爸、小明"
            />

            <div className="grid grid-cols-3 gap-2">
              <Select
                label="成員身分"
                value={travRole}
                onChange={(e) => setTravRole(e.target.value as 'adult' | 'senior' | 'kid')}
              >
                <option value="adult">成人</option>
                <option value="senior">長輩</option>
                <option value="kid">兒童</option>
              </Select>

              <Input
                label="年齡 (歲)"
                type="number"
                min="0"
                max="120"
                value={String(travAge)}
                onChange={(e) => setTravAge(parseInt(e.target.value, 10) || 0)}
              />

              <Input
                label="顯示標籤"
                type="text"
                value={travRoleLabel}
                onChange={(e) => setTravRoleLabel(e.target.value)}
                placeholder="例如: 長輩 (68y)"
              />
            </div>

            <Input
              label="專長或備註說明 (選填)"
              type="text"
              value={travNotes}
              onChange={(e) => setTravNotes(e.target.value)}
              placeholder="例如: 負責點餐、喜歡戶外健行"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowTravelerModal(false)}>
                取消
              </Button>
              <Button type="submit" variant="primary">
                儲存成員
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 景點區域 Modal */}
      {showBaseModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowBaseModal(false)}
          title={editingBase ? '編輯景點區域' : '新增景點區域'}
        >
          <form onSubmit={handleSaveBase} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="區域代碼 (ID)"
                type="text"
                required
                disabled={!!editingBase}
                value={baseId}
                onChange={(e) => setBaseId(e.target.value)}
                placeholder="例如: luzern, tokyo"
              />
              <Input
                label="代表色票 (HEX)"
                type="color"
                value={baseColor}
                onChange={(e) => setBaseColor(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="區域中文名稱"
                type="text"
                required
                value={baseNameZh}
                onChange={(e) => setBaseNameZh(e.target.value)}
                placeholder="例如: 琉森"
              />
              <Input
                label="外文 / 英文名稱 (選填)"
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="例如: Luzern"
              />
            </div>

            <Input
              label="核心地標 / 住宿飯店 (選填)"
              type="text"
              value={baseHotelName}
              onChange={(e) => setBaseHotelName(e.target.value)}
              placeholder="例如: Luzern Bahnhof、Lakeside Apartment"
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="緯度 (Latitude)"
                type="number"
                step="0.0001"
                value={baseLat}
                onChange={(e) => setBaseLat(e.target.value)}
                placeholder="例如: 47.0502"
              />
              <Input
                label="經度 (Longitude)"
                type="number"
                step="0.0001"
                value={baseLng}
                onChange={(e) => setBaseLng(e.target.value)}
                placeholder="例如: 8.3093"
              />
            </div>

            <Input
              label="特色或周邊景點備註"
              type="text"
              value={baseNotes}
              onChange={(e) => setBaseNotes(e.target.value)}
              placeholder="例如: 卡貝爾木橋、瑞吉山纜車起點"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowBaseModal(false)}>
                取消
              </Button>
              <Button type="submit" variant="primary">
                儲存區域
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 新增旅程彈出視窗 */}
      <NewTripModal
        isOpen={showNewTripModal}
        onClose={() => setShowNewTripModal(false)}
      />
    </div>
  );
};
