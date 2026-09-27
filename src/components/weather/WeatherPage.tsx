import React, { useState } from 'react';
import { 
  CloudSun, 
  Video, 
  ExternalLink, 
  CheckSquare, 
  Square, 
  SunMedium, 
  Layers, 
  HeartHandshake, 
  Plus 
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';

export const WeatherPage: React.FC = () => {
  const { checklist, toggleChecklistItem, addChecklistItem } = useTripStore();
  const [newItemText, setNewItemText] = useState('');
  const [newItemCat, setNewItemCat] = useState<'clothing' | 'seniors' | 'kids' | 'documents' | 'electronics'>('clothing');

  const webcams = [
    {
      name: '馬特洪峰冰川天堂 (Matterhorn Glacier Paradise)',
      altitude: '3,883m',
      url: 'https://www.matterhornparadise.ch/en/Current-information/Webcams',
      tempRange: '-5°C ~ 3°C',
      warning: '歐洲最高纜車站，全年皆為真冰雪世界！',
    },
    {
      name: '戈爾內格拉特觀景台 (Gornergrat)',
      altitude: '3,089m',
      url: 'https://www.gornergrat.ch/en/pages/webcams',
      tempRange: '2°C ~ 9°C',
      warning: '觀賞利菲爾湖馬特洪峰倒影前，必查即時無風狀況。',
    },
    {
      name: '格林德瓦菲斯特山 (First Cliff Walk)',
      altitude: '2,168m',
      url: 'https://www.jungfrau.ch/en-gb/live/webcams/#first',
      tempRange: '8°C ~ 16°C',
      warning: '高山卡丁車與飛天椅遇雷雨強風會暫時關閉。',
    },
    {
      name: '皮拉圖斯山神龍峰 (Mt. Pilatus)',
      altitude: '2,132m',
      url: 'https://www.pilatus.ch/en/live/',
      tempRange: '9°C ~ 17°C',
      warning: '金色環線齒軌火車與山頂天氣多變。',
    },
    {
      name: '山巒皇后瑞吉山 (Rigi Kulm)',
      altitude: '1,798m',
      url: 'https://www.rigi.ch/en/information/webcams',
      tempRange: '12°C ~ 20°C',
      warning: '雲海奇景與琉森湖 360 度全景。',
    },
    {
      name: '世界最陡纜車 (Stoos 110%)',
      altitude: '1,305m',
      url: 'https://stoos.roundshot.com/',
      tempRange: '14°C ~ 22°C',
      warning: '四筒滾輪纜車山頂村莊木棧小徑視野。',
    },
  ];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    addChecklistItem({
      category: newItemCat,
      categoryLabel: newItemCat === 'clothing' ? '洋蔥式穿搭' : '行李必備',
      item: newItemText.trim(),
      checked: false,
      priority: 'high',
    });

    setNewItemText('');
  };

  const completedCount = checklist.filter((c) => c.checked).length;
  const progressPercent = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* 標題與簡介 */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <CloudSun className="w-6 h-6 text-sky-400" />
          <span>高海拔與天氣安全中心 (Weather & Safety)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          整合瑞士阿爾卑斯 6 大名峰即時視訊 WebCam、UV 紫外線防護、高山症警訊與洋蔥式穿搭清單。
        </p>
      </div>

      {/* 高海拔安全與 UV 警示卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 高山症與長輩關懷卡 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-900/60 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <HeartHandshake className="w-5 h-5 text-amber-400 shrink-0" />
            <span>三代同遊高海拔防護要點 (0m ➔ 3,883m)</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">1.</span>
              <span><strong>步調放慢一半：</strong>登上 Gornergrat (3,089m) 與冰川天堂 (3,883m) 時，空氣含氧量僅平地 60%，提醒長輩與小孩不可奔跑跳躍。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">2.</span>
              <span><strong>自備溫熱開水：</strong>隨身攜帶保溫瓶裝熱水，適時小口啜飲，能有效舒緩頭部血管緊縮。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-400 font-bold">3.</span>
              <span><strong>常備藥品隨身攜帶：</strong>長輩降血壓、關節止痛藥，以及全家單那敏/丹木斯 (Acetazolamide) 高山適應備藥放隨身包，勿放托運行李。</span>
            </li>
          </ul>
        </div>

        {/* 極限 UV 紫外線防護卡 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-sky-900/60 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
            <SunMedium className="w-5 h-5 text-sky-400 shrink-0" />
            <span>阿爾卑斯極端紫外線 (UV 8+) 防護</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-sky-400 font-bold">1.</span>
              <span><strong>雪地反射高達 80%：</strong>在冰川宮殿與雪地中，白雪反射強烈紫外線，長輩與兒童必須全程配戴抗 UV 400 偏光墨鏡，預防雪盲灼傷。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-sky-400 font-bold">2.</span>
              <span><strong>高係數防曬與護唇：</strong>瑞士氣候乾燥，嘴唇與鼻翼極易乾裂，出門前務必擦拭防曬護唇膏與 SPF 50+ 防曬霜。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-sky-400 font-bold">3.</span>
              <span><strong>MeteoSwiss 官方預報：</strong>出門前下載官方 App，隨時掌握每小時降雨雷達與高山能見度。</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 6 大名峰即時 WebCam 監控網格 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" />
              <span>關鍵山峰即時影像與氣象傳送門 (Live WebCams)</span>
            </h3>
            <p className="text-xs text-slate-400">出門前 10 分鐘必看！山下陰天山頂往往是壯麗雲海大晴天。</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {webcams.map((cam, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                    {cam.altitude}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {cam.tempRange}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white mb-1.5 line-clamp-1">
                  {cam.name}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {cam.warning}
                </p>
              </div>

              <a
                href={cam.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 transition-colors border border-slate-700/60"
              >
                <span>開啟官方即時 WebCam</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* 洋蔥式穿搭與行李清單打勾區塊 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>洋蔥式穿搭與全家行李清單 (共用雲端打勾)</span>
            </h3>
            <p className="text-xs text-slate-400">所有打勾狀態自動同步至 Google Sheets，家人隨手確認不漏帶！</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">準備進度：</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{progressPercent}%</span>
            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* 快速新增備品輸入列 */}
        <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-2">
          <select
            value={newItemCat}
            onChange={(e) => setNewItemCat(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="clothing">洋蔥式穿搭</option>
            <option value="seniors">長輩專屬</option>
            <option value="kids">幼童專屬</option>
            <option value="documents">證件檔案</option>
            <option value="electronics">電子電器</option>
          </select>
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="新增行李備品（例如：爺爺圍巾、暈車藥、指甲刀）..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增項目</span>
          </button>
        </form>

        {/* 項目勾選列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto pr-1">
          {checklist.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleChecklistItem(item.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                item.checked
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="mt-0.5 text-emerald-400 shrink-0">
                {item.checked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Square className="w-4 h-4 text-slate-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={`text-xs font-medium block leading-relaxed ${
                    item.checked ? 'line-through text-slate-500' : 'text-slate-200'
                  }`}
                >
                  {item.item}
                </span>

                <div className="flex items-center gap-2 mt-1">
                  {item.altitudeRange && (
                    <span className="text-[10px] text-cyan-400 font-mono bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-900/60">
                      {item.altitudeRange}
                    </span>
                  )}
                  {item.categoryLabel && (
                    <span className="text-[10px] text-slate-400">
                      #{item.categoryLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
