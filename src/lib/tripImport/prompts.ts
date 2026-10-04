/**
 * 給使用者的專屬 AI 提示詞 (Prompts)
 * 可複製給 ChatGPT / Claude / Gemini 使用
 */

export const AI_IMPORT_SYSTEM_PROMPT = `你是一位專業的旅遊行程規劃專家兼資料結構工程師。
你的任務是將與使用者討論出的旅遊規劃，嚴格轉換為【旅遊規劃 App】專用的 JSON 格式。

【輸出規範與規則】：
1. 僅輸出一個合法的 JSON 物件（放在 \`\`\`json 程式碼區塊內），不要有其他額外的前言或結語說明。
2. 標籤 tags 只能使用以下四種之一或多種組合：
   - "senior-friendly" (長輩友善，平緩步道或休息站)
   - "kids-highlight" (兒童亮點，遊樂設施或趣味活動)
   - "budget-shopping" (超市採買/購物退稅)
   - "scenic-train" (景觀火車/特色交通)
3. 時段 period 只能是 "morning", "afternoon", "evening"。
4. 時間格式 startTime 與 endTime 請使用 24 小時制 "HH:mm" (例如 "09:00", "14:30")。若時間不確定可省略，App 會自動按時段順序智慧排程。
5. 住宿預訂 accommodations 與交通預訂 transports：若已有確定訂單請填寫 confirmationCode 或 bookingReference；若僅為建議，留空字串即可。`;

export const PROMPT_NEW_TRIP_TEMPLATE = `請根據我們剛才討論的旅遊規劃內容，將其整理為【旅遊規劃 App】能直接匯入的標準 JSON 格式。

請直接依照以下範例結構輸出：

\`\`\`json
{
  "version": "1.0",
  "trip": {
    "name": "旅行名稱 (例如：關西京阪賞楓 7 天漫遊)",
    "destination": "目的地 (例如：日本 京都 / 大阪)",
    "subtitle": "副標題 (例如：三代同堂古都漫步與環球影城冒險)",
    "startDate": "2027-10-15",
    "totalDays": 7,
    "coverEmoji": "🍁",
    "currencyPrimary": "JPY"
  },
  "bases": [
    {
      "id": "kyoto",
      "name": "Kyoto",
      "nameZh": "京都",
      "days": [1, 2, 3, 4],
      "color": "#0EA5E9",
      "hotelName": "京都車站周邊飯店",
      "hotelAddress": "京都府京都市下京區...",
      "notes": "近 JR 與地下鐵，交通方便"
    }
  ],
  "itinerary": [
    {
      "day": 1,
      "baseId": "kyoto",
      "title": "抵達關西與京都塔夜景",
      "subtitle": "關西機場直達特急 HARUKA",
      "highlights": ["特急列車體驗", "京都車站空中徑路", "京都塔夜景"],
      "timeBlocks": [
        {
          "period": "morning",
          "startTime": "09:30",
          "endTime": "11:00",
          "durationMin": 90,
          "title": "桃園機場搭機啟程",
          "description": "辦理登機手續、託運行李，準備飛往關西國際機場。",
          "locationName": "桃園國際機場 T2",
          "tags": ["scenic-train"]
        },
        {
          "period": "afternoon",
          "startTime": "14:00",
          "endTime": "15:30",
          "durationMin": 90,
          "title": "搭乘 HARUKA 直達京都",
          "description": "持 ICOCA / 電子票搭乘關空特急前往京都車站。",
          "locationName": "關西機場站",
          "transport": {
            "type": "train",
            "from": "關西機場",
            "to": "京都",
            "duration": "75分鐘",
            "stpCoverage": "not-covered"
          },
          "tags": ["scenic-train"]
        }
      ],
      "foodNotes": [
        {
          "meal": "dinner",
          "mealLabel": "晚餐",
          "suggestion": "拉麵小路 / 德島拉麵",
          "type": "restaurant",
          "costEstimate": "JPY 1,200 / 人"
        }
      ]
    }
  ],
  "backlog": [
    {
      "title": "錦市場散策 (雨天備案)",
      "description": "有頂棚商店街，適合雨天採買京都道地小吃。",
      "tags": ["budget-shopping"]
    }
  ],
  "accommodations": [
    {
      "baseId": "kyoto",
      "hotelName": "京都格蘭比亞大酒店",
      "checkInDate": "2027-10-15",
      "checkOutDate": "2027-10-19",
      "nights": 4,
      "confirmationCode": "",
      "totalPrice": 85000,
      "currency": "JPY"
    }
  ],
  "transports": [
    {
      "category": "flight",
      "title": "台北桃園 ➔ 關西機場 去程航班",
      "routeFrom": "TPE",
      "routeTo": "KIX",
      "departureTime": "2027-10-15 09:30",
      "operatorNumber": "BR132",
      "bookingReference": ""
    }
  ],
  "checklist": [
    {
      "category": "documents",
      "categoryLabel": "重要證件",
      "item": "護照正本 (有效期限 6 個月以上)",
      "priority": "high"
    },
    {
      "category": "clothing",
      "categoryLabel": "穿搭",
      "item": "好走的健走鞋 / 輕薄風衣外套",
      "priority": "high"
    }
  ]
}
\`\`\`

討論內容紀錄如下：
[請在此貼上你與 AI 剛才討論的旅遊對話、筆記或景點清單]`;

