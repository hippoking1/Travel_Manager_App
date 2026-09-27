import React from 'react';
import { 
  Mountain, 
  Sunrise, 
  Camera, 
  Sparkles, 
  Clock, 
  MapPin 
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { getZermattSunriseTime } from '../../utils/dates';

export const MatterhornPage: React.FC = () => {
  const { config } = useTripStore();
  const sunriseTime = getZermattSunriseTime(config.startDate);

  // 攝影點清單
  const photoSpots = [
    {
      title: '陽台直擊日照金山 (Balcony Golden Sunrise)',
      location: '策馬特民宿陽台 (Primavista / Jolimont)',
      time: '清晨 05:25 - 05:45 (最佳拍攝窗口僅 15 分鐘)',
      cameraTips: '鎖定 AE/AF 曝光在山尖、色溫手動設為 5500K-6000K 捕捉暖橘紅金光、關閉閃光燈、使用手機三腳架或將手肘固定於陽台護欄。',
      highlights: '穿著睡衣在熱咖啡香氣中直面神山燃燒，免除清晨戶外吹風奔波，長輩小孩最愛！',
      tags: ['無敵陽台', '金頂日出', '免吹風'],
    },
    {
      title: '利菲爾湖馬特洪峰倒影 (Riffelsee Reflection)',
      location: '戈爾內格拉特鐵道 Rotenboden 站下車步行 10 分鐘',
      time: '上午 08:30 - 10:30 (高山無風期最澄澈如鏡面)',
      cameraTips: '低角度貼近湖面拍攝倒影、使用超廣角 0.5x 鏡頭將水草與雪山一併收入、加上 CPL 偏光鏡消除水面雜光。',
      highlights: '世界地理雜誌封面照經典角度，湖面平靜無波時宛如兩座馬特洪峰相映成趣！',
      tags: ['倒影奇蹟', '家庭合照首推'],
    },
    {
      title: '策馬特教堂橋 (Kirchbrücke)',
      location: '策馬特鎮中心天主教堂旁橋樑',
      time: '清晨 05:20 或 黃昏傍晚 20:30 藍調時刻 (Blue Hour)',
      cameraTips: '利用橋下潺潺瓦萊冰川溪流作為前景延伸線條，以長焦 3x 鏡頭壓縮神山與老城木屋距離。',
      highlights: '全鎮最富盛名的大眾日出朝聖點，早晨聚集各國攝影大師，熱鬧非凡。',
      tags: ['經典橋景', '溪流前景'],
    },
    {
      title: '蘇內加芬德恩村 (Chez Vrony 躺椅視角)',
      location: 'Sunnegga ➔ Findeln 村落木屋步道旁',
      time: '下午 13:00 - 15:30 順光絕佳',
      cameraTips: '以阿爾卑斯木屋黑木牆、盛開天竺葵紅花為前景框景 (Framing)。',
      highlights: '一邊享用有機牛肉漢堡，一邊在無遮蔽景觀躺椅上悠哉欣賞雄踞群山的馬特洪峰。',
      tags: ['木屋框景', '高山美食視角'],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <Mountain className="w-6 h-6 text-red-500" />
          <span>陽台馬特洪金頂日出與攝影取景指南 (Matterhorn Guide)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          策馬特基地 (Base 3) 專屬黃金日照金山攻略，以及世界級利菲爾湖名鏡拍攝秘訣。
        </p>
      </div>

      {/* 頂部：金頂日出倒數神級看板 */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-red-950/70 border border-amber-600/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-widest">
              <Sunrise className="w-4 h-4" />
              <span>Base 3 (Zermatt) 陽台日出觀測預報</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              黃金馬特洪峰日出時刻 (Golden Sunrise)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              旅行月份（6月 / 7月）晨曦第一縷陽光預計於 <strong className="text-amber-300 font-mono text-base">{sunriseTime}</strong> 精確點燃馬特洪峰東壁刀削尖頂！請提前 15 分鐘（05:15）備妥腳架與熱茶守候。
            </p>
          </div>

          {/* 晨曦時鐘大方塊 */}
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 sm:p-6 text-center shadow-xl shrink-0">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
              推估日出時間
            </span>
            <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
              {sunriseTime}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              持續燃燒時間：約 15-20 分鐘
            </span>
          </div>
        </div>

        {/* 陽台拍攝 SOP 三步驟 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-amber-900/50 text-xs">
          <div className="flex items-start gap-2 text-slate-200">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0">1</span>
            <div>
              <strong className="text-amber-300 block mb-0.5">前晚設定鬧鐘 (05:10)</strong>
              <span>將手機/相機電池充飽電，陽台落地窗先開啟微縫防止室內外溫差霧氣。</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-slate-200">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0">2</span>
            <div>
              <strong className="text-amber-300 block mb-0.5">對焦與測光鎖定 (05:25)</strong>
              <span>手機鏡頭長按馬特洪尖端鎖定 AE/AF，手動稍微下拉小太陽降低曝光半檔防過曝。</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-slate-200">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0">3</span>
            <div>
              <strong className="text-amber-300 block mb-0.5">錄製 4K 縮時攝影 (05:30)</strong>
              <span>切換手機「縮時攝影 (Time-lapse)」錄下整座山峰從暗藍轉變為熊熊金火的史詩畫面。</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 大封神攝影點機位圖鑑 */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Camera className="w-5 h-5 text-sky-400" />
          <span>策馬特 4 大世界級神話攝影點機位指南</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {photoSpots.map((spot, idx) => (
            <div
              key={idx}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    {spot.title}
                  </h4>
                  <div className="flex gap-1 flex-wrap">
                    {spot.tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-sky-400 mb-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{spot.location}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono mb-3">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{spot.time}</span>
                </div>

                {/* 相機設定參數與取景技巧 */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>專業取景與曝光參數：</span>
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    {spot.cameraTips}
                  </p>
                </div>
              </div>

              {/* 亮點總結 */}
              <p className="text-xs text-slate-300 border-t border-slate-800/80 pt-2 leading-relaxed">
                ★ {spot.highlights}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
