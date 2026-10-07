// ============================================================
// Google Sheets API Proxy (透過 Google Apps Script 讀寫，支援多旅程 tripId 隔離)
// ============================================================

const SCRIPT_URL_ENV = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GAS_URL || '';
const SECRET_ENV = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_FAMILY_SECRET || 'SWISS_ODYSSEY_2027_SECRET';

/** 取得當前設定的 GAS URL (優先讀取 localStorage 使用者手動在設定頁輸入的覆寫值) */
export function getGasUrl(): string {
  const local = localStorage.getItem('travel_gas_url');
  if (local && local.trim().length > 0) return local.trim();
  return SCRIPT_URL_ENV;
}

/** 取得當前設定的密鑰 */
export function getFamilySecret(): string {
  const local = localStorage.getItem('travel_family_secret');
  if (local && local.trim().length > 0) return local.trim();
  return SECRET_ENV;
}

/** 檢查是否已設定真實且有效的雲端同步網址 */
export function isGasConfigured(): boolean {
  const url = getGasUrl();
  if (!url || typeof url !== 'string') return false;
  // 必須是正式 Apps Script exec 格式
  if (!url.startsWith('https://script.google.com/macros/s/')) return false;
  // 排除模板範例佔位文字 (防止使用者直接複製範本導致卡死在待同步)
  if (url.includes('YOUR_SCRIPT_ID') || url.includes('YOUR_DEPLOYMENT_ID') || url.includes('YOUR_')) {
    return false;
  }
  return true;
}

/**
 * 讀取試算表資料
 * @param sheetName 可選，若不傳則一次拉取全部分頁
 * @param tripId 可選，指定旅程 ID 進行隔離查詢
 */
export async function fetchFromSheet<T = unknown>(
  sheetName?: string,
  tripId?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  const url = getGasUrl();
  const secret = getFamilySecret();

  if (!isGasConfigured()) {
    return { success: false, error: '尚未設定 Google Apps Script Web App URL' };
  }

  const timeoutMs = 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams();
    if (sheetName) params.append('sheet', sheetName);
    if (tripId) params.append('tripId', tripId);
    if (secret) params.append('secret', secret);

    const fullUrl = `${url}?${params.toString()}`;
    const response = await fetch(fullUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Google 試算表伺服器回傳 HTTP ${response.status} (${response.statusText})`);
    }

    const rawText = await response.text();
    try {
      const json = JSON.parse(rawText);
      return json;
    } catch {
      if (rawText.includes('<html') || rawText.includes('<!DOCTYPE') || rawText.includes('找不到網頁')) {
        return {
          success: false,
          error: 'Google Apps Script 回傳了網頁錯誤頁面。請確認 Web App URL 是否有效，且存取權限已設為「所有人 (Anyone)」。',
        };
      }
      return { success: false, error: `回傳格式非 JSON: ${rawText.slice(0, 100)}` };
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    let msg = err instanceof Error ? err.message : String(err);
    if ((err instanceof DOMException && err.name === 'AbortError') || msg.toLowerCase().includes('aborted')) {
      msg = '連線逾時（超過 30 秒）：Google 試算表讀取較慢，請檢查網路連線或稍後再試。';
    }
    return { success: false, error: msg };
  }
}

/**
 * 寫入 / 更新 / 刪除試算表資料
 * 關鍵注意：Header 必須使用 'Content-Type': 'text/plain;charset=utf-8'，
 * 視為 Simple Request，徹底避免觸發瀏覽器 OPTIONS preflight CORS 限制！
 */
export async function mutateSheet(
  sheet: string,
  action: 'APPEND' | 'UPDATE' | 'DELETE' | 'BATCH' | 'BATCH_SYNC_TRIP' | 'DELETE_TRIP',
  payload: Record<string, unknown>,
  tripId?: string
): Promise<{ success: boolean; error?: string; id?: string; stats?: any; message?: string }> {
  const url = getGasUrl();
  const secret = getFamilySecret();

  if (!isGasConfigured()) {
    // 尚未綁定雲端時不噴紅字，僅本機作業
    return { success: true };
  }

  // BATCH_SYNC_TRIP 涉及建立多個工作表與批量寫入，提供 60 秒充裕超時保護
  const timeoutMs = action === 'BATCH_SYNC_TRIP' ? 60000 : 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const bodyData = JSON.stringify({
      secret,
      sheet,
      action,
      tripId,
      ...payload,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyData,
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Google 試算表伺服器回傳 HTTP ${response.status} (${response.statusText})`);
    }

    const rawText = await response.text();
    try {
      const json = JSON.parse(rawText);
      return json;
    } catch {
      if (rawText.includes('<html') || rawText.includes('<!DOCTYPE') || rawText.includes('找不到網頁')) {
        return {
          success: false,
          error: 'Google Apps Script 回傳了網頁錯誤頁面。請確認 Web App URL 是否有效，且存取權限已設為「所有人 (Anyone)」。',
        };
      }
      return { success: false, error: `回傳格式非 JSON: ${rawText.slice(0, 100)}` };
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    let msg = err instanceof Error ? err.message : String(err);
    if ((err instanceof DOMException && err.name === 'AbortError') || msg.toLowerCase().includes('aborted')) {
      msg = `連線逾時（超過 ${Math.round(timeoutMs / 1000)} 秒）：Google 試算表處理較慢或初次建表耗時較長，請稍候重試。`;
    }
    return { success: false, error: msg };
  }
}
