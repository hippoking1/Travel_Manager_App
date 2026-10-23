import React, { useState, useEffect, useRef } from 'react';
import type { 
  TimeBlock, 
  PersonaTag, 
  TransportType, 
  STPCoverage, 
  LocationCategory,
  TransitLeg 
} from '../../../types';
import { SCENIC_SUB_TAGS } from '../../../types';
import { extractCoordsFromUrlOrText } from '../../../lib/geo/inferCoordinates';
import { useTripStore } from '../../../stores/tripStore';
import { useModules, useBases, useItinerary } from '../../../stores/selectors';
import { hasModule } from '../../../config/modules';
import { Modal } from '../../ui/Modal';
import { Input, Textarea, TimeInput, Select } from '../../ui/Field';
import { Plus, Trash2, ArrowUp, ArrowDown, Repeat, Route } from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatTimeSpan } from '../../../lib/itinerary';
import { QuickAddBaseModal } from '../../shared/QuickAddBaseModal';
import { 
  TRANSPORT_TYPE_CONFIG, 
  normalizeTransitLeg, 
  aggregateTransportDetail, 
  parseTimeToMinutes 
} from '../../../lib/transit';

export interface ActivityEditorProps {
  isOpen: boolean;
  onClose: () => void;
  dayIdOrNumber?: string | number;
  isBacklog?: boolean;
  initialBlock?: TimeBlock | null;
}

