/**
 * Open-Meteo 免費氣象 API 整合服務
 * 免 API Key、全球涵蓋、高精度阿爾卑斯與各國城市預報
 */

export interface WeatherCurrent {
  time: string;
  temperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  description: string;
  emoji: string;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipProbMax: number;
  uvIndexMax: number;
  description: string;
  emoji: string;
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  current: WeatherCurrent;
  daily: DailyForecast[];
  clothingAdvice: string;
}

/** WMO 天氣代碼解析與圖標 */
export function interpretWmoCode(code: number): { description: string; emoji: string } {
  switch (code) {
    case 0:
      return { description: '晴朗無雲', emoji: '☀️' };
    case 1:
      return { description: '主要晴朗', emoji: '🌤️' };
    case 2:
      return { description: '多雲時晴', emoji: '⛅' };
    case 3:
      return { description: '陰天多雲', emoji: '☁️' };
    case 45:
    case 48:
      return { description: '高山霧氣 / 濃霧', emoji: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { description: '輕微毛毛雨', emoji: '🌦️' };
    case 61:
    case 63:
      return { description: '陣雨', emoji: '🌧️' };
    case 65:
      return { description: '強降雨', emoji: '⛈️' };
    case 71:
    case 73:
    case 75:
      return { description: '高山飄雪 / 降雪', emoji: '❄️' };
    case 77:
      return { description: '冰晶米雪', emoji: '🌨️' };
    case 80:
    case 81:
    case 82:
      return { description: '驟雨', emoji: '🌧️' };
    case 85:
    case 86:
      return { description: '短暫暴風雪', emoji: '🌨️' };
    case 95:
      return { description: '高山雷陣雨', emoji: '⚡' };
    case 96:
    case 99:
      return { description: '雷雨夾帶冰雹', emoji: '⛈️' };
    default:
      return { description: '穩定', emoji: '🌤️' };
  }
}

/** 依氣溫與天氣推算即時穿搭與備用衣物建議 */
export function deriveClothingAdvice(tempMin: number, tempMax: number, weatherCode: number, uvMax: number): string {
  const parts: string[] = [];
  if (tempMin <= 0) {
    parts.push('清晨或夜間氣溫低於冰點，請備妥保暖發熱內著防寒');
  }

  if (tempMax <= 5) {
    parts.push('極地防寒：必備高充絨羽絨大衣、防風保暖手套與護耳毛帽');
  } else if (tempMax <= 12) {
    parts.push('寒冷保暖：厚毛衣/刷毛中層搭配防風防潑水外套');
  } else if (tempMax <= 18) {
    parts.push('舒適微涼：長袖薄發熱底層 + 輕便防風外套，早晚溫差顯著');
  } else {
    parts.push('溫暖舒適：短袖上衣，建議隨身攜帶薄外套防高山涼風');
  }

  if (weatherCode >= 51 && weatherCode <= 82) {
    parts.push('預報有降雨，務必攜帶防水透氣外層雨具或折疊傘');
  } else if (weatherCode >= 71) {
    parts.push('有降雪機率，請穿著防滑防潑水登山鞋');
  }

  if (uvMax >= 7) {
    parts.push('紫外線達高量級 (UV 7+)，請全程配戴抗UV墨鏡與塗抹防曬乳');
  }

  return parts.join('；');
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分鐘快取

/** 取得指定經緯度之即時氣象與 7 天預報 (Open-Meteo) */
export async function fetchBaseWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const cacheKey = `weather_${lat.toFixed(3)}_${lng.toFixed(3)}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return parsed.data;
      }
    }
  } catch {
    // 忽略快取讀取錯誤
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather fetch failed: ${res.statusText}`);

    const data = await res.json();
    const currentMeta = interpretWmoCode(data.current?.weather_code || 0);

    const dailyList: DailyForecast[] = (data.daily?.time || []).map((dateStr: string, idx: number) => {
      const code = data.daily.weather_code[idx] || 0;
      const meta = interpretWmoCode(code);
      return {
        date: dateStr,
        weatherCode: code,
        tempMax: Math.round(data.daily.temperature_2m_max[idx]),
        tempMin: Math.round(data.daily.temperature_2m_min[idx]),
        precipProbMax: data.daily.precipitation_probability_max[idx] || 0,
        uvIndexMax: Math.round(data.daily.uv_index_max[idx] || 0),
        description: meta.description,
        emoji: meta.emoji,
      };
    });

    const firstDay = dailyList[0] || { tempMin: 10, tempMax: 20, weatherCode: 0, uvIndexMax: 5 };
    const advice = deriveClothingAdvice(firstDay.tempMin, firstDay.tempMax, firstDay.weatherCode, firstDay.uvIndexMax);

    const result: WeatherData = {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      current: {
        time: data.current?.time || new Date().toISOString(),
        temperature: Math.round(data.current?.temperature_2m || 0),
        humidity: Math.round(data.current?.relative_humidity_2m || 0),
        weatherCode: data.current?.weather_code || 0,
        windSpeed: Math.round(data.current?.wind_speed_10m || 0),
        description: currentMeta.description,
        emoji: currentMeta.emoji,
      },
      daily: dailyList,
      clothingAdvice: advice,
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
    } catch {
      // 忽視 Storage 存儲上限例外
    }

    return result;
  } catch (err) {
    console.warn('Open-Meteo weather fetch error:', err);
    return null;
  }
}
