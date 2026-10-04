import type { 
  PersonaTag, 
  TransportDetail, 
  FoodNote, 
  MapLocation 
} from '../../types';

export interface TripImportMeta {
  name: string;
  destination: string;
  subtitle?: string;
  startDate?: string | null; // ISO 'YYYY-MM-DD'
  totalDays?: number;
  coverEmoji?: string;
  currencyPrimary?: string;
}

export interface TripImportTimeBlock {
  id?: string;
  period?: 'morning' | 'afternoon' | 'evening';
  periodLabel?: string;
  startTime?: string;      // 'HH:mm'
  endTime?: string;        // 'HH:mm'
  durationMin?: number;    // 可選：用於自動推算時間長度
  title: string;
  description?: string;
  locationName?: string;
  coordinates?: [number, number]; // [lat, lng]
  altitude?: number;
  tags?: PersonaTag[];
  tips?: string[];
  transport?: TransportDetail;
}

export interface TripImportDay {
  day: number;
  baseId?: string;
  title?: string;
  subtitle?: string;
  highlights?: string[];
  timeBlocks: TripImportTimeBlock[];
  foodNotes?: FoodNote[];
  supermarketTips?: string[];
  weatherAlert?: string;
  packingReminders?: string[];
  customNotes?: string;
}

export interface TripImportAccommodation {
  id?: string;
  baseId?: string;
  baseNameZh?: string;
  hotelName: string;
  roomType?: string;
  checkInDate?: string;
  checkOutDate?: string;
  nights?: number;
  bookingPlatform?: string;
  confirmationCode?: string; // 關鍵欄位：若為空或未設定，在覆蓋模式下會被取代
  totalPrice?: number;
  currency?: string;
  paymentStatus?: 'paid' | 'pay_at_property' | 'deposit_paid';
  address?: string;
  googleMapsUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  checkInTimeNotice?: string;
  keyPickupNotice?: string;
  garbageRulesNotice?: string;
  kitchenRulesNotice?: string;
  notes?: string;
}

export interface TripImportTransport {
  id?: string;
  category?: 'flight' | 'scenic_train' | 'mountain_rail' | 'cable_car' | 'ferry' | 'car_rental';
  categoryLabel?: string;
  title: string;
  routeFrom?: string;
  routeTo?: string;
  departureTime?: string;
  arrivalTime?: string;
  operatorNumber?: string;
  bookingReference?: string; // 關鍵欄位：若為空或未設定，在覆蓋模式下會被取代
  seatsInfo?: string;
  ticketType?: string;
  totalPrice?: number;
  currency?: string;
  platformNotice?: string;
  luggageNotice?: string;
  boardingNotice?: string;
  notes?: string;
}

export interface TripImportChecklistItem {
  category?: string;
  categoryLabel?: string;
  item: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface TripImportBase {
  id: string;
  name: string;
  nameZh?: string;
  days?: number[];
  color?: string;
  hotelName?: string;
  hotelAddress?: string;
  coordinates?: [number, number];
  notes?: string;
}

export interface TripImportV1 {
  version?: '1.0' | string;
  trip: TripImportMeta;
  bases?: TripImportBase[];
  itinerary: TripImportDay[];
  backlog?: TripImportTimeBlock[];
  accommodations?: TripImportAccommodation[];
  transports?: TripImportTransport[];
  checklist?: TripImportChecklistItem[];
  locations?: Partial<MapLocation>[];
}
