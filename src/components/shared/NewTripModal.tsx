import React, { useState } from 'react';
import { X, Plane, Sparkles, Calendar, MapPin, Compass } from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';

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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">建立全新旅遊計畫</h2>
              <p className="text-xs text-slate-400">適用於日本、歐洲、海島或任何自訂天數之自由行慢遊</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* 旅程名稱 */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              旅程名稱 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：2028 日本關西賞櫻慢遊、冰島自駕環島"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
            />
          </div>

          {/* 目的地 & 代表圖標 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span>目的地 / 國家城市</span>
              </label>
              <input
                type="text"
                placeholder="例如：日本 京都 / 大阪、冰島"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                封面 Emoji
              </label>
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5">
                <span className="text-xl">{coverEmoji}</span>
                <select
                  value={coverEmoji}
                  onChange={(e) => setCoverEmoji(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none w-full cursor-pointer"
                >
                  {POPULAR_EMOJIS.map((emoji) => (
                    <option key={emoji} value={emoji} className="bg-slate-900 text-white">
                      {emoji}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 總天數 & 出發首日 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                預計總天數 (可隨時增減)
              </label>
              <div className="flex items-center border border-slate-700 rounded-xl overflow-hidden bg-slate-950">
                <button
                  type="button"
                  onClick={() => setTotalDays((prev) => Math.max(1, prev - 1))}
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={totalDays}
                  onChange={(e) => setTotalDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-transparent text-center font-mono font-bold text-white focus:outline-none text-xs sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setTotalDays((prev) => Math.min(90, prev + 1))}
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>預計出發日 (選填)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* 選擇初始化範本 */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-300 mb-2">
              初始化規劃範本
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                onClick={() => setTemplate('blank')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  template === 'blank'
                    ? 'bg-slate-800/90 border-red-500 ring-1 ring-red-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs sm:text-sm text-white">全新空白自由行 (推薦)</span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  建立 {totalDays} 天乾淨空白時段卡片，自動備妥必備行李清單與記帳幣別。
                </p>
              </label>

              <label
                onClick={() => setTemplate('swiss-demo')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  template === 'swiss-demo'
                    ? 'bg-slate-800/90 border-red-500 ring-1 ring-red-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs sm:text-sm text-white">瑞士 16 天示範範本</span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  複製完整 16 天 4 大基地、高山火車、家庭成員配置與景點示範。
                </p>
              </label>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4" />
              <span>建立並立即切換</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