export const ActivityEditor: React.FC<ActivityEditorProps> = ({
  isOpen,
  onClose,
  dayIdOrNumber,
  isBacklog = false,
  initialBlock,
}) => {
  const { addTimeBlock, updateTimeBlockById, addBacklogItem } = useTripStore();
  const modules = useModules();
  const bases = useBases();
  const itinerary = useItinerary();
  const isSwiss = hasModule(modules, 'swiss');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseId, setBaseId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:30');
  const [locationName, setLocationName] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [altitude, setAltitude] = useState('');
  const [tags, setTags] = useState<PersonaTag[]>(['senior-friendly']);
  const [subCategories, setSubCategories] = useState<LocationCategory[]>([]);
  const [showQuickAddBase, setShowQuickAddBase] = useState(false);

  // 多段交通與轉乘路線規劃欄位
  const [transportLegs, setTransportLegs] = useState<TransitLeg[]>([]);
  const [transportRouteUrl, setTransportRouteUrl] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [transportNotes, setTransportNotes] = useState('');
  const [stpCoverage, setStpCoverage] = useState<STPCoverage>('free');

  const isInitializedRef = useRef(false);
  const prevBlockIdRef = useRef<string | undefined>(undefined);
  const draftKey = `travel_draft_act_${isBacklog ? 'backlog' : dayIdOrNumber ?? 'new'}`;

  // 僅在 Modal 剛打開或切換編輯對象時初始化表單，背景資料同步絕不重置使用者輸入
  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      return;
    }

    const currentBlockId = initialBlock?.id;
    const isNewBlock = currentBlockId !== prevBlockIdRef.current;

    if (!isInitializedRef.current || isNewBlock) {
      isInitializedRef.current = true;
      prevBlockIdRef.current = currentBlockId;

      if (initialBlock) {
        setTitle(initialBlock.title || '');
        setDescription(initialBlock.description || '');
        // 優先取用 initialBlock.baseId，若無則備援取所屬日程天數的 baseId
        const targetDay = dayIdOrNumber !== undefined
          ? itinerary.find((d) => (d.id || String(d.day)) === String(dayIdOrNumber) || d.day === dayIdOrNumber)
          : undefined;
        const initialBaseVal = initialBlock.baseId || targetDay?.baseId || '';
        const matched = bases.find((b) => b.id === initialBaseVal || b.nameZh === initialBaseVal || b.name === initialBaseVal);
        setBaseId(matched ? matched.id : initialBaseVal);
        setStartTime(initialBlock.startTime || '09:00');
        setEndTime(initialBlock.endTime || '11:30');
        setLocationName(initialBlock.locationName || '');
        setGoogleMapsUrl(initialBlock.googleMapsUrl || '');
        setAltitude(initialBlock.altitude ? String(initialBlock.altitude) : '');
        setTags(initialBlock.tags || ['senior-friendly']);
        setSubCategories(
          initialBlock.subCategories ||
          (initialBlock.category ? [initialBlock.category] : [])
        );

        if (initialBlock.transport) {
          if (initialBlock.transport.legs && initialBlock.transport.legs.length > 0) {
            setTransportLegs(initialBlock.transport.legs.map((l, i) => normalizeTransitLeg(l, i)));
          } else if (initialBlock.transport.from || initialBlock.transport.to) {
            setTransportLegs([
              normalizeTransitLeg({
                type: initialBlock.transport.type || 'train',
                from: initialBlock.transport.from || '',
                to: initialBlock.transport.to || '',
                lineName: initialBlock.transport.lineInfo,
                departureTime: initialBlock.transport.departureTime,
                arrivalTime: initialBlock.transport.arrivalTime,
                duration: initialBlock.transport.duration,
                cost: initialBlock.transport.cost,
                passCoverage: initialBlock.transport.discountNote,
                notes: initialBlock.transport.notes,
              }),
            ]);
          } else {
            setTransportLegs([]);
          }
          setTransportRouteUrl(initialBlock.transport.routeUrl || '');
          setTransportCost(initialBlock.transport.cost || '');
          setTransportNotes(initialBlock.transport.notes || '');
          setStpCoverage(initialBlock.transport.stpCoverage || 'free');
        } else {
          setTransportLegs([]);
          setTransportRouteUrl('');
          setTransportCost('');
          setTransportNotes('');
          setStpCoverage('free');
        }
      } else {
        // 新增模式：若先前有未完成的輸入草稿，自動復原
        let restored = false;
        try {
          const rawDraft = sessionStorage.getItem(draftKey);
          if (rawDraft) {
            const draft = JSON.parse(rawDraft);
            if (
              draft.title || 
              draft.description || 
              draft.googleMapsUrl || 
              draft.locationName || 
              (draft.transportLegs && draft.transportLegs.length > 0)
            ) {
              setTitle(draft.title || '');
              setDescription(draft.description || '');
              setBaseId(draft.baseId || '');
              setStartTime(draft.startTime || '09:00');
              setEndTime(draft.endTime || '11:30');
              setLocationName(draft.locationName || '');
              setGoogleMapsUrl(draft.googleMapsUrl || '');
              setAltitude(draft.altitude || '');
              setTags(draft.tags || ['senior-friendly']);
              setSubCategories(draft.subCategories || []);
              
              if (Array.isArray(draft.transportLegs)) {
                setTransportLegs(draft.transportLegs);
              } else if (draft.transportFrom || draft.transportTo) {
                setTransportLegs([
                  normalizeTransitLeg({
                    type: draft.transportType || 'train',
                    from: draft.transportFrom || '',
                    to: draft.transportTo || '',
                  }),
                ]);
              } else {
                setTransportLegs([]);
              }
              setTransportRouteUrl(draft.transportRouteUrl || '');
              setTransportCost(draft.transportCost || '');
              setTransportNotes(draft.transportNotes || '');
              setStpCoverage(draft.stpCoverage || 'free');
              restored = true;
            }
          }
        } catch {
          // ignore draft parsing errors
        }

        if (!restored) {
          setTitle('');
          setDescription('');
          const targetDay = dayIdOrNumber !== undefined
            ? itinerary.find((d) => (d.id || String(d.day)) === String(dayIdOrNumber) || d.day === dayIdOrNumber)
            : undefined;
          setBaseId(targetDay?.baseId || '');
          setStartTime('09:00');
          setEndTime('11:30');
          setLocationName('');
          setGoogleMapsUrl('');
          setAltitude('');
          setTags(['senior-friendly']);
          setSubCategories([]);
          setTransportLegs([]);
          setTransportRouteUrl('');
          setTransportCost('');
          setTransportNotes('');
          setStpCoverage('free');
        }
      }
    }
  }, [initialBlock, isOpen, dayIdOrNumber, bases, itinerary]);

  // 新增模式下自動暫存正在輸入的草稿
  useEffect(() => {
    if (!isOpen || initialBlock) return;
    if (title || description || locationName || googleMapsUrl || transportLegs.length > 0) {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          title,
          description,
          baseId,
          startTime,
          endTime,
          locationName,
          googleMapsUrl,
          altitude,
          tags,
          subCategories,
          transportLegs,
          transportRouteUrl,
          transportCost,
          transportNotes,
          stpCoverage,
        })
      );
    }
  }, [
    isOpen,
    initialBlock,
    draftKey,
    title,
    description,
    baseId,
    startTime,
    endTime,
    locationName,
    googleMapsUrl,
    altitude,
    tags,
    subCategories,
    transportLegs,
    transportRouteUrl,
    transportCost,
    transportNotes,
    stpCoverage,
  ]);

  // 關閉前的防呆確認
  const handleSafeClose = () => {
    const hasUnsavedContent = initialBlock
      ? title !== (initialBlock.title || '') ||
        description !== (initialBlock.description || '') ||
        googleMapsUrl !== (initialBlock.googleMapsUrl || '') ||
        locationName !== (initialBlock.locationName || '') ||
        baseId !== (initialBlock.baseId || '') ||
        JSON.stringify(transportLegs) !== JSON.stringify(initialBlock.transport?.legs || [])
      : Boolean(
          title.trim() ||
          description.trim() ||
          locationName.trim() ||
          googleMapsUrl.trim() ||
          transportLegs.length > 0
        );

    if (hasUnsavedContent) {
      if (window.confirm('您有正在填寫的內容尚未儲存，確定要放棄填寫嗎？')) {
        sessionStorage.removeItem(draftKey);
        onClose();
      }
    } else {
      sessionStorage.removeItem(draftKey);
      onClose();
    }
  };

  // 輔助：建立新轉乘段 (可自動繼承上一段終點與時間)
  const handleAddLeg = () => {
    const lastLeg = transportLegs[transportLegs.length - 1];
    let nextFrom = '';
    let nextDepTime: string | undefined = undefined;

    if (lastLeg) {
      nextFrom = lastLeg.to || '';
      if (lastLeg.arrivalTime) {
        const mins = parseTimeToMinutes(lastLeg.arrivalTime);
        if (mins !== null) {
          const nextMins = (mins + 7) % 1440;
          const h = String(Math.floor(nextMins / 60)).padStart(2, '0');
          const m = String(nextMins % 60).padStart(2, '0');
          nextDepTime = `${h}:${m}`;
        }
      }
    }

    const newLeg: TransitLeg = {
      id: `leg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: lastLeg ? (lastLeg.type === 'metro' ? 'train' : 'metro') : 'metro',
      from: nextFrom,
      to: '',
      departureTime: nextDepTime,
    };

    setTransportLegs([...transportLegs, newLeg]);
  };

  const handleUpdateLeg = (id: string, updates: Partial<TransitLeg>) => {
    setTransportLegs((prev) =>
      prev.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg))
    );
  };

  const handleRemoveLeg = (id: string) => {
    setTransportLegs((prev) => prev.filter((leg) => leg.id !== id));
  };

  const handleMoveLeg = (index: number, direction: 'up' | 'down') => {
    setTransportLegs((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedCoords = extractCoordsFromUrlOrText(googleMapsUrl);
    const primaryCategory = subCategories.length > 0 
      ? subCategories[0] 
      : (tags.includes('scenic-train') ? 'station' : undefined);

    const aggregatedTransport = aggregateTransportDetail(transportLegs, {
      stpCoverage,
      discountNote:
        stpCoverage === 'free'
          ? 'STP 100% 免費'
          : stpCoverage === 'half-price'
          ? 'STP 50% 折扣'
          : undefined,
      cost: transportCost.trim() || undefined,
      routeUrl: transportRouteUrl.trim() || undefined,
      notes: transportNotes.trim() || undefined,
    });

    const blockData: Omit<TimeBlock, 'id'> = {
      title: title.trim(),
      description: description.trim(),
      baseId: baseId || undefined,
      period: 'morning', // 將由 store 依 startTime 自動推導
      startTime: isBacklog ? undefined : startTime,
      endTime: isBacklog ? undefined : endTime,
      periodLabel: isBacklog ? undefined : formatTimeSpan(startTime, endTime),
      locationName: locationName.trim() || undefined,
      googleMapsUrl: googleMapsUrl.trim() || undefined,
      coordinates: parsedCoords || initialBlock?.coordinates,
      altitude: altitude ? parseInt(altitude, 10) : undefined,
      category: primaryCategory,
      subCategories: subCategories.length > 0 ? subCategories : undefined,
      tags,
      transport: aggregatedTransport,
    };

    if (initialBlock?.id) {
      updateTimeBlockById(initialBlock.id, blockData);
    } else if (isBacklog) {
      addBacklogItem(blockData);
    } else if (dayIdOrNumber !== undefined) {
      addTimeBlock(dayIdOrNumber, blockData);
    }

    sessionStorage.removeItem(draftKey);
    onClose();
  };

  const tagOptions: { tag: PersonaTag; label: string }[] = [
    { tag: 'senior-friendly', label: '🧓 長輩友善' },
    { tag: 'kids-highlight', label: '🧒 兒童亮點' },
    { tag: 'budget-shopping', label: '🛒 超市/購物' },
    { tag: 'scenic-train', label: '🚂 景觀交通' },
  ];

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={handleSafeClose}
      closeOnBackdropClick={false}
      title={
        initialBlock
          ? '編輯活動景點'
          : isBacklog
          ? '新增待排景點靈感'
          : '新增行程活動景點'
      }
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 時間安排 (僅於非 Backlog 時顯示) */}
        {!isBacklog && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200/60 dark:border-stone-800">
            <TimeInput
              label="開始時間"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <TimeInput
              label="結束時間"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        )}

        {/* 活動標題 */}
        <Input
          label="活動 / 景點名稱"
          required
          placeholder="例如：卡貝爾木橋漫步、First 懸崖步道、清水寺"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        {/* 詳細說明 */}
        <Textarea
          label="活動行程備忘 / 細節說明"
          placeholder="填寫遊玩重點、路線走法或注意事項..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* 所屬景點區域 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-stone-600 dark:text-stone-300">
              所屬景點區域
            </label>
            <button
              type="button"
              onClick={() => setShowQuickAddBase(true)}
              className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>新增區域</span>
            </button>
          </div>
          <select
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">未指定 / 全區通用</option>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameZh} {b.name && b.name !== b.nameZh ? `(${b.name})` : ''}
              </option>
            ))}
            {baseId && !bases.some((b) => b.id === baseId) && (
              <option value={baseId}>
                {baseId} (自訂/同步區域)
              </option>
            )}
          </select>
        </div>

        {/* 地點與海拔 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="地點名稱 / 站點"
              placeholder="例如：Luzern Chapel Bridge、清水寺前"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>
          <div>
            <Input
              type="number"
              label="海拔 (公尺)"
              placeholder="例如：2168"
              value={altitude}
              onChange={(e) => setAltitude(e.target.value)}
            />
          </div>
        </div>

        {/* Google Maps 導航與精確定位連結 */}
        <Input
          label="景點 Google Maps 連結 / 導航網址"
          placeholder="例如：https://maps.app.goo.gl/... 或包含座標之 Google 地圖連結"
          value={googleMapsUrl}
          onChange={(e) => setGoogleMapsUrl(e.target.value)}
        />

        {/* 交通與多段轉乘路徑規劃區塊 */}
        <div className="p-3.5 sm:p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/70 dark:border-stone-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Route className="w-4 h-4 text-teal-600" />
                <span>交通與轉乘路線規劃</span>
                {transportLegs.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                    {transportLegs.length} 段路線
                  </span>
                )}
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                可規劃連續搭乘公車、捷運、火車之轉乘站、時刻與月台出口
              </p>
            </div>

            {transportLegs.length === 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLeg}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                新增交通路線
              </Button>
            )}
          </div>

          {/* 各段轉乘路線編輯清單 */}
          {transportLegs.length > 0 && (
            <div className="space-y-3 pt-1">
              {transportLegs.map((leg, idx) => {
                const meta = TRANSPORT_TYPE_CONFIG[leg.type] || TRANSPORT_TYPE_CONFIG.train;
                return (
                  <div
                    key={leg.id}
                    className="p-3.5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 shadow-2xs space-y-3 relative"
                  >
                    {/* 卡片標頭：第 X 段與控制按鈕 */}
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span 
                          style={{ backgroundColor: meta.color }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-2xs"
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          第 {idx + 1} 段：{meta.shortLabel}
                        </span>
                        {idx > 0 && (
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800/40">
                            🔄 轉乘
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveLeg(idx, 'up')}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                            title="上移"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {idx < transportLegs.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMoveLeg(idx, 'down')}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                            title="下移"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveLeg(leg.id)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          title="刪除此段路線"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 交通工具種類與路線番號/方向 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-500 mb-1">
                          交通工具種類
                        </label>
                        <Select
                          value={leg.type}
                          onChange={(e) => handleUpdateLeg(leg.id, { type: e.target.value as TransportType })}
                        >
                          <option value="metro">🚇 捷運 / 地鐵 (Metro / Subway)</option>
                          <option value="bus">🚌 市區公車 / 客運 (Bus)</option>
                          <option value="train">🚆 火車 / 鐵路 (Train)</option>
                          <option value="high-speed-rail">🚄 高鐵 / 新幹線 (High-Speed Rail)</option>
                          <option value="tram">🚋 輕軌 / 路面電車 (Tram)</option>
                          <option value="cogwheel">🚞 齒軌登山火車 (Cogwheel)</option>
                          <option value="cable-car">🚡 高空纜車 (Cable Car)</option>
                          <option value="funicular">🚠 地面斜坡纜車 (Funicular)</option>
                          <option value="boat">⛴️ 渡輪 / 觀光船 (Boat / Ferry)</option>
                          <option value="walk">🚶 散策徒步 (Walk)</option>
                          <option value="car">🚗 自駕 / 計程車 (Car / Taxi)</option>
                          <option value="flight">✈️ 航班 (Flight)</option>
                        </Select>
                      </div>

                      <Input
                        label="路線名稱 / 車次番號與方向"
                        placeholder="例: 銀座線 往淺草、公車 205 路、IR 75"
                        value={leg.lineName || ''}
                        onChange={(e) => handleUpdateLeg(leg.id, { lineName: e.target.value })}
                      />
                    </div>

                    {/* 上車站點、月台 ➔ 下車站點、月台 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input
                          label="上車點 / 起點站"
                          required
                          placeholder="例: 京都車站"
                          value={leg.from}
                          onChange={(e) => handleUpdateLeg(leg.id, { from: e.target.value })}
                        />
                        <Input
                          label="上車月台 / 出口"
                          placeholder="例: 3號月台、北口"
                          value={leg.fromPlatform || ''}
                          onChange={(e) => handleUpdateLeg(leg.id, { fromPlatform: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <Input
                          label={idx < transportLegs.length - 1 ? '轉乘站 / 下車點' : '抵達站 / 下車點'}
                          required
                          placeholder="例: 四條河原町"
                          value={leg.to}
                          onChange={(e) => handleUpdateLeg(leg.id, { to: e.target.value })}
                        />
                        <Input
                          label="下車月台 / 出口"
                          placeholder="例: 1號月台、中央口"
                          value={leg.toPlatform || ''}
                          onChange={(e) => handleUpdateLeg(leg.id, { toPlatform: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 發車時刻、抵達時刻、車程 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <TimeInput
                        label="發車時刻 (選填)"
                        value={leg.departureTime || ''}
                        onChange={(e) => handleUpdateLeg(leg.id, { departureTime: e.target.value })}
                      />
                      <TimeInput
                        label="抵達時刻 (選填)"
                        value={leg.arrivalTime || ''}
                        onChange={(e) => handleUpdateLeg(leg.id, { arrivalTime: e.target.value })}
                      />
                      <Input
                        label="車程或班距備註"
                        placeholder="例: 15分鐘、每10分一班"
                        value={leg.duration || ''}
                        onChange={(e) => handleUpdateLeg(leg.id, { duration: e.target.value })}
                      />
                    </div>

                    {/* 車資、交通卡通票狀態、備註 */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        label="單段車資 (選填)"
                        placeholder="例: JPY 240、NT$ 35"
                        value={leg.cost || ''}
                        onChange={(e) => handleUpdateLeg(leg.id, { cost: e.target.value })}
                      />
                      <Input
                        label="交通卡 / 通票涵蓋 (選填)"
                        placeholder="例: ICOCA、STP 免費、JR Pass"
                        value={leg.passCoverage || ''}
                        onChange={(e) => handleUpdateLeg(leg.id, { passCoverage: e.target.value })}
                      />
                      <Input
                        label="乘車備註提醒 (選填)"
                        placeholder="例: 車頭第1車廂離手扶梯最近"
                        value={leg.notes || ''}
                        onChange={(e) => handleUpdateLeg(leg.id, { notes: e.target.value })}
                      />
                    </div>
                  </div>
                );
              })}

              {/* 智慧接續轉乘按鈕列 */}
              <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLeg}
                  icon={<Repeat className="w-3.5 h-3.5 text-teal-600" />}
                  className="text-xs"
                >
                  ＋ 接續轉乘下一段 (自動帶入起點)
                </Button>

                {isSwiss && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-stone-600 dark:text-stone-400">瑞士通票 (STP)：</span>
                    <select
                      value={stpCoverage}
                      onChange={(e) => setStpCoverage(e.target.value as STPCoverage)}
                      className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="free">STP 100% 免費</option>
                      <option value="half-price">STP 50% 折扣</option>
                      <option value="not-covered">自費無折扣</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 自訂 Google Maps 大眾運輸路線導航 URL */}
              <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800">
                <Input
                  label="自訂 Google Maps 路線導航網址 (選填)"
                  placeholder="留空將自動依起訖站產生 Google Maps 大眾運輸導航"
                  value={transportRouteUrl}
                  onChange={(e) => setTransportRouteUrl(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* 適合標籤群 */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">
            同行成員標籤
          </label>
          <div className="flex gap-2 flex-wrap">
            {tagOptions.map(({ tag, label }) => {
              const isSelected = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setTags(tags.filter((t) => t !== tag));
                    } else {
                      setTags([...tags, tag]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-500 shadow-xs'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-stone-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 景觀交通次標籤 (對應地理地圖高山名峰、歷史文化、超市購物、親子風景) */}
          {tags.includes('scenic-train') && (
            <div className="mt-3 p-3 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200/60 dark:border-red-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                  <span>🚂 景觀交通次標籤 (對應地理地圖篩選)</span>
                </span>
                <span className="text-[10px] text-red-600/80 dark:text-red-400">
                  可複選分類標籤
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {SCENIC_SUB_TAGS.map(({ category, label, emoji }) => {
                  const isSelected = subCategories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSubCategories(subCategories.filter((c) => c !== category));
                        } else {
                          setSubCategories([...subCategories, category]);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none flex items-center gap-1 ${
                        isSelected
                          ? 'bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-200 border-red-500 shadow-xs ring-1 ring-red-500/30 font-bold'
                          : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:border-red-300'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 按鈕列 */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleSafeClose}>
            取消
          </Button>
          <Button type="submit" variant="primary">
            {initialBlock ? '儲存變更' : '新增活動'}
          </Button>
        </div>
      </form>
    </Modal>

    {showQuickAddBase && (
      <QuickAddBaseModal
        isOpen={showQuickAddBase}
        onClose={() => setShowQuickAddBase(false)}
        onCreated={(newId) => setBaseId(newId)}
      />
    )}
    </>
  );
};