export const PROMPT_ADJUST_TRIP_TEMPLATE = `我想要修改現有的旅遊行程，以下是我目前 App 的行程 JSON 資料。
請根據我的修改要求進行調整，並保留既有的欄位結構，直接輸出完整的 JSON。

【我的修改需求】：
[例如：請幫我將 Day 2 下午改為室內備案避開降雨；或者將 Day 4 抽換為適合長輩與小孩的平緩健行路線]

【目前行程 JSON】：
\`\`\`json
[請在此貼上由 App 匯出的目前行程 JSON]
\`\`\``;

export const DEMO_SAMPLE_IMPORT_JSON = JSON.stringify({
  version: "1.0",
  trip: {
    name: "日本北海道道央漫遊 6 日",
    destination: "日本 北海道 (札幌 / 小樽 / 富良野)",
    subtitle: "北國花海、運河夜景與海鮮市場慢步調",
    startDate: "2027-07-10",
    totalDays: 6,
    coverEmoji: "🌸",
    currencyPrimary: "JPY"
  },
  bases: [
    {
      id: "sapporo",
      name: "Sapporo",
      nameZh: "札幌",
      days: [1, 2, 3, 6],
      color: "#0EA5E9",
      hotelName: "JR 東日本札幌標誌酒店",
      hotelAddress: "北海道札幌市北區北6條西4丁目",
      notes: "直通札幌車站，交通生活極其便利"
    },
    {
      id: "furano",
      name: "Furano",
      nameZh: "富良野 / 美瑛",
      days: [4, 5],
      color: "#8B5CF6",
      hotelName: "新富良野王子大飯店",
      notes: "森林精靈露台、溫泉浴場"
    }
  ],
  itinerary: [
    {
      day: 1,
      baseId: "sapporo",
      title: "新千歲抵達與狸小路夜間散步",
      subtitle: "快速機場特急抵達札幌",
      highlights: ["千歲機場拉麵道場", "大通公園電視塔", "狸小路商店街"],
      timeBlocks: [
        {
          period: "afternoon",
          startTime: "14:00",
          endTime: "15:30",
          title: "抵達新千歲機場與前往札幌",
          description: "領取行李、搭乘 JR 快速 Airport 號直奔札幌車站。",
          locationName: "JR 新千歲機場站",
          tags: ["scenic-train"]
        },
        {
          period: "evening",
          startTime: "18:00",
          endTime: "20:30",
          title: "狸小路商店街採買與湯咖哩",
          description: "品嚐札幌必吃湯咖哩 Suage+，漫步狸小路採購補給。",
          locationName: "狸小路商店街",
          tags: ["budget-shopping"]
        }
      ],
      foodNotes: [
        {
          meal: "dinner",
          mealLabel: "晚餐",
          suggestion: "Suage+ 招牌脆皮雞腿湯咖哩",
          type: "restaurant",
          costEstimate: "JPY 1,600 / 人"
        }
      ]
    },
    {
      day: 2,
      baseId: "sapporo",
      title: "小樽古典運河與音樂盒堂",
      subtitle: "海風吹拂的港都懷舊漫步",
      highlights: ["小樽運河日夜景", "北一硝子館", "LeTAO 起司蛋糕雙層本店"],
      timeBlocks: [
        {
          period: "morning",
          startTime: "09:30",
          endTime: "12:00",
          title: "小樽運河散步與拍照",
          description: "紅磚倉庫群漫步，平緩無階梯，非常適合拍照取景。",
          locationName: "小樽運河",
          tags: ["senior-friendly"]
        },
        {
          period: "afternoon",
          startTime: "13:30",
          endTime: "16:00",
          title: "童話十字路口與音樂盒堂",
          description: "參觀蒸氣時鐘整點鳴響，挑選精緻音樂盒。",
          locationName: "小樽音樂盒堂本館",
          tags: ["kids-highlight"]
        }
      ]
    }
  ],
  backlog: [
    {
      title: "藻岩山夜景纜車 (視天氣調整)",
      description: "日本新三大夜景，若天氣晴朗可安排於札幌夜間搭乘纜車登頂。",
      tags: ["scenic-train"]
    }
  ],
  accommodations: [
    {
      baseId: "sapporo",
      hotelName: "JR 東日本札幌標誌酒店",
      checkInDate: "2027-07-10",
      checkOutDate: "2027-07-13",
      nights: 3,
      confirmationCode: "", // 尚未預訂
      totalPrice: 62000,
      currency: "JPY"
    }
  ],
  transports: [
    {
      category: "flight",
      title: "台北桃園 ➔ 札幌新千歲 直飛航班",
      routeFrom: "TPE",
      routeTo: "CTS",
      departureTime: "2027-07-10 08:45",
      operatorNumber: "CI130",
      bookingReference: ""
    }
  ],
  checklist: [
    {
      category: "documents",
      categoryLabel: "證件",
      item: "護照與 Visit Japan Web 申報 QR Code",
      priority: "high"
    },
    {
      category: "clothing",
      categoryLabel: "穿搭",
      item: "薄長袖外套 (早晚溫差大)",
      priority: "medium"
    }
  ]
}, null, 2);
