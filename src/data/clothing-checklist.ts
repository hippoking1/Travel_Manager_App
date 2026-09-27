import type { ChecklistItem } from '../types';

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  // ----------------------------------------------------
  // 洋蔥式 (Onion Layering) 穿搭必備 (0m - 3,883m)
  // ----------------------------------------------------
  {
    id: 'chk-base-layer',
    category: 'clothing',
    categoryLabel: '洋蔥式穿搭',
    item: '底層透氣排汗發熱衣 (長袖 2-3 件，羊毛/聚酯纖維)',
    checked: true,
    priority: 'high',
    altitudeRange: '0m - 3,883m 全海拔通用',
  },
  {
    id: 'chk-mid-layer',
    category: 'clothing',
    categoryLabel: '洋蔥式穿搭',
    item: '中層保暖刷毛外套 (Fleece) 或輕量羽絨背心',
    checked: true,
    priority: 'high',
    altitudeRange: '1,500m - 3,000m (策馬特、高山健行)',
  },
  {
    id: 'chk-outer-layer',
    category: 'clothing',
    categoryLabel: '洋蔥式穿搭',
    item: '外層防風防暴雨 GORE-TEX 外套 (附兜帽)',
    checked: true,
    priority: 'high',
    altitudeRange: '0m - 3,883m (防午後高山驟雨與冰川強風)',
  },
  {
    id: 'chk-heavy-down',
    category: 'clothing',
    categoryLabel: '洋蔥式穿搭',
    item: '高充絨量保暖厚羽絨外套 (極地防寒專用)',
    checked: false,
    priority: 'high',
    altitudeRange: '3,883m 冰川天堂專用 (終年零度以下)',
  },
  {
    id: 'chk-sunglasses',
    category: 'clothing',
    categoryLabel: '防曬防護',
    item: '抗 UV 400 偏光太陽眼鏡 (長輩/兒童必備防雪盲)',
    checked: true,
    priority: 'high',
    altitudeRange: '2,000m 以上高山與冰川雪地',
  },
  {
    id: 'chk-shoes',
    category: 'clothing',
    categoryLabel: '足部防護',
    item: '防滑防水中筒健行鞋 + 羊毛吸震厚襪',
    checked: true,
    priority: 'high',
    altitudeRange: '巴克普湖、利菲爾湖健行必備',
  },
  {
    id: 'chk-beanie-gloves',
    category: 'clothing',
    categoryLabel: '保暖配件',
    item: '保暖毛帽 (護耳)、防風手套、魔術保暖脖圍',
    checked: false,
    priority: 'high',
    altitudeRange: 'Gornergrat 與冰川天堂',
  },

  // ----------------------------------------------------
  // 長輩與幼童專屬備品 (Seniors & Kids)
  // ----------------------------------------------------
  {
    id: 'chk-senior-poles',
    category: 'seniors',
    categoryLabel: '長輩專屬',
    item: '超輕量碳纖維避震登山杖 (保護長者膝蓋)',
    checked: true,
    priority: 'high',
  },
  {
    id: 'chk-senior-knee',
    category: 'seniors',
    categoryLabel: '長輩專屬',
    item: '透氣彈性護膝與日常筋骨關節保養常備藥',
    checked: false,
    priority: 'medium',
  },
  {
    id: 'chk-thermos',
    category: 'seniors',
    categoryLabel: '長輩專屬',
    item: '輕量高保溫熱水壺 (長輩上高山喝溫熱開水預防高山反應)',
    checked: true,
    priority: 'high',
  },
  {
    id: 'chk-kids-spare',
    category: 'kids',
    categoryLabel: '幼童專屬',
    item: '萊湖玩水與高山雪圈備用乾爽換洗衣物與小毛巾',
    checked: false,
    priority: 'high',
  },
  {
    id: 'chk-kids-sunscreen',
    category: 'kids',
    categoryLabel: '幼童專屬',
    item: 'SPF 50+ 溫和抗敏感兒童高防曬乳液與護唇膏',
    checked: true,
    priority: 'high',
  },

  // ----------------------------------------------------
  // 證件與重要檔案 (Documents)
  // ----------------------------------------------------
  {
    id: 'chk-passports',
    category: 'documents',
    categoryLabel: '證件檔案',
    item: '全員中華民國護照正本 (有效期限 6 個月以上)',
    checked: true,
    priority: 'high',
  },
  {
    id: 'chk-stp-family',
    category: 'documents',
    categoryLabel: '證件檔案',
    item: 'Swiss Travel Pass (4位成人) + Swiss Family Card (3位兒童免票卡) PDF',
    checked: true,
    priority: 'high',
  },
  {
    id: 'chk-insurance',
    category: 'documents',
    categoryLabel: '證件檔案',
    item: '申根旅遊平安險與高額海外突發疾病醫療保險英文證明',
    checked: true,
    priority: 'high',
  },

  // ----------------------------------------------------
  // 電子產品與轉接插座 (Electronics)
  // ----------------------------------------------------
  {
    id: 'chk-type-j-plug',
    category: 'electronics',
    categoryLabel: '電子電器',
    item: '瑞士專用三圓孔轉接頭 (Type J 六角內嵌式插頭) 4-6 個',
    checked: true,
    priority: 'high',
  },
  {
    id: 'chk-powerbank',
    category: 'electronics',
    categoryLabel: '電子電器',
    item: '大容量行動電源 (低溫高山手機電量耗損極速，隨身帶上飛機)',
    checked: true,
    priority: 'high',
  },
];
