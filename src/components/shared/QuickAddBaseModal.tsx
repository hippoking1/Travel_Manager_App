import React, { useState } from 'react';
import { MapPin, Palette } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Field';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { useTripStore } from '../../stores/tripStore';

export interface QuickAddBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newBaseId: string) => void;
}

const PRESET_COLORS = [
  '#0EA5E9', // 天空藍
  '#10B981', // 翡翠綠
  '#F59E0B', // 琥珀黃
  '#E53E3E', // 瑞士紅
  '#8B5CF6', // 紫羅蘭
  '#EC4899', // 玫瑰粉
  '#14B8A6', // 湖水綠
];

export const QuickAddBaseModal: React.FC<QuickAddBaseModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { addBase } = useTripStore();

  const [nameZh, setNameZh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [hotelName, setHotelName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedZh = nameZh.trim();
    if (!trimmedZh) return;

    const coords: [number, number] | undefined =
      lat && lng ? [parseFloat(lat), parseFloat(lng)] : undefined;

    const newId = addBase(trimmedZh, nameEn.trim() || undefined, {
      color,
      hotelName: hotelName.trim() || undefined,
      coordinates: coords,
      notes: notes.trim() || undefined,
    });

    toast.success(`已成功建立景點區域「${trimmedZh}」`);
    onCreated?.(newId);
    onClose();

    // Reset fields
    setNameZh('');
    setNameEn('');
    setHotelName('');
    setLat('');
    setLng('');
    setNotes('');
  };

  const handleSafeClose = () => {
    if (nameZh.trim() || hotelName.trim()) {
      if (window.confirm('您有正在填寫的景點區域尚未儲存，確定要放棄填寫嗎？')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSafeClose}
      title="新增景點區域"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="中文名稱 (必填)"
            type="text"
            required
            autoFocus
            value={nameZh}
            onChange={(e) => setNameZh(e.target.value)}
            placeholder="例如: 伯恩、因特拉肯、少女峰區"
          />

          <Input
            label="英文名稱 / 拼音 (選填)"
            type="text"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="例如: Bern, Interlaken"
          />
        </div>

        {/* 代表色票 */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-stone-500" />
            <span>代表色票</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  color === c ? 'border-stone-900 dark:border-white scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-7 h-7 rounded-full border border-stone-300 cursor-pointer p-0 bg-transparent"
              title="自訂色票"
            />
          </div>
        </div>

        <Input
          label="主要住宿 / 據點地標 (選填)"
          type="text"
          value={hotelName}
          onChange={(e) => setHotelName(e.target.value)}
          placeholder="例如: Bern Central Apartment, 火車站周邊"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="緯度 Latitude (選填)"
            type="number"
            step="0.0001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="例如: 46.9480"
          />
          <Input
            label="經度 Longitude (選填)"
            type="number"
            step="0.0001"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="例如: 7.4474"
          />
        </div>

        <Input
          label="特色備註說明 (選填)"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="例如: 世界文化遺產鐘塔、阿勒河畔漫步"
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
          <Button type="button" variant="outline" onClick={handleSafeClose}>
            取消
          </Button>
          <Button type="submit" variant="primary">
            <MapPin className="w-4 h-4 mr-1.5" />
            <span>建立景點區域</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
