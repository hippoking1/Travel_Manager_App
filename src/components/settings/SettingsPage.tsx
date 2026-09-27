import React, { useState } from 'react';
import { 
  Settings, 
  Calendar, 
  Cloud, 
  Save, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';

export const SettingsPage: React.FC = () => {
  const { config, updateConfig, setStartDate, fetchLatestFromSheets, isFetchingRemote } = useTripStore();

  const [tripName, setTripName] = useState(config.tripName);
  const [subtitle, setSubtitle] = useState(config.subtitle);
  const [dateInput, setDateInput] = useState(config.startDate || '');
  
  // 匯率
  const [chfTwd, setChfTwd] = useState(String(config.currencies.rates.CHF_TWD || 36.5));
  const [eurTwd, setEurTwd] = useState(String(config.currencies.rates.EUR_TWD || 34.2));

  // Google Sheets 連線設定 (支援本機 LocalStorage 隨時切換覆蓋)
  const [gasUrl, setGasUrl] = useState(localStorage.getItem('travel_gas_url') || '');
  const [secret, setSecret] = useState(localStorage.getItem('travel_family_secret') || 'SWISS_ODYSSEY_2027_SECRET');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      tripName: tripName.trim(),
      subtitle: subtitle.trim(),
      currencies: {
        ...config.currencies,
        rates: {
          ...config.currencies.rates,
          CHF_TWD: parseFloat(chfTwd) || 36.5,
          EUR_TWD: parseFloat(eurTwd) || 34.2,
        },
      },
    });

    setStartDate(dateInput.trim() ? dateInput.trim() : null);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveGasConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('travel_gas_url', gasUrl.trim());
    localStorage.setItem('travel_family_secret', secret.trim());
    setTestResult('測試連線中...');

    const success = await fetchLatestFromSheets();
    if (success) {
      setTestResult('🟢 連線成功！已由 Google Sheets 拉取最新資料。');
    } else {
      setTestResult('⚠️ 連線設定已儲存 (若尚未部署 Apps Script 或無網路，將暫存於本機)。');
    }
  };

  const handleClearDate = () => {
    setDateInput('');
    setStartDate(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* 標題 */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          <span>旅行彈性設定與 Google Sheets 雲端連線</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          自訂出發日期、修改旅行標題、微調即時匯率，並綁定專屬的 Google 試算表免伺服器資料庫。
        </p>
      </div>

      {/* 區塊 1: 基本旅行設定與出發日期 (彈性日期核心) */}
      <form onSubmit={handleSaveGeneral} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Calendar className="w-5 h-5 text-red-500" />
          <span>旅行核心基本設定 (彈性適用任何行程)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              旅行名稱
            </label>
            <input
              type="text"
              required
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              副標題 / 備忘說明
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* 出發日期選擇器 (彈性核心) */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>旅行出發首日 (Day 1)</span>
              <span className="text-[11px] font-normal text-slate-400">(設定後 16 天日期自動連續推算)</span>
            </label>
            {dateInput && (
              <button
                type="button"
                onClick={handleClearDate}
                className="text-xs text-red-400 hover:underline"
              >
                清空為相對天數 (Day 1 - 16)
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 flex-1 font-mono"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            若暫無確切日期，可清空此欄，首頁將直接顯示「Day 01、Day 02」而不受固定年份與月份限制。
          </p>
        </div>

        {/* 匯率微調 */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              瑞士法郎匯率 (1 CHF = ? TWD)
            </label>
            <input
              type="number"
              step="0.01"
              value={chfTwd}
              onChange={(e) => setChfTwd(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              歐元匯率 (1 EUR = ? TWD)
            </label>
            <input
              type="number"
              step="0.01"
              value={eurTwd}
              onChange={(e) => setEurTwd(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3">
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-lg shadow-red-600/30 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>儲存基本設定</span>
          </button>

          {saveSuccess && (
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>設定已成功儲存！</span>
            </span>
          )}
        </div>
      </form>

      {/* 區塊 2: Google Sheets 雲端連線設定 */}
      <form onSubmit={handleSaveGasConfig} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Cloud className="w-5 h-5 text-sky-400" />
            <span>Google Sheets 試算表資料庫綁定</span>
          </h3>

          <a
            href="https://github.com/hippoking1/Travel_Manager_App/blob/main/google-apps-script/SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1"
          >
            <span>查看部署圖文教學</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          將你部署完成的 Google Apps Script (GAS) 網頁應用程式 URL 貼於下方，全家人的手機便能直接對同一份 Google Sheet 即時記帳、打勾行李與同步備忘！
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Apps Script Web App URL
          </label>
          <input
            type="url"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            自訂密鑰 (Family Secret Key)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="SWISS_ODYSSEY_2027_SECRET"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <button
            type="submit"
            disabled={isFetchingRemote}
            className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-colors shadow-lg shadow-sky-600/30 flex items-center justify-center gap-1.5"
          >
            <Cloud className="w-4 h-4" />
            <span>儲存並測試連線</span>
          </button>

          {testResult && (
            <span className="text-xs font-semibold text-slate-200">
              {testResult}
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
