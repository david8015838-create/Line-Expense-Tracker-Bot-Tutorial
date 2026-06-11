// 互動架構圖資料：節點位置依照真實 n8n workflow JSON 的 position 正規化而來，
// 視覺上盡量還原「打開這個 workflow 時看到的樣子」。
// category 對應 style.css 裡 .diagram-node--xxx 的配色。

const DIAGRAM_NODES = [
  { id: 'webhook',              label: 'Webhook',          sub: '接收 LINE 訊息',     icon: '📥', type: 'Webhook',                       category: 'trigger', x: 40,   y: 40  },
  { id: 'switch',                label: 'Switch',           sub: '圖片／文字分流',     icon: '🔀', type: 'Switch',                        category: 'router',  x: 200,  y: 40  },
  { id: 'get-image',             label: '取得圖片',         sub: '下載 LINE 圖片',     icon: '🖼️', type: 'HTTP Request',                  category: 'http',    x: 456,  y: 40  },
  { id: 'add-date',              label: '加入日期',         sub: '注入今日日期/時間', icon: '📅', type: 'Code',                          category: 'code',    x: 456,  y: 200 },
  { id: 'ai-agent',               label: 'AI Agent',         sub: '理解語意 → JSON',    icon: '🤖', type: 'AI Agent',                      category: 'ai',      x: 648,  y: 200 },
  { id: 'gemini-chat-model',      label: 'Gemini Chat Model', sub: 'AI Agent 的語言模型', icon: '✨', type: 'Google Gemini Chat Model',     category: 'ai-model', x: 616, y: 440 },
  { id: 'to-base64',              label: '轉base64',         sub: '圖片轉 base64',     icon: '🔢', type: 'Code',                          category: 'code',    x: 616,  y: 40  },
  { id: 'build-gemini-request',   label: '組合Gemini請求',   sub: '組裝 Vision 請求',   icon: '📦', type: 'Code',                          category: 'code',    x: 824,  y: 40  },
  { id: 'gemini-vision',          label: 'Gemini Vision',    sub: '呼叫 Vision API',    icon: '👁️', type: 'HTTP Request',                  category: 'http',    x: 984,  y: 40  },
  { id: 'parse-gemini',           label: '解析Gemini回傳',   sub: '清除 markdown',     icon: '🧹', type: 'Code',                          category: 'code',    x: 1144, y: 40  },
  { id: 'clean-text',             label: '清理文字輸出',     sub: '清除 markdown',     icon: '🧹', type: 'Code',                          category: 'code',    x: 952,  y: 200 },
  { id: 'if-node',                label: 'If',                sub: '記帳 / 查詢分流',    icon: '🔱', type: 'If',                            category: 'router',  x: 1320, y: 120 },
  { id: 'handle-record',          label: '處理記帳',         sub: '組 rows + reply',   icon: '📝', type: 'Code',                          category: 'code',    x: 1496, y: 40  },
  { id: 'get-rows',                label: '讀取Sheet',        sub: '讀全部歷史紀錄',     icon: '📊', type: 'Google Sheets',                 category: 'sheets',  x: 1496, y: 216 },
  { id: 'handle-query',           label: '處理查詢',         sub: '分類統計 + 分析',    icon: '📈', type: 'Code',                          category: 'code',    x: 1656, y: 216 },
  { id: 'write-sheet',            label: '寫入Sheet',        sub: '直打 Sheets API',    icon: '💾', type: 'HTTP Request',                  category: 'http',    x: 1656, y: 40  },
  { id: 'send-line-record',        label: '送出LINE',        sub: '記帳結果回覆',       icon: '📤', type: 'Code',                          category: 'code',    x: 1816, y: 40  },
  { id: 'send-line-query',         label: '送出LINE1',       sub: '查詢結果回覆',       icon: '📤', type: 'Code',                          category: 'code',    x: 1816, y: 216 },
  { id: 'gemma4',                  label: 'Gemma 4',          sub: '⚠️ 未連接，可刪除', icon: '💤', type: 'OpenAI Chat Model（未使用）',    category: 'unused',  x: 328,  y: 440 },
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
const DIAGRAM_VIEWBOX = { w: 2000, h: 560 };
