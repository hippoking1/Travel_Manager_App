import type { TripPlan } from '../../types';
import type { TripImportV1 } from './schema';

/**
 * 將 App 內現有的 TripPlan 匯出為乾淨、適合 AI 閱讀與再次編修的 TripImportV1 物件
 */
export function exportTripToAiJson(plan: TripPlan): TripImportV1 {
  return {
    version: '1.0',
    trip: {
      name: plan.name,
      destination: plan.destination,
      subtitle: plan.config.subtitle,
      startDate: plan.config.startDate,
      totalDays: plan.config.totalDays,
      coverEmoji: plan.coverEmoji,
      currencyPrimary: plan.config.currencies?.primary,
    },
    bases: plan.config.bases.map((b) => ({
      id: b.id,
      name: b.name,
      nameZh: b.nameZh,
      days: b.days,
      color: b.color,
      hotelName: b.hotelName,
      hotelAddress: b.hotelAddress,
      coordinates: b.coordinates,
      notes: b.notes,
    })),
    itinerary: plan.itinerary.map((day) => ({
      day: day.day,
      baseId: day.baseId,
      title: day.title,
      subtitle: day.subtitle,
      highlights: day.highlights,
      timeBlocks: day.timeBlocks.map((block) => ({
        period: block.period,
        startTime: block.startTime,
        endTime: block.endTime,
        title: block.title,
        description: block.description,
        locationName: block.locationName,
        coordinates: block.coordinates,
        altitude: block.altitude,
        tags: block.tags,
        tips: block.tips,
        transport: block.transport,
      })),
      foodNotes: day.foodNotes,
      supermarketTips: day.supermarketTips,
      weatherAlert: day.weatherAlert,
      packingReminders: day.packingReminders,
      customNotes: day.customNotes,
    })),
    backlog: (plan.backlog || []).map((b) => ({
      title: b.title,
      description: b.description,
      locationName: b.locationName,
      tags: b.tags,
      tips: b.tips,
    })),
    accommodations: (plan.accommodations || []).map((acc) => ({
      baseId: acc.baseId,
      baseNameZh: acc.baseNameZh,
      hotelName: acc.hotelName,
      roomType: acc.roomType,
      checkInDate: acc.checkInDate,
      checkOutDate: acc.checkOutDate,
      nights: acc.nights,
      bookingPlatform: acc.bookingPlatform,
      confirmationCode: acc.confirmationCode,
      totalPrice: acc.totalPrice,
      currency: acc.currency,
      paymentStatus: acc.paymentStatus,
      address: acc.address,
      googleMapsUrl: acc.googleMapsUrl,
      notes: acc.notes,
    })),
    transports: (plan.transports || []).map((t) => ({
      category: t.category,
      categoryLabel: t.categoryLabel,
      title: t.title,
      routeFrom: t.routeFrom,
      routeTo: t.routeTo,
      departureTime: t.departureTime,
      arrivalTime: t.arrivalTime,
      operatorNumber: t.operatorNumber,
      bookingReference: t.bookingReference,
      seatsInfo: t.seatsInfo,
      ticketType: t.ticketType,
      totalPrice: t.totalPrice,
      currency: t.currency,
      notes: t.notes,
    })),
    checklist: (plan.checklist || []).map((c) => ({
      category: c.category,
      categoryLabel: c.categoryLabel,
      item: c.item,
      priority: c.priority,
    })),
  };
}

/**
 * 匯出為格式化好帶有縮排的 JSON 字串
 */
export function exportTripToJsonString(plan: TripPlan): string {
  const exportData = exportTripToAiJson(plan);
  return JSON.stringify(exportData, null, 2);
}
