import React, { useState, useEffect } from 'react';
import { Plane, Sparkles, Compass } from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Field';
import { NumberStepper } from '../ui/NumberStepper';
import { Button } from '../ui/Button';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_EMOJIS = ['✈️', '🇯🇵', '🇨🇭', '🇫🇷', '🇬🇧', '🇺🇸', '🇰🇷', '🇹🇼', '🏔️', '🏝️', '🌸', '🏰', '🏕️', '🍜'];

export const NewTripModal: React.FC<NewTripModalProps> = ({ isOpen, onClose }) => {
  const { createTrip } = useTripStore();

  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [coverEmoji, setCoverEmoji] = useState('✈️');
  const [totalDays, setTotalDays] = useState(7);
  const [startDate, setStartDate] = useState('');
  const [template, setTemplate] = useState<'blank' | 'swiss-demo'>('blank');

  // 每次開啟時重設表單狀態
  useEffect(() => {
    if (isOpen) {
      setTripName('');
      setDestination('');
      setCoverEmoji('✈️');
      setTotalDays(7);
      setStartDate('');
      setTemplate('blank');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim()) return;

    createTrip({
      name: tripName.trim(),
      destination: destination.trim() || undefined,
      coverEmoji,
      totalDays: Number(totalDays) || 5,
      startDate: startDate || null,
      template,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white dark:text-stone-950 shadow-sm">
            <Compass className="w-4 h-4" />
          </div>
          <span>建立全新旅遊計畫</span>
        </div>
      }
      description="自由行自訂行程，支援任何國家城市與彈性日程安排"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 旅程名稱 */}
        <Input
          label="旅程名稱"
          required
          placeholder="例如：2028 日本關西賞櫻慢遊、冰島自駕環島"
          value={tripName}
          onChange={(e) => setTripName(e.target.value)}
          autoFocus
        />

        {/* 目的地 & 封面 Emoji */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="目的地國家 / 城市"
              placeholder="例如：日本 京都 / 大阪、瑞士"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
              代表 Emoji
            </label>
            <div className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl px-2.5 py-1.5">
              <span className="text-xl shrink-0">{coverEmoji}</span>
              <select
                value={coverEmoji}
                onChange={(e) => setCoverEmoji(e.target.value)}
                className="bg-transparent text-xs text-stone-900 dark:text-stone-100 focus:outline-none w-full cursor-pointer"
              >
                {POPULAR_EMOJIS.map((emoji) => (
                  <option key={emoji} value={emoji} className="bg-white dark:bg-stone-900">
                    {emoji}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 總天數 & 出發首日 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <NumberStepper
            label="預計天數 (可隨時增減)"
            value={totalDays}
            onChange={(val) => setTotalDays(val)}
            min={1}
            max={90}
            unit="天"
          />

          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
              預計出發日 (選填)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono"
            />
          </div>
        </div>

        {/* 選擇初始化範本 */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-2">
            初始化規劃範本
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div
              onClick={() => setTemplate('blank')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1 ${
                template === 'blank'
                  ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-600 dark:border-teal-500 ring-1 ring-teal-600 dark:ring-teal-500'
                  : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                  全新空白行程 (推薦)
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                建立 {totalDays} 天乾淨空白時段卡片，可自由從景點池拖拉排程。
              </p>
            </div>

            <div
              onClick={() => setTemplate('swiss-demo')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1 ${
                template === 'swiss-demo'
                  ? 'bg-teal-50/60 dark:bg-teal-950/30 border-teal-600 dark:border-teal-500 ring-1 ring-teal-600 dark:ring-teal-500'
                  : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100">
                  瑞士 16 天經典示範
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                複製完整 16 天瑞士四大基地、高山火車與三代同堂家庭示範資料。
              </p>
            </div>
          </div>
        </div>

        {/* 表單按鈕 */}
        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" icon={<Compass className="w-4 h-4" />}>
            建立並開始規劃
          </Button>
        </div>
      </form>
    </Modal>
  );
};
