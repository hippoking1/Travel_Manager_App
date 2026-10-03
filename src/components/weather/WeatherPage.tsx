import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Video,
  ExternalLink,
  SunMedium,
  Layers,
  HeartHandshake,
  Wind,
  Droplets,
  ShieldAlert,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { useActiveTrip } from '../../stores/selectors';
import { hasModule } from '../../config/modules';
import { fetchBaseWeather, type WeatherData } from '../../services/weatherApi';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';

export const WeatherPage: React.FC = () => {
  const activeTrip = useActiveTrip();
  const { config } = useTripStore();
  const isSwiss = hasModule(activeTrip?.modules, 'swiss');

  const bases = config.bases || [];
  const [selectedBaseId, setSelectedBaseId] = useState<string>(bases[0]?.id || 'base-main');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const selectedBase = bases.find((b) => b.id === selectedBaseId) || bases[0];

  // 取得經緯度坐標
  const coords: [number, number] = selectedBase?.coordinates || [47.0502, 8.3093]; // 預設琉森

  const loadWeather = async () => {
    setIsLoading(true);
    const data = await fetchBaseWeather(coords[0], coords[1]);
    setWeatherData(data);
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedBase) {
      loadWeather();
    }
  }, [selectedBaseId, coords[0], coords[1]]);

  // 瑞士 6 大名峰即時影像
  const swissWebcams = [
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

  // 洋蔥式穿搭指南
  const layeringGuide = [
    {
      layer: '第 1 層：基礎底層 (Base Layer)',
      purpose: '貼身吸濕排汗、保持乾爽',
      items: '長袖美利諾羊毛 (Merino Wool) 或機能聚酯纖維發熱衣',
      suitableAltitude: '全天候通用',
      tips: '切忌純棉內衣！流汗後棉質變濕冰冷，在高山極易導致長輩與孩童失溫。',
      color: '#10B981',
    },
    {
      layer: '第 2 層：中層保暖 (Mid Layer)',
      purpose: '鎖住體溫空氣、隔絕寒氣',
      items: '刷毛外套 (Fleece) 或超輕量羽絨背心',
      suitableAltitude: '1,500m ~ 3,000m (高山健行 / 早晚溫差)',
      tips: '健行身體發熱時可直接拉開拉鍊散熱，體感最為靈活自在。',
      color: '#F59E0B',
    },
    {
      layer: '第 3 層：外層防護 (Outer Shell)',
      purpose: '全面抵禦高山狂風、冰川暴雨與高空雪水',
      items: '防風防水 GORE-TEX 外套 (附防風兜帽)',
      suitableAltitude: '全山區必備 (午後驟雨或瀑布乘船)',
      tips: '山區午後易起霧驟雨，防潑水外套即為最好的防護雨具。',
      color: '#0EA5E9',
    },
    {
      layer: '第 4 層：極地防寒 (Extreme Cold)',
      purpose: '抵禦零下嚴寒 (3,000m+ 冰川世界)',
      items: '高充絨量羽絨厚大衣、護耳保暖毛帽、防風保暖手套',
      suitableAltitude: '3,000m 以上高山峰頂 (終年積雪)',
      tips: '山下短袖山頂厚雪，一定要在背包隨身備妥防寒衣物！',
      color: '#8B5CF6',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 頁面標題 */}
      <PageHeader
        title="天氣預報與穿搭防護中心"
        subtitle="串接 Open-Meteo 全球衛星氣象，提供各停留基地 7 天高精度預報與洋蔥式穿搭指引"
        emoji="⛅"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadWeather}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>重新整理氣象</span>
          </Button>
        }
      />

      {/* 基地切換 Pills */}
      {bases.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider shrink-0 mr-1">
            停留基地：
          </span>
          {bases.map((base) => {
            const isSelected = base.id === selectedBaseId;
            return (
              <button
                key={base.id}
                onClick={() => setSelectedBaseId(base.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white border-transparent shadow-sm'
                    : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)]'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: base.color || '#0EA5E9' }}
                />
                <span>{base.nameZh}</span>
                <span className="opacity-80">({base.name})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 即時氣象看板與穿搭建議 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 即時天氣大看板 */}
        <Card className="p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                  <span>{selectedBase?.nameZh || '主要市區'}</span>
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] font-mono">
                  坐標: [{coords[0].toFixed(2)}, {coords[1].toFixed(2)}]
                </p>
              </div>
              <span className="text-4xl">{weatherData?.current.emoji || '🌤️'}</span>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-black text-[var(--color-text)] font-mono flex items-baseline gap-2">
                <span>{weatherData ? `${weatherData.current.temperature}°C` : '--°C'}</span>
                <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                  {weatherData?.current.description || '載入中...'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-500" />
                <span>濕度: {weatherData?.current.humidity ?? '--'}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-teal-500" />
                <span>風速: {weatherData?.current.windSpeed ?? '--'} km/h</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[var(--color-text-muted)] mt-4">
            資料來源：Open-Meteo · 時區 {weatherData?.timezone || '自動偵測'}
          </p>
        </Card>

        {/* 穿搭與安全建議 */}
        <Card className="lg:col-span-2 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] mb-2">
              <Layers className="w-4 h-4" />
              <span>今日智能穿搭與出行建議</span>
            </div>
            <p className="text-sm sm:text-base text-[var(--color-text)] font-medium leading-relaxed">
              {weatherData?.clothingAdvice || '依據當日高低溫與天氣現象為您推算建議中...'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>山區早晚溫差顯著，建議隨身攜帶輕量中層或防風保暖背心。</span>
            </div>
            <div className="flex items-start gap-2">
              <SunMedium className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span>高海拔地區紫外線穿透力強，外出健行請做好防曬與墨鏡防護。</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 7 天預報列表 */}
      {weatherData && weatherData.daily.length > 0 && (
        <Card className="p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
            <CloudSun className="w-4 h-4 text-[var(--color-primary)]" />
            <span>未來 7 天天氣預報 (Open-Meteo Forecast)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weatherData.daily.map((day) => (
              <div
                key={day.date}
                className="bg-[var(--color-bg)] p-3 rounded-xl border border-[var(--color-border)] flex flex-col items-center justify-between text-center gap-2"
              >
                <div className="text-xs font-bold text-[var(--color-text-muted)] font-mono">
                  {day.date.slice(5)}
                </div>
                <span className="text-3xl my-1">{day.emoji}</span>
                <span className="text-xs font-semibold text-[var(--color-text)] truncate max-w-full">
                  {day.description}
                </span>

                <div className="text-xs font-mono text-[var(--color-text)]">
                  <span className="font-bold text-red-500">{day.tempMax}°</span>
                  <span className="text-[var(--color-text-muted)] mx-1">/</span>
                  <span className="font-semibold text-blue-500">{day.tempMin}°</span>
                </div>

                <div className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 font-mono">
                  <Droplets className="w-3 h-3 text-sky-500" />
                  <span>{day.precipProbMax}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 洋蔥式穿搭指南 */}
      <Card className="p-5 sm:p-6 space-y-4">
        <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--color-primary)]" />
          <span>洋蔥式穿搭科學指南 (Layering Guide)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {layeringGuide.map((layer, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-[var(--color-text)]" style={{ color: layer.color }}>
                  {layer.layer}
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] font-mono">
                  {layer.suitableAltitude}
                </span>
              </div>
              <p className="text-xs font-medium text-[var(--color-text)]">{layer.items}</p>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                💡 {layer.tips}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* 瑞士專屬 6 大名峰 WebCam 即時影像 */}
      {isSwiss && (
        <Card className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
            <div>
              <h3 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-500" />
                <span>瑞士阿爾卑斯名峰即時 Live WebCam</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                登山前務必查看山頂即時影像確認能見度，避免上山後被大霧籠罩。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {swissWebcams.map((cam, idx) => (
              <a
                key={idx}
                href={cam.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)]/50 transition-all flex flex-col justify-between gap-2 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      {cam.name}
                    </h4>
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 group-hover:text-[var(--color-primary)]" />
                  </div>
                  <div className="text-xs text-sky-600 dark:text-sky-400 font-mono mt-1">
                    海拔: {cam.altitude} · 常見溫標: {cam.tempRange}
                  </div>
                </div>
                <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2">
                  {cam.warning}
                </p>
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* 高海拔安全與 UV 警示卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 高山症與長輩關懷卡 */}
        <Card className="p-5 space-y-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <HeartHandshake className="w-5 h-5 shrink-0" />
            <span>三代同遊高海拔防護要點</span>
          </div>
          <ul className="text-xs text-[var(--color-text-muted)] space-y-2 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-amber-500 font-bold">1.</span>
              <span><strong>步調放慢：</strong>登上 3,000m 以上高山時空氣含氧量低，提醒長輩與幼童不可奔跑跳躍。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-500 font-bold">2.</span>
              <span><strong>自備溫熱開水：</strong>隨身攜帶保溫瓶裝熱水，適時小口啜飲，能有效舒緩血管緊縮與不適。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-500 font-bold">3.</span>
              <span><strong>常備藥品隨身帶：</strong>長輩降血壓、止痛藥與高山適應備藥請放隨身包，勿放托運行李。</span>
            </li>
          </ul>
        </Card>

        {/* 極限 UV 紫外線防護卡 */}
        <Card className="p-5 space-y-3 border-sky-500/30 bg-sky-500/5">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
            <SunMedium className="w-5 h-5 shrink-0" />
            <span>戶外極端紫外線 (UV 8+) 防護</span>
          </div>
          <ul className="text-xs text-[var(--color-text-muted)] space-y-2 leading-relaxed">
            <li className="flex items-start gap-1.5">
              <span className="text-sky-500 font-bold">1.</span>
              <span><strong>雪地高反射率：</strong>白雪反射強烈紫外線，同行長輩與孩童務必配戴抗 UV 400 偏光墨鏡。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-sky-500 font-bold">2.</span>
              <span><strong>高係數防曬護唇：</strong>氣候乾燥易乾裂，出門前擦拭防曬護唇膏與 SPF 50+ 防曬霜。</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-sky-500 font-bold">3.</span>
              <span><strong>隨時關注降雨雷達：</strong>出門前確認當日降雨機率，避免午後驟雨受阻於山嶺步道。</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};
