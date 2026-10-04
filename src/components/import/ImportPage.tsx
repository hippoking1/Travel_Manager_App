import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Copy, 
  Check, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Upload, 
  Calendar, 
  MapPin, 
  Building2, 
  Train, 
  ShieldCheck,
  Info
} from 'lucide-react';
import { useTripStore } from '../../stores/tripStore';
import { useActiveTrip } from '../../stores/selectors';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useConfirm } from '../ui/ConfirmDialog';
import { toast } from '../ui/Toast';
import { 
  extractJson, 
  validateTripImport, 
  exportTripToJsonString,
  PROMPT_NEW_TRIP_TEMPLATE,
  PROMPT_ADJUST_TRIP_TEMPLATE,
  DEMO_SAMPLE_IMPORT_JSON,
  type TripImportV1
} from '../../lib/tripImport';

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const activeTrip = useActiveTrip();
  const { importAsNewTrip, applyImportToActive } = useTripStore();
  const confirm = useConfirm();

  // Tab: 'prompt' | 'input'
  const [activeTab, setActiveTab] = useState<'prompt' | 'input'>('input');
  // Prompt 子頁籤: 'new' | 'adjust'
  const [promptSubTab, setPromptSubTab] = useState<'new' | 'adjust'>('new');
  // 輸入的 JSON 文字
  const [jsonInput, setJsonInput] = useState<string>('');
  // 匯入模式: 'new' (建立新旅程) | 'current' (匯入至當前旅程)
  const [importTarget, setImportTarget] = useState<'new' | 'current'>('new');
  // 當前旅程覆蓋模式: 'replace' | 'append'
  const [mergeMode, setMergeMode] = useState<'replace' | 'append'>('replace');
  // 是否取代清單
  const [replaceChecklist, setReplaceChecklist] = useState<boolean>(false);
  // 複製狀態
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 匯出目前行程的 JSON 字串 (供 Prompt B 使用)
  const activeTripJson = useMemo(() => {
    try {
      return exportTripToJsonString(activeTrip);
    } catch {
      return '{}';
    }
  }, [activeTrip]);

  // 解析與即時驗證
  const parseResult = useMemo(() => {
    if (!jsonInput.trim()) {
      return null;
    }
    const extracted = extractJson(jsonInput);
    if (!extracted.success) {
      return {
        success: false,
        error: extracted.error,
        snippet: extracted.errorSnippet,
        position: extracted.errorPosition,
        validation: null,
      };
    }

    const validation = validateTripImport(extracted.data);
    return {
      success: validation.valid,
      error: validation.errors.length > 0 ? validation.errors.join('；') : undefined,
      validation,
    };
  }, [jsonInput]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success('已成功複製到剪貼簿！');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error('無法寫入剪貼簿，請手動全選複製。');
    }
  };

  const handleLoadDemo = () => {
    setJsonInput(DEMO_SAMPLE_IMPORT_JSON);
    setActiveTab('input');
    toast.info('已載入「北海道道央漫遊 6 日」示範 JSON');
  };

  const handleClear = () => {
    setJsonInput('');
  };

  const handleExecuteImport = async () => {
    if (!parseResult || !parseResult.success || !parseResult.validation?.data) {
      toast.error('請先修正 JSON 格式錯誤後再執行匯入。');
      return;
    }

    const data: TripImportV1 = parseResult.validation.data;

    if (importTarget === 'new') {
      const ok = await confirm({
        title: '確定建立為新旅程？',
        message: `將依據匯入內容建立全新旅程「${data.trip.name}」（共 ${data.itinerary.length} 天日程）。您現有的旅程將完全保留不受影響。`,
        confirmLabel: '確認建立',
      });
      if (!ok) return;

      importAsNewTrip(data);
      toast.success(`新旅程「${data.trip.name}」建立成功！`);
      navigate('/');
    } else {
      // 匯入進目前旅程
      const actionText = mergeMode === 'replace' ? '覆蓋現有日程' : '追加到末尾';
      const warningExtra = mergeMode === 'replace' 
        ? '\n\n【重要提醒】：依照預訂規則，若現有住宿與交通「沒有訂單編號/訂位代碼」將會被直接覆蓋，已有訂單編號的預訂將受到完整保護保留。' 
        : '';

      const ok = await confirm({
        title: `確定將行程${actionText}？`,
        message: `即將把匯入資料套用至目前旅程「${activeTrip.name}」。${warningExtra}`,
        danger: mergeMode === 'replace',
        confirmLabel: `確認${actionText}`,
      });
      if (!ok) return;

      const result = applyImportToActive(data, mergeMode, { replaceChecklist });
      
      let msg = `已成功${actionText}！`;
      if (mergeMode === 'replace') {
        msg += `（保留已確認住宿 ${result.stats.preservedAccommodationsCount} 筆、交通 ${result.stats.preservedTransportsCount} 筆）`;
      }
      toast.success(msg);
      navigate('/');
    }
  };

  const validData = parseResult?.validation?.data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 頂部標題 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
              AI 旅遊行程智慧匯入
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 font-bold border border-teal-200 dark:border-teal-800">
              Auto Schedule
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            複製專用 Prompt 與 AI 討論規劃，貼上結果自動排定時間、住宿與行前清單
          </p>
        </div>

        {/* 快速示範按鈕 */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLoadDemo}
            icon={<FileText className="w-4 h-4 text-teal-600" />}
          >
            載入北海道示範 JSON
          </Button>
        </div>
      </div>

      {/* 主頁籤切換 */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800">
        <button
          type="button"
          onClick={() => setActiveTab('input')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'input'
              ? 'border-teal-600 text-teal-700 dark:text-teal-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>貼上 JSON 匯入</span>
          {parseResult?.success && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prompt')}
          className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'prompt'
              ? 'border-teal-600 text-teal-700 dark:text-teal-400'
              : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>取得 AI 對話提示詞 (Prompts)</span>
        </button>
      </div>

      {/* 提示詞分頁 */}
      {activeTab === 'prompt' && (
        <div className="space-y-5 animate-in fade-in-0 duration-150">
          {/* 子頁籤 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPromptSubTab('new')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                promptSubTab === 'new'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
              }`}
            >
              提示詞 A：將討論結果整理為新行程
            </button>
            <button
              type="button"
              onClick={() => setPromptSubTab('adjust')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                promptSubTab === 'adjust'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
              }`}
            >
              提示詞 B：微調或修改目前行程
            </button>
          </div>

          {promptSubTab === 'new' ? (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    使用說明：整理新行程
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    當您在 ChatGPT / Claude / Gemini 與 AI 討論好想去的景點後，複製以下提示詞貼給 AI，即可產生可直接匯入的格式。
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCopy(PROMPT_NEW_TRIP_TEMPLATE, 'prompt_new')}
                  icon={copiedKey === 'prompt_new' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                >
                  {copiedKey === 'prompt_new' ? '已複製提示詞' : '複製提示詞 A'}
                </Button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-stone-900 text-stone-100 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-stone-800 select-all">
                  {PROMPT_NEW_TRIP_TEMPLATE}
                </pre>
              </div>
            </Card>
          ) : (
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
                    使用說明：微調目前行程
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    已自動帶入您目前的旅程「{activeTrip.name}」完整資料，複製後貼給 AI，要求增加備案或替換景點。
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    handleCopy(
                      PROMPT_ADJUST_TRIP_TEMPLATE.replace(
                        '[請在此貼上由 App 匯出的目前行程 JSON]',
                        activeTripJson
                      ),
                      'prompt_adjust'
                    )
                  }
                  icon={copiedKey === 'prompt_adjust' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                >
                  {copiedKey === 'prompt_adjust' ? '已複製微調提示詞' : '複製微調提示詞 B'}
                </Button>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-stone-900 text-stone-100 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-stone-800 select-all">
                  {PROMPT_ADJUST_TRIP_TEMPLATE.replace(
                    '[請在此貼上由 App 匯出的目前行程 JSON]',
                    activeTripJson
                  )}
                </pre>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 輸入與匯入分頁 */}
      {activeTab === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左側：JSON 貼上區與解析即時回饋 */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>請貼上 AI 輸出的 JSON 文字</span>
              </label>

              {jsonInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-stone-400 hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>清空輸入</span>
                </button>
              )}
            </div>

            <div className="relative">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="在此貼上包含 JSON 的文字（支援 Markdown 標記、包含前言結語的對話內容、全形引號皆能自動容錯解析）..."
                rows={16}
                className="w-full p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 font-mono text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-400 resize-y"
              />
            </div>

            {/* 即時解析錯誤提示 */}
            {parseResult && !parseResult.success && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 space-y-2 animate-in fade-in-0 duration-150">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>資料解析未通過</span>
                </div>
                <p className="text-xs">{parseResult.error}</p>
                {parseResult.position && (
                  <p className="text-[11px] font-mono text-rose-600 dark:text-rose-300">
                    位置：第 {parseResult.position.line} 行，第 {parseResult.position.column} 字元
                  </p>
                )}
                {parseResult.snippet && (
                  <pre className="p-2 rounded-xl bg-rose-100/60 dark:bg-rose-950 text-[11px] font-mono overflow-x-auto text-rose-900 dark:text-rose-200">
                    {parseResult.snippet}
                  </pre>
                )}
              </div>
            )}

            {/* 即時警告提醒 */}
            {parseResult?.validation?.warnings && parseResult.validation.warnings.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>排程自動校正與提醒 ({parseResult.validation.warnings.length})</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                  {parseResult.validation.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 右側：匯入設定、預覽與執行操作 */}
          <div className="lg:col-span-5 space-y-5">
            <Card className="p-5 space-y-5">
              <h3 className="text-sm font-black text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>匯入目標與策略</span>
              </h3>

              {/* 匯入目標選擇 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  選擇匯入至哪裡：
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportTarget('new')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      importTarget === 'new'
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="text-xs font-bold">建立為新旅程</div>
                    <div className="text-[10px] text-stone-400 font-normal mt-0.5">
                      不更動現有旅程
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportTarget('current')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      importTarget === 'current'
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="text-xs font-bold">套用進目前旅程</div>
                    <div className="text-[10px] text-stone-400 font-normal mt-0.5 truncate">
                      {activeTrip.name}
                    </div>
                  </button>
                </div>
              </div>

              {/* 若選擇當前旅程，顯示覆蓋模式 */}
              {importTarget === 'current' && (
                <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-stone-800 animate-in fade-in-0 duration-150">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    日程合併方式：
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer">
                      <input
                        type="radio"
                        name="mergeMode"
                        checked={mergeMode === 'replace'}
                        onChange={() => setMergeMode('replace')}
                        className="mt-0.5 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-stone-900 dark:text-stone-100 block">
                          完全覆蓋現有日程 (Replace)
                        </span>
                        <span className="text-[11px] text-stone-400">
                          以新日程取代目前的每一天。
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/40 cursor-pointer">
                      <input
                        type="radio"
                        name="mergeMode"
                        checked={mergeMode === 'append'}
                        onChange={() => setMergeMode('append')}
                        className="mt-0.5 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-stone-900 dark:text-stone-100 block">
                          追加於現有日程末尾 (Append)
                        </span>
                        <span className="text-[11px] text-stone-400">
                          接續在 Day {activeTrip.itinerary.length} 之後自動遞增天數。
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* 核心規則提醒提示方塊 */}
                  <div className="p-3 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 text-teal-900 dark:text-teal-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                      <span>預訂安全保護規則已啟用</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-teal-800/90 dark:text-teal-300">
                      覆蓋模式下：凡已有「訂單確認號」或「訂位代碼」的既有住宿與交通將<strong>完全保留</strong>；僅未填寫訂單號碼的項目會被覆蓋汰換。
                    </p>
                  </div>

                  <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer text-stone-600 dark:text-stone-400">
                    <input
                      type="checkbox"
                      checked={replaceChecklist}
                      onChange={(e) => setReplaceChecklist(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>同時完全取代行前裝備清單 (預設為智慧增量合併)</span>
                  </label>
                </div>
              )}

              {/* 預覽卡片 */}
              {validData ? (
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      匯入資料預覽
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      格式驗證通過
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-stone-900 dark:text-stone-100">
                      {validData.trip.coverEmoji || '✈️'} {validData.trip.name}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {validData.trip.subtitle || validData.trip.destination}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <div className="text-[10px] text-stone-400">日程天數</div>
                        <div className="font-bold text-stone-800 dark:text-stone-200">
                          {validData.itinerary.length} 天日程
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                      <div>
                        <div className="text-[10px] text-stone-400">住宿基地</div>
                        <div className="font-bold text-stone-800 dark:text-stone-200">
                          {validData.bases?.length || 1} 處基地
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-[10px] text-stone-400">住宿建議</div>
                        <div className="font-bold text-stone-800 dark:text-stone-200">
                          {validData.accommodations?.length || 0} 筆
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 flex items-center gap-2">
                      <Train className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div>
                        <div className="text-[10px] text-stone-400">交通預訂</div>
                        <div className="font-bold text-stone-800 dark:text-stone-200">
                          {validData.transports?.length || 0} 筆
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 每日標題快速預覽 */}
                  <div className="pt-2 border-t border-stone-200/60 dark:border-stone-700/60">
                    <span className="text-[11px] font-bold text-stone-400 block mb-1.5">
                      日程大綱：
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {validData.itinerary.map((d) => (
                        <div
                          key={d.day}
                          className="text-xs text-stone-700 dark:text-stone-300 flex items-center justify-between py-0.5"
                        >
                          <span className="font-semibold truncate">
                            Day {d.day}: {d.title}
                          </span>
                          <span className="text-[10px] text-stone-400 shrink-0 font-mono">
                            {d.timeBlocks.length} 項活動
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-dashed border-stone-200 dark:border-stone-800 text-center text-xs text-stone-400">
                  貼上合法 JSON 後，此處將即時顯示完整預覽與排程摘要。
                </div>
              )}

              {/* 執行匯入按鈕 */}
              <Button
                variant="primary"
                size="lg"
                disabled={!parseResult || !parseResult.success}
                onClick={handleExecuteImport}
                className="w-full justify-center shadow-md cursor-pointer"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {importTarget === 'new'
                  ? '立即建立為新旅程'
                  : mergeMode === 'replace'
                  ? '確認覆蓋現有日程'
                  : '確認追加至現有日程'}
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
