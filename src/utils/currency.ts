import type { CurrencyConfig } from '../types';

/** 預設匯率 */
export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  primary: 'CHF',
  rates: {
    CHF_TWD: 36.5,
    EUR_TWD: 34.2,
    EUR_CHF: 0.94,
    CHF_CHF: 1,
    EUR_EUR: 1,
    TWD_TWD: 1,
  },
  lastUpdated: new Date().toISOString(),
};

/**
 * 金額幣別換算
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: CurrencyConfig['rates'] = DEFAULT_CURRENCY_CONFIG.rates
): number {
  if (from === to) return amount;

  // 先換算成 TWD 作為通用基準中間幣別
  let inTWD = amount;
  if (from === 'CHF') {
    inTWD = amount * (rates.CHF_TWD || 36.5);
  } else if (from === 'EUR') {
    inTWD = amount * (rates.EUR_TWD || 34.2);
  } else if (from === 'TWD') {
    inTWD = amount;
  }

  // 再由 TWD 換為目標幣別
  if (to === 'TWD') {
    return Math.round(inTWD);
  } else if (to === 'CHF') {
    const rate = rates.CHF_TWD || 36.5;
    return Number((inTWD / rate).toFixed(2));
  } else if (to === 'EUR') {
    const rate = rates.EUR_TWD || 34.2;
    return Number((inTWD / rate).toFixed(2));
  }

  return amount;
}

/**
 * 格式化幣別字串
 */
export function formatMoney(amount: number, currency: string): string {
  if (currency === 'TWD') {
    return `NT$ ${Math.round(amount).toLocaleString('zh-TW')}`;
  } else if (currency === 'CHF') {
    return `CHF ${amount.toFixed(2)}`;
  } else if (currency === 'EUR') {
    return `€ ${amount.toFixed(2)}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
}

/**
 * 德國 19% 跨境增值稅退稅估算
 * 德國一般商品標準增值稅率為 19% (稅內含，退稅淨值約落在總結帳金額的 10% ~ 14.5% 之間)
 */
export function calculateGermanTaxRefund(totalEUR: number): {
  grossVAT: number;        // 理論最高增值稅 19% (Total - Total / 1.19)
  estimatedRefundEUR: number; // 扣除退稅手續費後實際拿到的退稅金 (約 11.5%)
  estimatedRefundTWD: number;
  qualifies: boolean;      // 是否達到德國退稅最低門檻 (€50)
} {
  const qualifies = totalEUR >= 50;
  const grossVAT = Number((totalEUR - totalEUR / 1.19).toFixed(2));
  const estimatedRefundEUR = qualifies ? Number((totalEUR * 0.115).toFixed(2)) : 0;
  const estimatedRefundTWD = Math.round(estimatedRefundEUR * 34.2);

  return {
    grossVAT,
    estimatedRefundEUR,
    estimatedRefundTWD,
    qualifies,
  };
}
