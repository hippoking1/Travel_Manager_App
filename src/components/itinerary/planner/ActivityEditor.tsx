import React, { useState, useEffect } from 'react';
import type { TimeBlock, PersonaTag, TransportType, STPCoverage } from '../../../types';
import { useTripStore } from '../../../stores/tripStore';
import { useModules } from '../../../stores/selectors';
import { hasModule } from '../../../config/modules';
import { Modal } from '../../ui/Modal';
import { Input, Textarea, TimeInput, Select } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { formatTimeSpan } from '../../../lib/itinerary';

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
  const isSwiss = hasModule(modules, 'swiss');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:30');
  const [locationName, setLocationName] = useState('');
  const [altitude, setAltitude] = useState('');
  const [tags, setTags] = useState<PersonaTag[]>(['senior-friendly']);

  // 交通欄位
  const [transportFrom, setTransportFrom] = useState('');
  const [transportTo, setTransportTo] = useState('');
  const [transportType, setTransportType] = useState<TransportType>('train');
  const [stpCoverage, setStpCoverage] = useState<STPCoverage>('free');

  useEffect(() => {
    if (initialBlock) {
      setTitle(initialBlock.title || '');
      setDescription(initialBlock.description || '');
      setStartTime(initialBlock.startTime || '09:00');
      setEndTime(initialBlock.endTime || '11:30');
      setLocationName(initialBlock.locationName || '');
      setAltitude(initialBlock.altitude ? String(initialBlock.altitude) : '');
      setTags(initialBlock.tags || ['senior-friendly']);

      if (initialBlock.transport) {
        setTransportFrom(initialBlock.transport.from || '');
        setTransportTo(initialBlock.transport.to || '');
        setTransportType(initialBlock.transport.type || 'train');
        setStpCoverage(initialBlock.transport.stpCoverage || 'free');
      } else {
        setTransportFrom('');
        setTransportTo('');
        setTransportType('train');
        setStpCoverage('free');
      }
    } else {
      setTitle('');
      setDescription('');
      setStartTime('09:00');
      setEndTime('11:30');
      setLocationName('');
      setAltitude('');
      setTags(['senior-friendly']);
      setTransportFrom('');
      setTransportTo('');
      setTransportType('train');
      setStpCoverage('free');
    }
  }, [initialBlock, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const blockData: Omit<TimeBlock, 'id'> = {
      title: title.trim(),
      description: description.trim(),
      period: 'morning', // 將由 store 依 startTime 自動推導
      startTime: isBacklog ? undefined : startTime,
      endTime: isBacklog ? undefined : endTime,
      periodLabel: isBacklog ? undefined : formatTimeSpan(startTime, endTime),
      locationName: locationName.trim() || undefined,
      altitude: altitude ? parseInt(altitude, 10) : undefined,
      tags,
      transport:
        transportFrom && transportTo
          ? {
              type: transportType,
              from: transportFrom.trim(),
              to: transportTo.trim(),
              stpCoverage,
              discountNote:
                stpCoverage === 'free'
                  ? 'STP 100% 免費'
                  : stpCoverage === 'half-price'
                  ? 'STP 50% 折扣'
                  : undefined,
            }
          : undefined,
    };

    if (initialBlock?.id) {
      updateTimeBlockById(initialBlock.id, blockData);
    } else if (isBacklog) {
      addBacklogItem(blockData);
    } else if (dayIdOrNumber !== undefined) {
      addTimeBlock(dayIdOrNumber, blockData);
    }

    onClose();
  };

  const tagOptions: { tag: PersonaTag; label: string }[] = [
    { tag: 'senior-friendly', label: '🧓 長輩友善' },
    { tag: 'kids-highlight', label: '🧒 兒童亮點' },
    { tag: 'budget-shopping', label: '🛒 超市/購物' },
    { tag: 'scenic-train', label: '🚂 景觀交通' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        initialBlock
          ? '編輯活動景點'
          : isBacklog
          ? '新增待排景點靈感'
          : '新增行程活動景點'
      }
      maxWidth="lg"
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
          placeholder="例如：卡貝爾木橋漫步、First 懸崖步道"
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

        {/* 地點與海拔 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="地點名稱 / 站點"
              placeholder="例如：Luzern Chapel Bridge"
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

        {/* 交通細節設定 */}
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-stone-800 space-y-3">
          <span className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            交通搭乘安排 (選填)
          </span>

          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="出發站 (例: Luzern)"
              value={transportFrom}
              onChange={(e) => setTransportFrom(e.target.value)}
            />
            <Input
              placeholder="抵達站 (例: Interlaken)"
              value={transportTo}
              onChange={(e) => setTransportTo(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={transportType}
              onChange={(e) => setTransportType(e.target.value as TransportType)}
            >
              <option value="train">火車 (Train)</option>
              <option value="cogwheel">齒軌高山火車 (Cogwheel)</option>
              <option value="cable-car">高空纜車 (Cable Car)</option>
              <option value="boat">渡輪遊船 (Boat)</option>
              <option value="bus">公車 (Bus)</option>
              <option value="walk">步行散策 (Walk)</option>
              <option value="car">自駕 (Car)</option>
              <option value="flight">航班 (Flight)</option>
            </Select>

            {isSwiss ? (
              <Select
                value={stpCoverage}
                onChange={(e) => setStpCoverage(e.target.value as STPCoverage)}
              >
                <option value="free">STP 100% 免費</option>
                <option value="half-price">STP 50% 折扣</option>
                <option value="not-covered">自費無折扣</option>
              </Select>
            ) : (
              <div />
            )}
          </div>
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
        </div>

        {/* 按鈕列 */}
        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary">
            {initialBlock ? '儲存變更' : '新增活動'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
