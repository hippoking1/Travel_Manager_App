// ============================================================
// Google Sheets API Proxy (透過 Google Apps Script 讀寫)
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

/** 檢查是否已設定雲端同步網址 */
export function isGasConfigured(): boolean {
  const url = getGasUrl();
  return typeof url === 'string' && url.startsWith('https://script.google.com/macros/s/');
}

/**
 * 讀取試算表資料
 * @param sheetName 可選，若不傳則一次拉取全部分頁
 */
export async function fetchFromSheet<T = unknown>(sheetName?: string): Promise<{ success: boolean; data?: T; error?: string }> {
  const url = getGasUrl();
  if (!isGasConfigured()) {
    return { success: false, error: '尚未設定 Google Apps Script Web App URL' };
  }

  try {
    const fullUrl = sheetName ? `${url}?sheet=${encodeURIComponent(sheetName)}` : url;
    const response = await fetch(fullUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP 錯誤碼: ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
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
  action: 'APPEND' | 'UPDATE' | 'DELETE' | 'BATCH',
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string; id?: string }> {
  const url = getGasUrl();
  const secret = getFamilySecret();

  if (!isGasConfigured()) {
    // 尚未綁定雲端時不噴紅字，僅本機作業
    return { success: true };
  }

  try {
    const bodyData = JSON.stringify({
      secret,
      sheet,
      action,
      ...payload,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyData,
      redirect: 'follow',
    });

    const json = await response.json();
    return json;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
