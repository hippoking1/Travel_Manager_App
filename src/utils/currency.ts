import type { CurrencyConfig } from '../types';

/** 預設匯率 (支援歐洲、日本、美加等多幣別自由行) */
export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  primary: 'CHF',
  rates: {
    CHF_TWD: 36.5,
    EUR_TWD: 34.2,
    EUR_CHF: 0.94,
    JPY_TWD: 0.22,
    USD_TWD: 32.5,
    GBP_TWD: 41.5,
    CHF_CHF: 1,
    EUR_EUR: 1,
    TWD_TWD: 1,
    JPY_JPY: 1,
    USD_USD: 1,
  },
  lastUpdated: new Date().toISOString(),
};

/**
 * 彈性金額幣別換算 (以 TWD 為基準中間幣別換算)
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: CurrencyConfig['rates'] = DEFAULT_CURRENCY_CONFIG.rates
): number {
  if (from === to) return amount;
  if (!amount || isNaN(amount)) return 0;

  // 1. 先換算成 TWD
  let inTWD = amount;
  if (from === 'TWD') {
    inTWD = amount;
  } else {
    const fromRate = rates[`${from}_TWD`] || DEFAULT_CURRENCY_CONFIG.rates[`${from}_TWD`];
    if (fromRate) {
      inTWD = amount * fromRate;
    }
  }

  // 2. 再由 TWD 換為目標幣別
  if (to === 'TWD') {
    return Math.round(inTWD);
  }

  const toRate = rates[`${to}_TWD`] || DEFAULT_CURRENCY_CONFIG.rates[`${to}_TWD`];
  if (toRate && toRate > 0) {
    return Number((inTWD / toRate).toFixed(2));
  }

  return amount;
}

/**
 * 格式化幣別字串
 */
export function formatMoney(amount: number, currency: string): string {
  const safeAmount = isNaN(amount) ? 0 : amount;
  if (currency === 'TWD') {
    return `NT$ ${Math.round(safeAmount).toLocaleString('zh-TW')}`;
  } else if (currency === 'CHF') {
    return `CHF ${safeAmount.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'EUR') {
    return `€ ${safeAmount.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'JPY') {
    return `¥ ${Math.round(safeAmount).toLocaleString('zh-TW')}`;
  } else if (currency === 'USD') {
    return `$ ${safeAmount.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${safeAmount.toFixed(2)}`;
}

/**
 * 德國 19% 跨境增值稅退稅估算
 * 德國一般商品標準增值稅率為 19% (稅內含，退稅淨值約落在總結帳金額的 10% ~ 14.5% 之間)
 */
export function calculateGermanTaxRefund(
  totalEUR: number,
  eurRate = 34.2
): {
  grossVAT: number;
  estimatedRefundEUR: number;
  estimatedRefundTWD: number;
  qualifies: boolean;
} {
  const qualifies = totalEUR >= 50;
  const grossVAT = Number((totalEUR - totalEUR / 1.19).toFixed(2));
  const estimatedRefundEUR = qualifies ? Number((totalEUR * 0.115).toFixed(2)) : 0;
  const estimatedRefundTWD = Math.round(estimatedRefundEUR * (eurRate || 34.2));

  return {
    grossVAT,
    estimatedRefundEUR,
    estimatedRefundTWD,
    qualifies,
  };
}
