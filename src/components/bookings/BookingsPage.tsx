import React, { useState } from 'react';
import { 
  Building2, 
  Plane, 
  Train, 
  Car, 
  Ship, 
  Mountain, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Clock, 
  Key, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { normalizeDateString } from '../../utils/dates';
import type { AccommodationBooking, TransportBooking } from '../../types';
import { useTripStore } from '../../stores/tripStore';
import { useActiveTrip, useBases, useConfig } from '../../stores/selectors';
import { formatMoney } from '../../utils/currency';
import { useConfirm } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Field';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SegmentedControl } from '../ui/SegmentedControl';
import { EmptyState } from '../ui/EmptyState';

export const BookingsPage: React.FC = () => {
  const activeTrip = useActiveTrip();
  const bases = useBases();
  const config = useConfig();
  const { 
    addAccommodation, 
    updateAccommodation, 
    deleteAccommodation,
    addTransport,
    updateTransport,
    deleteTransport,
    addBase,
    deleteBase
  } = useTripStore();
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'accommodations' | 'transports'>('accommodations');
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);

  // 住宿 Modal 狀態
  const [showAccModal, setShowAccModal] = useState(false);
  const [editingAcc, setEditingAcc] = useState<AccommodationBooking | null>(null);
  const [accBaseId, setAccBaseId] = useState('');
  const [isAddingNewBase, setIsAddingNewBase] = useState(false);
  const [newBaseName, setNewBaseName] = useState('');
  const [accHotelName, setAccHotelName] = useState('');
  const [accRoomType, setAccRoomType] = useState('');
  const [accCheckIn, setAccCheckIn] = useState('');
  const [accCheckOut, setAccCheckOut] = useState('');
  const [accPlatform, setAccPlatform] = useState('Booking.com');
  const [accCode, setAccCode] = useState('');
  const [accPrice, setAccPrice] = useState(0);
  const [accCurrency, setAccCurrency] = useState(config.currencies.primary || 'CHF');
  const [accPaymentStatus, setAccPaymentStatus] = useState<'paid' | 'pay_at_property' | 'deposit_paid'>('paid');
  const [accAddress, setAccAddress] = useState('');
  const [accPhone, setAccPhone] = useState('');
  const [accMapsUrl, setAccMapsUrl] = useState('');
  const [accCheckInNotice, setAccCheckInNotice] = useState('入住 15:00 後 / 退房 10:00 前');
  const [accKeyNotice, setAccKeyNotice] = useState('密碼鑰匙盒或前台辦理');
  const [accGarbageNotice, setAccGarbageNotice] = useState('');
  const [accKitchenNotice, setAccKitchenNotice] = useState('');
  const [accNotes, setAccNotes] = useState('');

  // 交通 Modal 狀態
  const [showTransModal, setShowTransModal] = useState(false);
  const [editingTrans, setEditingTrans] = useState<TransportBooking | null>(null);
  const [transCategory, setTransCategory] = useState<TransportBooking['category']>('scenic_train');
  const [transTitle, setTransTitle] = useState('');
  const [transFrom, setTransFrom] = useState('');
  const [transTo, setTransTo] = useState('');
  const [transDepTime, setTransDepTime] = useState('');
  const [transArrTime, setTransArrTime] = useState('');
  const [transNumber, setTransNumber] = useState('');
  const [transRef, setTransRef] = useState('');
  const [transSeats, setTransSeats] = useState('');
  const [transTicketType, setTransTicketType] = useState('標準車票 / 通票');
  const [transPrice, setTransPrice] = useState(0);
  const [transCurrency, setTransCurrency] = useState(config.currencies.primary || 'CHF');
  const [transPlatformNotice, setTransPlatformNotice] = useState('');
  const [transLuggageNotice, setTransLuggageNotice] = useState('');
  const [transBoardingNotice, setTransBoardingNotice] = useState('');
  const [transNotes, setTransNotes] = useState('');

  const accommodations = activeTrip.accommodations || [];
  const transports = activeTrip.transports || [];

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 開啟住宿新增/編輯
  const handleOpenAcc = (item?: AccommodationBooking) => {
    if (item) {
      setEditingAcc(item);
      setAccBaseId(item.baseId);
      setAccHotelName(item.hotelName);
      setAccRoomType(item.roomType);
      setAccCheckIn(normalizeDateString(item.checkInDate));
      setAccCheckOut(normalizeDateString(item.checkOutDate));
      setAccPlatform(item.bookingPlatform);
      setAccCode(item.confirmationCode);
      setAccPrice(item.totalPrice);
      setAccCurrency(item.currency || config.currencies.primary || 'CHF');
      setAccPaymentStatus(item.paymentStatus || 'paid');
      setAccAddress(item.address);
      setAccPhone(item.contactPhone || '');
      setAccMapsUrl(item.googleMapsUrl || '');
      setAccCheckInNotice(item.checkInTimeNotice || '入住 15:00 後 / 退房 10:00 前');
      setAccKeyNotice(item.keyPickupNotice || '密碼鑰匙盒或前台辦理');
      setAccGarbageNotice(item.garbageRulesNotice || '');
      setAccKitchenNotice(item.kitchenRulesNotice || '');
      setAccNotes(item.notes || '');
    } else {
      setEditingAcc(null);
      setAccBaseId(bases[0]?.id || 'base-1');
      setAccHotelName('');
      setAccRoomType('標準雙人房 / 家庭公寓');
      setAccCheckIn(normalizeDateString(config.startDate || ''));
      setAccCheckOut('');
      setAccPlatform('Booking.com');
      setAccCode('');
      setAccPrice(0);
      setAccCurrency(config.currencies.primary || 'CHF');
      setAccPaymentStatus('paid');
      setAccAddress('');
      setAccPhone('');
      setAccMapsUrl('');
      setAccCheckInNotice('入住 15:00 後 / 退房 10:00 前');
      setAccKeyNotice('前台辦理或門口密碼盒');
      setAccGarbageNotice('');
      setAccKitchenNotice('');
      setAccNotes('');
    }
    setIsAddingNewBase(false);
    setNewBaseName('');
    setShowAccModal(true);
  };

  // 住宿地區自由新增
  const handleCreateNewBase = () => {
    if (!newBaseName.trim()) return;
    const newId = addBase(newBaseName.trim());
    setAccBaseId(newId);
    setNewBaseName('');
    setIsAddingNewBase(false);
  };

  // 住宿地區自由刪除
  const handleDeleteCurrentBase = async () => {
    if (bases.length <= 1) {
      alert('旅程至少需要保留一個住宿地區。');
      return;
    }
    const currentBase = bases.find((b) => b.id === accBaseId);
    const baseName = currentBase?.nameZh || currentBase?.name || '此地區';

    const usedCount = accommodations.filter((a) => a.baseId === accBaseId).length;
    const msg = usedCount > 0
      ? `目前有 ${usedCount} 筆住宿記錄屬於「${baseName}」，刪除此地區後，這些住宿的地區關聯將被移轉至其他地區。確定要刪除嗎？`
      : `確定要刪除住宿地區「${baseName}」嗎？`;

    const ok = await confirm({
      title: `刪除住宿地區「${baseName}」？`,
      message: msg,
      danger: true,
      confirmLabel: '確認刪除',
    });

    if (ok) {
      deleteBase(accBaseId);
      const remaining = bases.filter((b) => b.id !== accBaseId);
      if (remaining.length > 0) {
        setAccBaseId(remaining[0].id);
      }
    }
  };

  // 儲存住宿
  const handleSaveAcc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accHotelName.trim()) return;

    const cleanIn = normalizeDateString(accCheckIn);
    const cleanOut = normalizeDateString(accCheckOut);
    let nights = 1;
    if (cleanIn && cleanOut) {
      try {
        const diff = differenceInDays(parseISO(cleanOut), parseISO(cleanIn));
        nights = Math.max(1, diff);
      } catch {
        nights = 1;
      }
    }

    const baseObj = bases.find((b) => b.id === accBaseId);
    const baseNameZh = baseObj ? baseObj.nameZh : '自選基地';

    const paymentLabel =
      accPaymentStatus === 'paid'
        ? '已線上全額付清'
        : accPaymentStatus === 'pay_at_property'
        ? '抵達入住現場支付'
        : '已付部分訂金';

    const accData: Omit<AccommodationBooking, 'id'> = {
      baseId: accBaseId,
      baseNameZh,
      hotelName: accHotelName.trim(),
      roomType: accRoomType.trim(),
      checkInDate: cleanIn,
      checkOutDate: cleanOut,
      nights,
      bookingPlatform: accPlatform.trim(),
      confirmationCode: accCode.trim(),
      totalPrice: Number(accPrice) || 0,
      currency: accCurrency,
      paymentStatus: accPaymentStatus,
      paymentStatusLabel: paymentLabel,
      address: accAddress.trim(),
      contactPhone: accPhone.trim() || undefined,
      googleMapsUrl: accMapsUrl.trim() || undefined,
      checkInTimeNotice: accCheckInNotice.trim(),
      keyPickupNotice: accKeyNotice.trim(),
      garbageRulesNotice: accGarbageNotice.trim(),
      kitchenRulesNotice: accKitchenNotice.trim(),
      notes: accNotes.trim() || undefined,
    };

    if (editingAcc) {
      updateAccommodation(editingAcc.id, accData);
    } else {
      addAccommodation(accData);
    }
    setShowAccModal(false);
  };

  const handleCloseAcc = () => {
    if (accHotelName.trim() || accAddress.trim() || accCode.trim()) {
      if (window.confirm('您有正在填寫的住宿資訊尚未儲存，確定要放棄嗎？')) {
        setShowAccModal(false);
      }
    } else {
      setShowAccModal(false);
    }
  };

  const handleCloseTrans = () => {
    if (transTitle.trim() || transFrom.trim() || transTo.trim() || transRef.trim()) {
      if (window.confirm('您有正在填寫的交通資訊尚未儲存，確定要放棄嗎？')) {
        setShowTransModal(false);
      }
    } else {
      setShowTransModal(false);
    }
  };

  const handleDeleteAcc = async (id: string, name: string) => {
    const ok = await confirm({
      title: `確定要刪除「${name}」的住宿預訂紀錄嗎？`,
      danger: true,
      confirmLabel: '刪除住宿預訂',
    });
    if (ok) {
      deleteAccommodation(id);
    }
  };

  // 開啟交通新增/編輯
  const handleOpenTrans = (item?: TransportBooking) => {
    if (item) {
      setEditingTrans(item);
      setTransCategory(item.category);
      setTransTitle(item.title);
      setTransFrom(item.routeFrom);
      setTransTo(item.routeTo);
      setTransDepTime(item.departureTime);
      setTransArrTime(item.arrivalTime || '');
      setTransNumber(item.operatorNumber);
      setTransRef(item.bookingReference);
      setTransSeats(item.seatsInfo || '');
      setTransTicketType(item.ticketType);
      setTransPrice(item.totalPrice || 0);
      setTransCurrency(item.currency || config.currencies.primary || 'CHF');
      setTransPlatformNotice(item.platformNotice || '');
      setTransLuggageNotice(item.luggageNotice || '');
      setTransBoardingNotice(item.boardingNotice || '');
      setTransNotes(item.notes || '');
    } else {
      setEditingTrans(null);
      setTransCategory('scenic_train');
      setTransTitle('');
      setTransFrom('');
      setTransTo('');
      setTransDepTime('');
      setTransArrTime('');
      setTransNumber('');
      setTransRef('');
      setTransSeats('');
      setTransTicketType('電子票券 / 通票涵蓋');
      setTransPrice(0);
      setTransCurrency(config.currencies.primary || 'CHF');
      setTransPlatformNotice('');
      setTransLuggageNotice('');
      setTransBoardingNotice('');
      setTransNotes('');
    }
    setShowTransModal(true);
  };

  // 儲存交通
  const handleSaveTrans = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transTitle.trim()) return;

    const catLabels: Record<TransportBooking['category'], string> = {
      flight: '國際 / 國內航班',
      scenic_train: '景觀全景列車',
      mountain_rail: '高山齒軌登山火車',
      cable_car: '全景空中纜車',
      ferry: '湖泊遊船 / 渡輪',
      car_rental: '自駕租車 / 包車',
    };

    const transData: Omit<TransportBooking, 'id'> = {
      category: transCategory,
      categoryLabel: catLabels[transCategory] || '交通安排',
      title: transTitle.trim(),
      routeFrom: transFrom.trim(),
      routeTo: transTo.trim(),
      departureTime: transDepTime.trim(),
      arrivalTime: transArrTime.trim() || undefined,
      operatorNumber: transNumber.trim(),
      bookingReference: transRef.trim(),
      seatsInfo: transSeats.trim() || undefined,
      ticketType: transTicketType.trim(),
      totalPrice: Number(transPrice) || 0,
      currency: transCurrency,
      platformNotice: transPlatformNotice.trim() || undefined,
      luggageNotice: transLuggageNotice.trim() || undefined,
      boardingNotice: transBoardingNotice.trim() || undefined,
      notes: transNotes.trim() || undefined,
    };

    if (editingTrans) {
      updateTransport(editingTrans.id, transData);
    } else {
      addTransport(transData);
    }
    setShowTransModal(false);
  };

  const handleDeleteTrans = async (id: string, title: string) => {
    const ok = await confirm({
      title: `確定要刪除「${title}」的交通紀錄嗎？`,
      danger: true,
      confirmLabel: '刪除交通紀錄',
    });
    if (ok) {
      deleteTransport(id);
    }
  };

  const getTransportCategoryIcon = (category: TransportBooking['category']) => {
    switch (category) {
      case 'flight':
        return <Plane className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'scenic_train':
      case 'mountain_rail':
        return <Mountain className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'ferry':
        return <Ship className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'car_rental':
        return <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'cable_car':
        return <Mountain className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <Train className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
      {/* 頁首 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🏨</span>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              住宿與車票須知管理
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            匯整全旅程飯店、公寓密碼鎖、行李放置與機票車票預約確認號
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <SegmentedControl<'accommodations' | 'transports'>
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            options={[
              { value: 'accommodations', label: `住宿預訂 (${accommodations.length})`, icon: <Building2 className="w-4 h-4" /> },
              { value: 'transports', label: `交通車票 (${transports.length})`, icon: <Plane className="w-4 h-4" /> },
            ]}
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => (activeTab === 'accommodations' ? handleOpenAcc() : handleOpenTrans())}
            icon={<Plus className="w-4 h-4" />}
          >
            {activeTab === 'accommodations' ? '新增住宿' : '新增交通'}
          </Button>
        </div>
      </div>

      {/* 住宿預訂清單 */}
      {activeTab === 'accommodations' && (
        <div className="space-y-4">
          {accommodations.map((acc) => {
            const isExpanded = expandedCardIds.includes(acc.id);
            return (
              <Card key={acc.id} className="transition-all hover:border-stone-300 dark:hover:border-stone-700">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* 左側重點資訊 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        {acc.baseNameZh}
                      </span>
                      <span className="text-xs text-stone-500 font-mono">
                        {acc.bookingPlatform} • 代號: {acc.confirmationCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {acc.paymentStatusLabel}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                      {acc.hotelName}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-medium">
                      {acc.roomType}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400 flex-wrap pt-1 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>入住: {normalizeDateString(acc.checkInDate)} ➔ 退房: {normalizeDateString(acc.checkOutDate)} ({acc.nights} 晚)</span>
                      </span>

                      {acc.totalPrice > 0 && (
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          總計: {formatMoney(acc.totalPrice, acc.currency)}
                        </span>
                      )}
                    </div>

                    {acc.address && (
                      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{acc.address}</span>
                        {acc.googleMapsUrl && (
                          <a
                            href={acc.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-600 hover:underline inline-flex items-center gap-0.5 shrink-0"
                          >
                            <span>地圖導航</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 右側操作按鈕 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenAcc(acc)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      編輯
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAcc(acc.id, acc.hotelName)}
                      icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpandCard(acc.id)}
                      icon={isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    >
                      {isExpanded ? '收起須知' : '入住須知'}
                    </Button>
                  </div>
                </div>

                {/* 展開入住須知 */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {acc.checkInTimeNotice && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-1">
                        <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>入住 / 退房時間</span>
                        </span>
                        <p className="text-stone-600 dark:text-stone-400">{acc.checkInTimeNotice}</p>
                      </div>
                    )}

                    {acc.keyPickupNotice && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-1">
                        <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          <span>鑰匙領取 / 門禁密碼</span>
                        </span>
                        <p className="text-stone-600 dark:text-stone-400 font-mono">{acc.keyPickupNotice}</p>
                      </div>
                    )}

                    {acc.garbageRulesNotice && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-1">
                        <span className="font-bold text-stone-800 dark:text-stone-200">垃圾分類與丟棄須知</span>
                        <p className="text-stone-600 dark:text-stone-400">{acc.garbageRulesNotice}</p>
                      </div>
                    )}

                    {acc.kitchenRulesNotice && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-1">
                        <span className="font-bold text-stone-800 dark:text-stone-200">廚房與退房復原須知</span>
                        <p className="text-stone-600 dark:text-stone-400">{acc.kitchenRulesNotice}</p>
                      </div>
                    )}

                    {acc.notes && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-1 sm:col-span-2">
                        <span className="font-bold text-stone-800 dark:text-stone-200">其他備忘筆記</span>
                        <p className="text-stone-600 dark:text-stone-400">{acc.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {accommodations.length === 0 && (
            <EmptyState
              icon={<Building2 className="w-6 h-6" />}
              title="尚未建立任何住宿預訂資料"
              description="點擊右上角「新增住宿」即可記錄各大飯店、公寓門鎖密碼與入住規範。"
              action={
                <Button variant="primary" size="sm" onClick={() => handleOpenAcc()}>
                  新增第一筆住宿
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* 交通預訂清單 */}
      {activeTab === 'transports' && (
        <div className="space-y-4">
          {transports.map((trans) => {
            const isExpanded = expandedCardIds.includes(trans.id);
            return (
              <Card key={trans.id} className="transition-all hover:border-stone-300 dark:hover:border-stone-700">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1 rounded-lg bg-stone-100 dark:bg-stone-800">
                        {getTransportCategoryIcon(trans.category)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {trans.categoryLabel}
                      </span>
                      {trans.operatorNumber && (
                        <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                          {trans.operatorNumber}
                        </span>
                      )}
                      {trans.bookingReference && (
                        <span className="text-xs text-stone-500 font-mono">
                          代碼: {trans.bookingReference}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                      {trans.title}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 font-medium">
                      <span>{trans.routeFrom}</span>
                      <span className="text-stone-400">➔</span>
                      <span>{trans.routeTo}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400 flex-wrap font-mono pt-1">
                      {trans.departureTime && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>出發: {trans.departureTime}</span>
                          {trans.arrivalTime && <span>~ {trans.arrivalTime}</span>}
                        </span>
                      )}

                      {trans.seatsInfo && (
                        <span>座位: {trans.seatsInfo}</span>
                      )}

                      {trans.totalPrice && trans.totalPrice > 0 && (
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          金額: {formatMoney(trans.totalPrice, trans.currency || 'CHF')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 右側操作按鈕 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenTrans(trans)}
                      icon={<Edit2 className="w-3.5 h-3.5" />}
                    >
                      編輯
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTrans(trans.id, trans.title)}
                      icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpandCard(trans.id)}
                      icon={isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    >
                      {isExpanded ? '收起須知' : '乘車須知'}
                    </Button>
                  </div>
                </div>

                {/* 乘車搭乘須知 */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {trans.platformNotice && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-1">
                        <span className="font-bold text-stone-800 dark:text-stone-200">月台與候車須知</span>
                        <p className="text-stone-600 dark:text-stone-400">{trans.platformNotice}</p>
                      </div>
                    )}

                    {trans.luggageNotice && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-1">
                        <span className="font-bold text-stone-800 dark:text-stone-200">行李放置規定</span>
                        <p className="text-stone-600 dark:text-stone-400">{trans.luggageNotice}</p>
                      </div>
                    )}

                    {trans.boardingNotice && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-1 sm:col-span-2">
                        <span className="font-bold text-stone-800 dark:text-stone-200">憑證檢票與登車注意</span>
                        <p className="text-stone-600 dark:text-stone-400">{trans.boardingNotice}</p>
                      </div>
                    )}

                    {trans.notes && (
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-1 sm:col-span-2">
                        <span className="font-bold text-stone-800 dark:text-stone-200">其他備註</span>
                        <p className="text-stone-600 dark:text-stone-400">{trans.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {transports.length === 0 && (
            <EmptyState
              icon={<Plane className="w-6 h-6" />}
              title="尚未記錄任何交通或車票訂單"
              description="點擊右上角「新增交通」記錄跨國航班、觀光火車劃位或租車憑證資訊。"
              action={
                <Button variant="primary" size="sm" onClick={() => handleOpenTrans()}>
                  新增第一筆交通車票
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* 住宿 Modal */}
      {showAccModal && (
        <Modal
          isOpen={showAccModal}
          onClose={handleCloseAcc}
          title={editingAcc ? '編輯住宿預訂' : '新增住宿預訂'}
          maxWidth="xl"
        >
          <form onSubmit={handleSaveAcc} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    住宿地區
                  </label>
                  {!isAddingNewBase ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewBase(true)}
                      className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增地區</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewBase(false);
                        setNewBaseName('');
                      }}
                      className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                    >
                      取消新增
                    </button>
                  )}
                </div>

                {!isAddingNewBase ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <Select
                        value={accBaseId}
                        onChange={(e) => setAccBaseId(e.target.value)}
                      >
                        {bases.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.nameZh} {b.name && b.name !== b.nameZh ? `(${b.name})` : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {bases.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteCurrentBase}
                        icon={<Trash2 className="w-4 h-4 text-stone-400 hover:text-rose-500" />}
                        title="刪除目前選中的住宿地區"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="輸入新住宿地區 (例如: 札幌、小樽、箱根)"
                      value={newBaseName}
                      onChange={(e) => setNewBaseName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateNewBase();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleCreateNewBase}
                    >
                      確定
                    </Button>
                  </div>
                )}
              </div>

              <Input
                label="預約平台"
                placeholder="例如: Booking.com, Airbnb, 官網"
                value={accPlatform}
                onChange={(e) => setAccPlatform(e.target.value)}
              />
            </div>

            <Input
              label="飯店 / 公寓名稱"
              required
              placeholder="例如: Luzern Lakeside Family Apartment"
              value={accHotelName}
              onChange={(e) => setAccHotelName(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="房型規格"
                placeholder="例如: 兩臥室公寓 (可住 4-6 人)"
                value={accRoomType}
                onChange={(e) => setAccRoomType(e.target.value)}
              />
              <Input
                label="訂單編號 / 預訂代碼"
                placeholder="例如: BKG-98471203"
                value={accCode}
                onChange={(e) => setAccCode(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="date"
                label="入住日期"
                value={normalizeDateString(accCheckIn)}
                onChange={(e) => setAccCheckIn(e.target.value)}
                required
              />
              <Input
                type="date"
                label="退房日期"
                value={normalizeDateString(accCheckOut)}
                onChange={(e) => setAccCheckOut(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                type="number"
                label="預訂總金額"
                value={accPrice || ''}
                onChange={(e) => setAccPrice(parseFloat(e.target.value) || 0)}
              />
              <Select
                label="計價幣別"
                value={accCurrency}
                onChange={(e) => setAccCurrency(e.target.value)}
              >
                <option value="CHF">CHF (瑞士法郎)</option>
                <option value="TWD">TWD (新台幣)</option>
                <option value="EUR">EUR (歐元)</option>
                <option value="JPY">JPY (日圓)</option>
                <option value="USD">USD (美元)</option>
              </Select>
              <Select
                label="付款狀態"
                value={accPaymentStatus}
                onChange={(e) => setAccPaymentStatus(e.target.value as any)}
              >
                <option value="paid">已線上付清</option>
                <option value="pay_at_property">現場付費</option>
                <option value="deposit_paid">已付部分訂金</option>
              </Select>
            </div>

            <Input
              label="飯店地址"
              placeholder="例如: Alpenstrasse 12, 6004 Luzern"
              value={accAddress}
              onChange={(e) => setAccAddress(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="聯絡電話"
                placeholder="+41 41 123 4567"
                value={accPhone}
                onChange={(e) => setAccPhone(e.target.value)}
              />
              <Input
                label="Google 地圖連結"
                placeholder="https://maps.google.com/?q=..."
                value={accMapsUrl}
                onChange={(e) => setAccMapsUrl(e.target.value)}
              />
            </div>

            {/* 入住重要須知 */}
            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-stone-800 space-y-3">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                入住指南與房屋規定 (選填)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="入住 / 退房時間標註"
                  value={accCheckInNotice}
                  onChange={(e) => setAccCheckInNotice(e.target.value)}
                />
                <Input
                  label="鑰匙盒密碼 / 取鑰方式"
                  value={accKeyNotice}
                  onChange={(e) => setAccKeyNotice(e.target.value)}
                />
              </div>
              <Input
                label="垃圾分類規定"
                placeholder="例如: 須使用專用收費垃圾袋，生鮮廚餘分開丟棄"
                value={accGarbageNotice}
                onChange={(e) => setAccGarbageNotice(e.target.value)}
              />
              <Input
                label="廚房與退房規定"
                placeholder="例如: 退房前清空冰箱，碗盤放入洗碗機並啟動"
                value={accKitchenNotice}
                onChange={(e) => setAccKitchenNotice(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <Button type="button" variant="ghost" onClick={handleCloseAcc}>
                取消
              </Button>
              <Button type="submit" variant="primary">
                儲存住宿紀錄
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 交通 Modal */}
      {showTransModal && (
        <Modal
          isOpen={showTransModal}
          onClose={handleCloseTrans}
          title={editingTrans ? '編輯交通訂單' : '新增交通訂單'}
          maxWidth="xl"
        >
          <form onSubmit={handleSaveTrans} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="交通類別"
                value={transCategory}
                onChange={(e) => setTransCategory(e.target.value as any)}
              >
                <option value="flight">航班 (Flight)</option>
                <option value="train">火車 (Train)</option>
                <option value="scenic_train">景觀列車 (Scenic Train)</option>
                <option value="mountain_rail">高山火車 (Mountain Rail)</option>
                <option value="cable_car">高空纜車 (Cable Car)</option>
                <option value="ferry">遊船渡輪 (Ferry)</option>
                <option value="car_rental">租車自駕 (Car Rental)</option>
              </Select>

              <Input
                label="班次 / 車次編號"
                placeholder="例如: BR087, Glacier Express 902"
                value={transNumber}
                onChange={(e) => setTransNumber(e.target.value)}
              />
            </div>

            <Input
              label="交通項目標題"
              required
              placeholder="例如: 台北 ➔ 蘇黎世 直飛航班、冰河列車景觀席"
              value={transTitle}
              onChange={(e) => setTransTitle(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="出發地點 / 車站"
                placeholder="例如: 蘇黎世火車站 (Zürich HB)"
                value={transFrom}
                onChange={(e) => setTransFrom(e.target.value)}
              />
              <Input
                label="抵達地點 / 車站"
                placeholder="例如: 盧塞恩 (Luzern)"
                value={transTo}
                onChange={(e) => setTransTo(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="出發時間 (日期與時間)"
                placeholder="例如: 2027-06-15 08:30"
                value={transDepTime}
                onChange={(e) => setTransDepTime(e.target.value)}
              />
              <Input
                label="預計抵達時間 (選填)"
                placeholder="例如: 2027-06-15 09:45"
                value={transArrTime}
                onChange={(e) => setTransArrTime(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="訂位代碼 / PNR / 電子票號"
                placeholder="例如: K7X9WZ"
                value={transRef}
                onChange={(e) => setTransRef(e.target.value)}
              />
              <Input
                label="車廂與座位資訊"
                placeholder="例如: 4 車廂 / 座位 11-14"
                value={transSeats}
                onChange={(e) => setTransSeats(e.target.value)}
              />
              <Input
                label="票券類型"
                placeholder="例如: STP 免費 + 劃位"
                value={transTicketType}
                onChange={(e) => setTransTicketType(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="number"
                label="總票價金額"
                value={transPrice || ''}
                onChange={(e) => setTransPrice(parseFloat(e.target.value) || 0)}
              />
              <Select
                label="計價幣別"
                value={transCurrency}
                onChange={(e) => setTransCurrency(e.target.value)}
              >
                <option value="CHF">CHF (瑞士法郎)</option>
                <option value="TWD">TWD (新台幣)</option>
                <option value="EUR">EUR (歐元)</option>
                <option value="JPY">JPY (日圓)</option>
                <option value="USD">USD (美元)</option>
              </Select>
            </div>

            <div className="p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-stone-200/60 dark:border-stone-800 space-y-3">
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                搭乘乘車須知 (選填)
              </span>
              <Input
                label="月台與候車提醒"
                placeholder="例如: 月台 4 候車，需提早 15 分鐘抵達"
                value={transPlatformNotice}
                onChange={(e) => setTransPlatformNotice(e.target.value)}
              />
              <Input
                label="大件行李規定"
                placeholder="例如: 行李置於車廂玄關專屬大型行李架"
                value={transLuggageNotice}
                onChange={(e) => setTransLuggageNotice(e.target.value)}
              />
              <Input
                label="檢票與登車規定"
                placeholder="例如: 須出示護照正本與通票 QR Code"
                value={transBoardingNotice}
                onChange={(e) => setTransBoardingNotice(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <Button type="button" variant="ghost" onClick={handleCloseTrans}>
                取消
              </Button>
              <Button type="submit" variant="primary">
                儲存交通紀錄
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
