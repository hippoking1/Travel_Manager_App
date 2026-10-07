import { describe, it, expect } from 'vitest';
import type { LocationCategory } from '../../types';

describe('Map category filtering logic', () => {
  it('correctly filters locations by selectedCategory', () => {
    const mockLocations = [
      { id: '1', name: 'Hotel A', nameZh: '飯店A', category: 'base' as LocationCategory, coordinates: [47, 8] as [number, number], dayNumbers: [1] },
      { id: '2', name: 'Station B', nameZh: '車站B', category: 'station' as LocationCategory, coordinates: [47.1, 8.1] as [number, number], dayNumbers: [2] },
      { id: '3', name: 'Peak C', nameZh: '名峰C', category: 'peak' as LocationCategory, coordinates: [46.9, 8.2] as [number, number], dayNumbers: [3] },
    ];

    let selectedCategory: string = 'all';
    let filtered = mockLocations.filter((loc) => {
      if (selectedCategory !== 'all' && loc.category !== selectedCategory) return false;
      return true;
    });
    expect(filtered.length).toBe(3);

    // 切換為 base
    selectedCategory = 'base';
    filtered = mockLocations.filter((loc) => {
      if (selectedCategory !== 'all' && loc.category !== selectedCategory) return false;
      return true;
    });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
    expect(filtered[0].category).toBe('base');
  });
});
