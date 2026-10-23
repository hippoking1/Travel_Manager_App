import { describe, it, expect } from 'vitest';
import {
  parseTimeToMinutes,
  calculateMinutesDiff,
  formatMinutes,
  calculateTransferBuffer,
  buildGoogleMapsTransitUrl,
  normalizeTransitLeg,
  aggregateTransportDetail,
  TRANSPORT_TYPE_CONFIG,
} from './transit';
import type { TransitLeg } from '../types';

describe('transit utilities', () => {
  it('parses time strings to minutes accurately', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('08:30')).toBe(510);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
    expect(parseTimeToMinutes('invalid')).toBeNull();
    expect(parseTimeToMinutes(null)).toBeNull();
    expect(parseTimeToMinutes('25:00')).toBeNull();
  });

  it('calculates minute differences including midnight wrap', () => {
    expect(calculateMinutesDiff('08:30', '09:15')).toBe(45);
    expect(calculateMinutesDiff('23:45', '00:15')).toBe(30);
    expect(calculateMinutesDiff('12:00', '12:00')).toBe(0);
    expect(calculateMinutesDiff('invalid', '12:00')).toBeNull();
  });

  it('formats minutes into human readable text', () => {
    expect(formatMinutes(0)).toBe('0 分鐘');
    expect(formatMinutes(25)).toBe('25 分鐘');
    expect(formatMinutes(60)).toBe('1 小時');
    expect(formatMinutes(75)).toBe('1 小時 15 分鐘');
    expect(formatMinutes(130)).toBe('2 小時 10 分鐘');
  });

  it('calculates transfer wait buffer between legs', () => {
    // Arrival at 09:10, next train departure at 09:22 -> 12 mins buffer
    expect(calculateTransferBuffer('09:10', '09:22')).toBe(12);
  });

  it('builds google maps transit directions url', () => {
    const url = buildGoogleMapsTransitUrl({ from: '京都車站', to: '清水寺' });
    expect(url).toContain('google.com/maps/dir');
    expect(url).toContain('travelmode=transit');
    expect(url).toContain(encodeURIComponent('京都車站'));
    expect(url).toContain(encodeURIComponent('清水寺'));

    const customUrl = 'https://custom.maps/route/123';
    expect(buildGoogleMapsTransitUrl({ from: 'A', to: 'B', routeUrl: customUrl })).toBe(customUrl);
  });

  it('normalizes transit leg with defaults and trims', () => {
    const leg = normalizeTransitLeg({
      from: ' 新宿站 ',
      to: ' 澀谷站 ',
      type: 'metro',
      lineName: ' 山手線 ',
    });

    expect(leg.id).toBeDefined();
    expect(leg.from).toBe('新宿站');
    expect(leg.to).toBe('澀谷站');
    expect(leg.type).toBe('metro');
    expect(leg.lineName).toBe('山手線');
  });

  it('aggregates multiple legs into TransportDetail summary', () => {
    const legs: TransitLeg[] = [
      {
        id: 'leg-1',
        type: 'bus',
        from: '台北車站',
        fromPlatform: '承德路站牌',
        to: '捷運大安站',
        departureTime: '08:30',
        arrivalTime: '08:48',
        lineName: '公車信義幹線',
      },
      {
        id: 'leg-2',
        type: 'metro',
        from: '捷運大安站',
        to: '台北101/世貿站',
        fromPlatform: '月台 2',
        departureTime: '08:54',
        arrivalTime: '09:02',
        lineName: '淡水信義線 往象山',
      },
    ];

    const aggregated = aggregateTransportDetail(legs);
    expect(aggregated).toBeDefined();
    expect(aggregated?.from).toBe('台北車站');
    expect(aggregated?.to).toBe('台北101/世貿站');
    expect(aggregated?.departureTime).toBe('08:30');
    expect(aggregated?.arrivalTime).toBe('09:02');
    expect(aggregated?.duration).toBe('32 分鐘');
    expect(aggregated?.lineInfo).toContain('公車');
    expect(aggregated?.lineInfo).toContain('捷運');
    expect(aggregated?.legs?.length).toBe(2);
  });

  it('supports all defined transport types with labels and icons', () => {
    const types = Object.keys(TRANSPORT_TYPE_CONFIG);
    expect(types).toContain('metro');
    expect(types).toContain('high-speed-rail');
    expect(types).toContain('tram');
    expect(types).toContain('bus');
    expect(types).toContain('train');
  });
});
