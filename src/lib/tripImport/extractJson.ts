export interface ExtractJsonResult {
  success: boolean;
  data?: unknown;
  rawText?: string;
  error?: string;
  errorSnippet?: string;
  errorPosition?: { line: number; column: number };
}

/**
 * 容錯抽取並解析 AI 輸出的 JSON 字串
 * 支援 Markdown code block 剝除、首尾冗言移除、全形引號替換、尾逗號修復與 BOM 清理
 */
export function extractJson(rawInput: string): ExtractJsonResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      success: false,
      error: '輸入內容為空，請貼上包含 JSON 的文字。',
    };
  }

  // 1. 去除 BOM
  let text = rawInput.replace(/^\uFEFF/, '').trim();

  // 2. 剝除 Markdown code block 圍欄
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const matchCodeBlock = text.match(codeBlockRegex);
  if (matchCodeBlock && matchCodeBlock[1]) {
    text = matchCodeBlock[1].trim();
  }

  // 3. 找出最外層物件的 { 和 }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return {
      success: false,
      error: '找不到合法的 JSON 物件區塊（缺少大括號 { }）。',
      rawText: rawInput,
    };
  }

  text = text.substring(firstBrace, lastBrace + 1);

  // 4. 清理全形引號為標準半形引號
  text = text
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  // 5. 處理物件與陣列的結尾尾逗號 (Trailing commas: ,\s*})
  // 執行多次以處理多層嵌套的尾逗號
  text = text.replace(/,(\s*[}\]])/g, '$1');
  text = text.replace(/,(\s*[}\]])/g, '$1');

  // 6. 嘗試標準 JSON.parse
  try {
    const data = JSON.parse(text);
    return {
      success: true,
      data,
      rawText: text,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    
    // 嘗試解析錯誤位置（例如 "at position 1234"）
    let line = 1;
    let col = 1;
    let snippet = '';
    const posMatch = errorMsg.match(/position\s+(\d+)/i);

    if (posMatch && posMatch[1]) {
      const pos = parseInt(posMatch[1], 10);
      if (!isNaN(pos) && pos >= 0 && pos <= text.length) {
        const textBefore = text.slice(0, pos);
        const lines = textBefore.split('\n');
        line = lines.length;
        col = lines[lines.length - 1].length + 1;

        const start = Math.max(0, pos - 40);
        const end = Math.min(text.length, pos + 40);
        snippet = text.slice(start, end);
      }
    }

    return {
      success: false,
      error: `JSON 解析失敗：${errorMsg}`,
      errorSnippet: snippet ? `...${snippet}...` : undefined,
      errorPosition: snippet ? { line, column: col } : undefined,
      rawText: text,
    };
  }
}
