// 互動架構圖資料：節點位置依照真實 n8n workflow JSON 的 position 正規化而來，
// 視覺上盡量還原「打開這個 workflow 時看到的樣子」。
// category 對應 style.css 裡 .diagram-node--xxx 的配色。

const DIAGRAM_NODES = [
  { id: 'webhook',              label: 'Webhook',          sub: '接收 LINE 訊息',     icon: 'icons/webhook.svg',      type: 'Webhook',                       category: 'trigger', x: 60,   y: 60  },
  { id: 'switch',                label: 'Switch',           sub: '圖片／文字分流',     icon: 'icons/switch.svg',       type: 'Switch',                        category: 'router',  x: 300,  y: 60  },
  { id: 'get-image',             label: '取得圖片',         sub: '下載 LINE 圖片',     icon: 'icons/http-request.svg', type: 'HTTP Request',                  category: 'http',    x: 684,  y: 60  },
  { id: 'add-date',              label: '加入日期',         sub: '注入今日日期/時間', icon: 'icons/code.svg',         type: 'Code',                          category: 'code',    x: 684,  y: 300 },
  { id: 'ai-agent',               label: 'AI Agent',         sub: '理解語意 → JSON',    icon: 'icons/ai-agent.svg',     type: 'AI Agent',                      category: 'ai',      x: 972,  y: 300 },
  { id: 'gemini-chat-model',      label: 'Gemini Chat Model', sub: 'AI Agent 的語言模型', icon: 'icons/gemini.svg',     type: 'Google Gemini Chat Model',     category: 'ai-model', x: 924, y: 660 },
  { id: 'to-base64',              label: '轉base64',         sub: '圖片轉 base64',     icon: 'icons/code.svg',         type: 'Code',                          category: 'code',    x: 924,  y: 60  },
  { id: 'build-gemini-request',   label: '組合Gemini請求',   sub: '組裝 Vision 請求',   icon: 'icons/code.svg',         type: 'Code',                          category: 'code',    x: 1236, y: 60  },
  { id: 'gemini-vision',          label: 'Gemini Vision',    sub: '呼叫 Vision API',    icon: 'icons/http-request.svg', type: 'HTTP Request',                  category: 'http',    x: 1476, y: 60  },
  { id: 'parse-gemini',           label: '解析Gemini回傳',   sub: '清除 markdown',     icon: 'icons/code.svg',         type: 'Code',                          category: 'code',    x: 1716, y: 60  },
  { id: 'clean-text',             label: '清理文字輸出',     sub: '清除 markdown',     icon: 'icons/code.svg',         type: 'Code',                          category: 'code',    x: 1428, y: 300 },
  { id: 'if-node',                label: 'If',                sub: '記帳 / 查詢分流',    icon: 'icons/if.svg',           type: 'If',                            category: 'router',  x: 1980, y: 180 },
  { id: 'handle-record',          label: '處理記帳',         sub: '組 rows + reply',   icon: 'icons/code.svg',         type: 'Code',                          category: 'code',    x: 2244, y: 60  },
  { id: 'get-rows',                label: '讀取Sheet',        sub: '讀全部歷史紀錄',     icon: 'icons/google-sheets.svg', type: 'Google Sheets',                 category: 'sheets',  x: 2244, y: 324 },
  { id: 'handle-query',           label: '處理查詢',         sub: '分類統計 + 分析',    icon: 'icons/code.svg',         type: 'Code',                          category: 'code',    x: 2484, y: 324 },
  { id: 'write-sheet',            label: '寫入Sheet',        sub: '直打 Sheets API',    icon: 'icons/http-request.svg', type: 'HTTP Request',                  category: 'http',    x: 2484, y: 60  },
  { id: 'send-line-record',        label: '送出LINE',        sub: '記帳結果回覆',       icon: 'icons/code.svg',         type: 'Code',                          category: 'code',    x: 2724, y: 60  },
  { id: 'send-line-query',         label: '送出LINE1',       sub: '查詢結果回覆',       icon: 'icons/code.svg',         type: 'Code',                          category: 'code',    x: 2724, y: 324 },
  { id: 'gemma4',                  label: 'Gemma 4',          sub: '⚠️ 未連接，可刪除', icon: 'icons/openai.svg',      type: 'OpenAI Chat Model（未使用）',    category: 'unused',  x: 492,  y: 660 },
];

const DIAGRAM_EDGES = [
  { from: 'webhook', to: 'switch' },
  { from: 'switch', to: 'get-image', label: 'image' },
  { from: 'switch', to: 'add-date', label: 'text' },
  { from: 'get-image', to: 'to-base64' },
  { from: 'to-base64', to: 'build-gemini-request' },
  { from: 'build-gemini-request', to: 'gemini-vision' },
  { from: 'gemini-vision', to: 'parse-gemini' },
  { from: 'parse-gemini', to: 'if-node', label: 'image' },
  { from: 'add-date', to: 'ai-agent' },
  { from: 'gemini-chat-model', to: 'ai-agent', kind: 'model' },
  { from: 'ai-agent', to: 'clean-text' },
  { from: 'clean-text', to: 'if-node', label: 'text' },
  { from: 'if-node', to: 'handle-record', label: 'true' },
  { from: 'if-node', to: 'get-rows', label: 'false' },
  { from: 'handle-record', to: 'write-sheet' },
  { from: 'write-sheet', to: 'send-line-record' },
  { from: 'get-rows', to: 'handle-query' },
  { from: 'handle-query', to: 'send-line-query' },
];

// 節點寬高（diagram 座標系統內，會隨容器一起縮放）
const DIAGRAM_NODE_SIZE = { w: 168, h: 76 };
const DIAGRAM_VIEWBOX = { w: 3000, h: 800 };
