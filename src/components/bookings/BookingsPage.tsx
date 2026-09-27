import React, { useState } from 'react';
import { 
  Building2, 
  Train, 
  Key, 
  Trash2, 
  Plus, 
  Edit3, 
  MapPin, 
  Calendar, 
  AlertCircle, 
  ShieldCheck,
  X
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import type { AccommodationBooking, TransportBooking } from '../../types';

export const BookingsPage: React.FC = () => {
  const { 
    accommodations, 
    transports, 
    addAccommodation, 
    updateAccommodation, 
    deleteAccommodation,
    addTransport,
    updateTransport,
    deleteTransport
  } = useTripStore();

  const [activeTab, setActiveTab] = useState<'accommodations' | 'transports'>('accommodations');

  // Modal 狀態
  const [showAccModal, setShowAccModal] = useState(false);
  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  const [accForm, setAccForm] = useState<Partial<AccommodationBooking>>({
    baseId: 'luzern',
    baseNameZh: '盧塞恩 (琉森)',
    hotelName: '',
    roomType: '',
    checkInDate: '2027-06-15',
    checkOutDate: '2027-06-19',
    nights: 4,
    bookingPlatform: 'Booking.com',
    confirmationCode: '',
    totalPrice: 1200,
    currency: 'CHF',
    paymentStatus: 'paid',
    paymentStatusLabel: '已線上付清',
    address: '',
    checkInTimeNotice: '入住 15:00 起 ｜ 退房 10:00 前',
    keyPickupNotice: '門口密碼盒 (Keybox)，密碼請洽房東',
    garbageRulesNotice: '請使用當地專用垃圾袋，垃圾與玻璃瓶分開回收',
    kitchenRulesNotice: '退房前請清空冰箱並開啟洗碗機',
    notes: '',
  });

  const [showTransModal, setShowTransModal] = useState(false);
  const [editingTransId, setEditingTransId] = useState<string | null>(null);
  const [transForm, setTransForm] = useState<Partial<TransportBooking>>({
    category: 'scenic_train',
    categoryLabel: '景觀列車',
    title: '',
    routeFrom: '',
    routeTo: '',
    departureTime: '2027-06-15 09:00',
    operatorNumber: '',
    bookingReference: '',
    seatsInfo: '',
    ticketType: 'STP 憑證免費涵蓋',
    platformNotice: '請提前 10-15 分鐘抵達月台候車',
    luggageNotice: '大件行李置於車廂玄關專屬大行李架',
    boardingNotice: '驗票時出示護照正本 + STP QR Code',
    notes: '',
  });

  // 打開新增/編輯住宿
  const handleOpenAccModal = (acc?: AccommodationBooking) => {
    if (acc) {
      setEditingAccId(acc.id);
      setAccForm(acc);
    } else {
      setEditingAccId(null);
      setAccForm({
        baseId: 'luzern',
        baseNameZh: '盧塞恩 (琉森)',
        hotelName: '',
        roomType: '大坪數景觀家庭房 (7人入住)',
        checkInDate: '2027-06-15',
        checkOutDate: '2027-06-19',
        nights: 4,
        bookingPlatform: 'Booking.com',
        confirmationCode: '',
        totalPrice: 1200,
        currency: 'CHF',
        paymentStatus: 'paid',
        paymentStatusLabel: '已付清',
        address: '',
        checkInTimeNotice: '入住 15:00 起 ｜ 退房 10:00 前',
        keyPickupNotice: '大門密碼盒 (Keybox)，密碼請洽詢屋主',
        garbageRulesNotice: '請遵照瑞士市府專用收費垃圾袋規定，生鮮廚餘請分開',
        kitchenRulesNotice: '碗盤置入洗碗機運轉，退房前清空冰箱',
        notes: '',
      });
    }
    setShowAccModal(true);
  };

  const handleSaveAcc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accForm.hotelName) return;

    if (editingAccId) {
      updateAccommodation(editingAccId, accForm);
    } else {
      addAccommodation(accForm as AccommodationBooking);
    }
    setShowAccModal(false);
  };

  // 打開新增/編輯交通
  const handleOpenTransModal = (trans?: TransportBooking) => {
    if (trans) {
      setEditingTransId(trans.id);
      setTransForm(trans);
    } else {
      setEditingTransId(null);
      setTransForm({
        category: 'scenic_train',
        categoryLabel: '景觀列車',
        title: '',
        routeFrom: '',
        routeTo: '',
        departureTime: '2027-06-15 09:00',
        operatorNumber: '',
        bookingReference: '',
        seatsInfo: '',
        ticketType: 'STP 免費涵蓋',
        platformNotice: '提前 10-15 分鐘抵達月台',
        luggageNotice: '大件行李置於車廂玄關專屬大行李架',
        boardingNotice: '出示護照正本 + STP QR Code',
        notes: '',
      });
    }
    setShowTransModal(true);
  };

  const handleSaveTrans = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transForm.title) return;

    if (editingTransId) {
      updateTransport(editingTransId, transForm);
    } else {
      addTransport(transForm as TransportBooking);
    }
    setShowTransModal(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 標題與簡介 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-400" />
            <span>住宿與交通安排規劃 (訂單管理與入住須知)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            完整管理 4 大特色基地木屋訂單、垃圾分類/鑰匙須知，以及機票、冰河列車與瑞士通票劃位憑證。
          </p>
        </div>

        {/* 頁籤切換：住宿 vs 交通 */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('accommodations')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'accommodations'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏨 住宿預訂 ({accommodations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('transports')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'transports'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Train className="w-4 h-4" />
            <span>🚆 交通與機票 ({transports.length})</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: 住宿預訂與入住須知 (Accommodations) */}
      {/* ============================================================ */}
      {activeTab === 'accommodations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              瑞士 4 大基地住宿清單 (已排定全套家庭公寓與木屋)
            </span>
            <button
              onClick={() => handleOpenAccModal()}
              className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>新增住宿安排</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {accommodations.map((acc) => (
              <div
                key={acc.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 hover:border-slate-700 transition-all"
              >
                {/* 頂部：基地 + 飯店名稱 + 金額 + 操作 */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        {acc.baseNameZh}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {acc.bookingPlatform} ｜ 訂單編號：{acc.confirmationCode}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {acc.hotelName}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1">
                      {acc.roomType}
                    </p>
                  </div>

                  {/* 房費與付款狀態 + 動作按鈕 */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                        {acc.currency} {acc.totalPrice.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        共 {acc.nights} 晚 ｜ {acc.paymentStatusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenAccModal(acc)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="編輯住宿"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteAccommodation(acc.id)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                        title="刪除住宿"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 住宿日期與地址聯絡 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <span className="text-slate-500 block">入住至退房</span>
                      <span className="font-semibold text-white font-mono">{acc.checkInDate} ➔ {acc.checkOutDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-300 sm:col-span-2">
                    <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="truncate flex-1">
                      <span className="text-slate-500 block">地址與聯絡</span>
                      <span className="text-slate-200">{acc.address}</span>
                      {acc.contactPhone && (
                        <span className="ml-2 text-sky-400 font-mono">({acc.contactPhone})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 核心需求：4 大重要入住與使用須知卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* 1. 鑰匙領取與時間須知 */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-amber-400" />
                      <span>鑰匙領取與入住手續</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-mono">
                      {acc.keyPickupNotice}
                    </p>
                    <div className="text-[11px] text-slate-500">
                      ⏰ {acc.checkInTimeNotice}
                    </div>
                  </div>

                  {/* 2. 垃圾分類專用袋須知 */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
                    <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-emerald-400" />
                      <span>瑞士嚴格垃圾分類規定</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {acc.garbageRulesNotice}
                    </p>
                  </div>

                  {/* 3. 廚房自煮與退房清潔 */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
                    <div className="font-bold text-purple-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span>廚房自煮與退房清潔規範</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {acc.kitchenRulesNotice}
                    </p>
                  </div>

                  {/* 4. 其他專屬須知備忘 */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
                    <div className="font-bold text-sky-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-sky-400" />
                      <span>房屋特色與周邊備忘</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {acc.notes || '無額外備註'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: 交通安排與乘車須知 (Transportation) */}
      {/* ============================================================ */}
      {activeTab === 'transports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              全線機票、景觀列車、登山鐵道與通票安排
            </span>
            <button
              onClick={() => handleOpenTransModal()}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-md flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>新增交通安排</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {transports.map((trans) => (
              <div
                key={trans.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 hover:border-slate-700 transition-all"
              >
                {/* 頂部標題 */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                        <Train className="w-3.5 h-3.5" />
                        <span>{trans.categoryLabel}</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                        {trans.operatorNumber}
                      </span>
                      {trans.bookingReference && (
                        <span className="text-xs text-slate-400 font-mono">
                          訂位代碼：{trans.bookingReference}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {trans.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 mt-1">
                      <span className="font-semibold text-white">{trans.routeFrom}</span>
                      <span className="text-slate-500">➔</span>
                      <span className="font-semibold text-white">{trans.routeTo}</span>
                    </div>
                  </div>

                  {/* 席位與票種 */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-bold text-emerald-400 block">
                        {trans.ticketType}
                      </span>
                      {trans.seatsInfo && (
                        <span className="text-xs text-slate-300 font-mono block mt-0.5">
                          {trans.seatsInfo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenTransModal(trans)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="編輯交通"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTransport(trans.id)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                        title="刪除交通"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 乘車須知卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* 月台 */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                    <span className="font-bold text-sky-400 block">🚉 月台與報到候車</span>
                    <p className="text-slate-300 leading-relaxed">
                      {trans.platformNotice || '依 SBB App 即時月台號碼登車'}
                    </p>
                  </div>

                  {/* 行李 */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                    <span className="font-bold text-amber-400 block">🧳 大件行李放置須知</span>
                    <p className="text-slate-300 leading-relaxed">
                      {trans.luggageNotice || '車廂玄關處置物架或座位上方架'}
                    </p>
                  </div>

                  {/* 查票 */}
                  <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-1">
                    <span className="font-bold text-emerald-400 block">🎫 查票出示規定</span>
                    <p className="text-slate-300 leading-relaxed">
                      {trans.boardingNotice || '出示護照正本 + 購票憑證'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 住宿 Modal */}
      {showAccModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingAccId ? '編輯住宿預訂' : '新增住宿預訂'}
              </h3>
              <button onClick={() => setShowAccModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAcc} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">所屬基地城市</label>
                  <input
                    type="text"
                    required
                    value={accForm.baseNameZh}
                    onChange={(e) => setAccForm({ ...accForm, baseNameZh: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">預訂平台</label>
                  <input
                    type="text"
                    value={accForm.bookingPlatform}
                    onChange={(e) => setAccForm({ ...accForm, bookingPlatform: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">飯店 / 木屋名稱</label>
                <input
                  type="text"
                  required
                  value={accForm.hotelName}
                  onChange={(e) => setAccForm({ ...accForm, hotelName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">房型與床型配置</label>
                <input
                  type="text"
                  value={accForm.roomType}
                  onChange={(e) => setAccForm({ ...accForm, roomType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">入住日</label>
                  <input
                    type="date"
                    value={accForm.checkInDate}
                    onChange={(e) => setAccForm({ ...accForm, checkInDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">退房日</label>
                  <input
                    type="date"
                    value={accForm.checkOutDate}
                    onChange={(e) => setAccForm({ ...accForm, checkOutDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">總價與幣別</label>
                  <input
                    type="number"
                    value={accForm.totalPrice}
                    onChange={(e) => setAccForm({ ...accForm, totalPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">訂單確認編號</label>
                <input
                  type="text"
                  value={accForm.confirmationCode}
                  onChange={(e) => setAccForm({ ...accForm, confirmationCode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">地址與地圖資訊</label>
                <input
                  type="text"
                  value={accForm.address}
                  onChange={(e) => setAccForm({ ...accForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* 關鍵須知欄位 */}
              <div className="border-t border-slate-800 pt-2 space-y-2">
                <span className="font-bold text-amber-300 block">重要入住與房屋須知：</span>
                <div>
                  <label className="block text-slate-400 mb-1">🔑 鑰匙與入住須知 (Keybox密碼等)</label>
                  <textarea
                    rows={2}
                    value={accForm.keyPickupNotice}
                    onChange={(e) => setAccForm({ ...accForm, keyPickupNotice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">♻️ 垃圾分類與丟棄須知</label>
                  <textarea
                    rows={2}
                    value={accForm.garbageRulesNotice}
                    onChange={(e) => setAccForm({ ...accForm, garbageRulesNotice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">🍳 廚房自煮與退房清潔須知</label>
                  <textarea
                    rows={2}
                    value={accForm.kitchenRulesNotice}
                    onChange={(e) => setAccForm({ ...accForm, kitchenRulesNotice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAccModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
                >
                  儲存住宿
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 交通 Modal */}
      {showTransModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingTransId ? '編輯交通訂單' : '新增交通安排'}
              </h3>
              <button onClick={() => setShowTransModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrans} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">交通類別</label>
                  <select
                    value={transForm.category}
                    onChange={(e) => setTransForm({ 
                      ...transForm, 
                      category: e.target.value as any,
                      categoryLabel: e.target.options[e.target.selectedIndex].text
                    })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="scenic_train">景觀列車</option>
                    <option value="flight">國際航班</option>
                    <option value="mountain_rail">登山齒軌</option>
                    <option value="cable_car">高空纜車</option>
                    <option value="ferry">湖泊渡輪</option>
                    <option value="car_rental">租車自駕</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">班次 / 車次編號</label>
                  <input
                    type="text"
                    required
                    value={transForm.operatorNumber}
                    onChange={(e) => setTransForm({ ...transForm, operatorNumber: e.target.value })}
                    placeholder="例如: PE 902, BR 087"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">交通安排標題</label>
                <input
                  type="text"
                  required
                  value={transForm.title}
                  onChange={(e) => setTransForm({ ...transForm, title: e.target.value })}
                  placeholder="例如: 冰河列車全景席預訂"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">出發地</label>
                  <input
                    type="text"
                    value={transForm.routeFrom}
                    onChange={(e) => setTransForm({ ...transForm, routeFrom: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">目的地</label>
                  <input
                    type="text"
                    value={transForm.routeTo}
                    onChange={(e) => setTransForm({ ...transForm, routeTo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">訂位代碼 / PNR</label>
                  <input
                    type="text"
                    value={transForm.bookingReference}
                    onChange={(e) => setTransForm({ ...transForm, bookingReference: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">車廂與座位號</label>
                  <input
                    type="text"
                    value={transForm.seatsInfo}
                    onChange={(e) => setTransForm({ ...transForm, seatsInfo: e.target.value })}
                    placeholder="車廂 4 / 座位 11-17"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* 乘車須知 */}
              <div className="border-t border-slate-800 pt-2 space-y-2">
                <span className="font-bold text-red-300 block">重要搭乘與轉乘須知：</span>
                <div>
                  <label className="block text-slate-400 mb-1">🚉 月台候車須知</label>
                  <input
                    type="text"
                    value={transForm.platformNotice}
                    onChange={(e) => setTransForm({ ...transForm, platformNotice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">🧳 大件行李放置須知</label>
                  <input
                    type="text"
                    value={transForm.luggageNotice}
                    onChange={(e) => setTransForm({ ...transForm, luggageNotice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">🎫 查票出示規定</label>
                  <input
                    type="text"
                    value={transForm.boardingNotice}
                    onChange={(e) => setTransForm({ ...transForm, boardingNotice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold"
                >
                  儲存交通
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
