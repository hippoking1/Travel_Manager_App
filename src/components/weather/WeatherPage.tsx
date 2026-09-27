import React from 'react';
import { 
  CloudSun, 
  Video, 
  ExternalLink, 
  SunMedium, 
  Layers, 
  HeartHandshake, 
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const WeatherPage: React.FC = () => {
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

  const layeringGuide = [
    {
      layer: '第 1 層：基礎底層 (Base Layer)',
      purpose: '貼身吸濕排汗、保持乾爽',
      items: '長袖美利諾羊毛 (Merino Wool) 或機能聚酯纖維發熱衣',
      suitableAltitude: '0m ~ 3,883m 全海拔通用',
      tips: '切忌純棉內衣！流汗後棉質變濕冰冷，在高山極易導致長輩與孩童失溫。',
      color: '#10B981',
    },
    {
      layer: '第 2 層：中層保暖 (Mid Layer)',
      purpose: '鎖住體溫空氣、隔絕寒氣',
      items: '刷毛外套 (Fleece) 或超輕量羽絨背心',
      suitableAltitude: '1,500m ~ 3,000m (策馬特、高山健行)',
      tips: '健行身體發熱時可直接拉開拉鍊散熱，體感最為靈活自在。',
      color: '#F59E0B',
    },
    {
      layer: '第 3 層：外層防護 (Outer Shell)',
      purpose: '全面抵禦高山狂風、冰川暴雨與高空雪水',
      items: '防風防水 GORE-TEX 外套 (附防風兜帽)',
      suitableAltitude: '全山區必備 (尤其皮拉圖斯與萊茵瀑布衝浪)',
      tips: '瑞士山區午後易起霧驟雨，防潑水外套即為最好的防護雨具。',
      color: '#0EA5E9',
    },
    {
      layer: '第 4 層：極地防寒 (Extreme Cold)',
      purpose: '抵禦零下嚴寒 (3,883m 冰川世界)',
      items: '高充絨量羽絨厚大衣、護耳保暖毛帽、防風保暖手套',
      suitableAltitude: '馬特洪冰川天堂專用 (終年零度以下)',
      tips: '高山電梯上山僅需 45 分鐘，山下短袖山頂厚雪，一定要在背包備妥！',
      color: '#8B5CF6',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* 標題與簡介 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <CloudSun className="w-6 h-6 text-sky-400" />
            <span>高海拔與天氣安全中心 (Weather & Safety)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            阿爾卑斯 6 大名峰即時 WebCam、氣象預報、UV 紫外線防護與洋蔥式穿搭科學指南。
          </p>
        </div>

        {/* 移出之 Checklist 專屬跳轉連結 (滿足需求 3) */}
        <Link
          to="/checklist"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950 shrink-0 self-start sm:self-auto"
        >
          <span>查看獨立行李清單</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
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
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-red-500" />
            <span>關鍵山峰即時影像與氣象傳送門 (Live WebCams)</span>
          </h3>
          <p className="text-xs text-slate-400">出門前 10 分鐘必看！山下陰天山頂往往是壯麗雲海大晴天。</p>
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

      {/* 洋蔥式穿搭分層指南 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>洋蔥式 (Onion Layering) 穿搭科學指南</span>
            </h3>
            <p className="text-xs text-slate-400">瑞士一日歷經四季，由平地 25°C 直上山頂 -2°C 的完美穿脫法則。</p>
          </div>

          <Link
            to="/checklist"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>到行李清單打勾 ➔</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {layeringGuide.map((layer, idx) => (
            <div
              key={idx}
              className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-white" style={{ color: layer.color }}>
                  {layer.layer}
                </h4>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/60">
                  {layer.suitableAltitude}
                </span>
              </div>

              <div className="text-xs text-slate-200 font-medium">
                <strong>推薦備品：</strong>{layer.items}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 <strong>專家小訣竅：</strong>{layer.tips}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
