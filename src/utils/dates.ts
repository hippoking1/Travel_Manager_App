import { addDays, format, differenceInDays, parseISO, isValid } from 'date-fns';
import { zhTW } from 'date-fns/locale';

/**
 * 根據旅行出發日與天數計算實際日期字串
 * @param startDate ISO 字串 (e.g. "2027-06-15")
 * @param dayNumber 第幾天 (1, 2, ... 16)
 * @param formatPattern 格式化樣式 (預設 "MM/dd (eee)")
 */
export function formatDayDate(
  startDate: string | null | undefined,
  dayNumber: number,
  formatPattern: string = 'MM/dd (eee)'
): string {
  if (!startDate) {
    return `Day ${dayNumber}`;
  }

  try {
    const baseDate = parseISO(startDate);
    if (!isValid(baseDate)) return `Day ${dayNumber}`;
    const targetDate = addDays(baseDate, dayNumber - 1);
    return format(targetDate, formatPattern, { locale: zhTW });
  } catch {
    return `Day ${dayNumber}`;
  }
}

/**
 * 計算距離旅行開始的倒數天數
 */
export function getDaysUntilTrip(
  startDate: string | null | undefined,
  totalDays: number = 16
): {
  days: number;
  status: 'upcoming' | 'ongoing' | 'passed' | 'unset';
  text: string;
} {
  if (!startDate) {
    return { days: 0, status: 'unset', text: '尚未設定出發日' };
  }

  try {
    const target = parseISO(startDate);
    if (!isValid(target)) return { days: 0, status: 'unset', text: '日期格式有誤' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diff = differenceInDays(target, today);

    if (diff > 0) {
      return { days: diff, status: 'upcoming', text: `倒數 ${diff} 天出發` };
    } else if (diff >= -totalDays && diff <= 0) {
      return { days: Math.abs(diff) + 1, status: 'ongoing', text: `行程進行中 (第 ${Math.abs(diff) + 1} 天)` };
    } else {
      return { days: Math.abs(diff), status: 'passed', text: `旅行已圓滿完成` };
    }
  } catch {
    return { days: 0, status: 'unset', text: '尚未設定' };
  }
}

/**
 * 策馬特 (Zermatt) 日出時間推估 (根據月份)
 * 夏至 6月約 05:28，7月約 05:40，8月約 06:15
 */
export function getZermattSunriseTime(startDate: string | null | undefined): string {
  if (!startDate) return '05:30 AM';
  try {
    const d = parseISO(startDate);
    const month = d.getMonth() + 1; // 1-12
    if (month === 6) return '05:28 AM';
    if (month === 7) return '05:38 AM';
    if (month === 8) return '06:12 AM';
    if (month === 9) return '06:50 AM';
    return '05:30 AM';
  } catch {
    return '05:30 AM';
  }
}
