/**
 * AI Prompt ครูไทย — Chatbot Widget ("น้องครูพร้อม AI")
 * chatbot.js
 * 
 * Features:
 * 1. Floating Action Button (FAB) at bottom-right
 * 2. Modern Interactive Chat Window with Quick Suggestions
 * 3. Direct integration with Google Gemini Flash API (gemini-3.5-flash / gemini-3.8-flash / gemini-2.5-flash)
 * 4. Local Intelligent Fallback & Prompt Matcher (works 100% free even without API Key)
 * 5. Interactive Prompt Cards inside messages (Direct Copy & View Modal)
 * 6. API Key customization popup for personal keys
 */

'use strict';

const chatbotState = {
  isOpen: false,
  messages: [],
  isThinking: false,
  apiKey: '',
  storageKey: 'ai_kruthai_chatbot_history',
  apiKeyStorageKey: 'ai_kruthai_gemini_api_key',
  unreadCount: 0
};

/* ─────────────────────────────────────────────
   INITIALIZATION
───────────────────────────────────────────── */
function initChatbot() {
  if (typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.enabled === false) {
    return;
  }

  // Load custom API key if saved
  const savedKey = localStorage.getItem(chatbotState.apiKeyStorageKey);
  if (savedKey) {
    chatbotState.apiKey = savedKey;
  } else if (typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.apiKey) {
    chatbotState.apiKey = CHATBOT_CONFIG.apiKey;
  }

  // Load chat history or welcome message
  loadChatHistory();

  // Render widget DOM
  renderChatbotDOM();

  // Setup events
  setupChatbotEvents();
}

/* ─────────────────────────────────────────────
   CHAT HISTORY MANAGEMENT
───────────────────────────────────────────── */
function loadChatHistory() {
  try {
    const raw = localStorage.getItem(chatbotState.storageKey);
    if (raw) {
      chatbotState.messages = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Chatbot] Failed to load history:', e);
  }

  if (!chatbotState.messages || chatbotState.messages.length === 0) {
    const botName = (typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.botName) || 'น้องครูพร้อม';
    chatbotState.messages = [
      {
        sender: 'bot',
        text: `สวัสดีครับคุณครู! ผม **${botName}** ผู้ช่วยอัจฉริยะประจำคลัง AI Prompt ครูไทยครับ 🎓✨\n\nผมพร้อมช่วยคุณครูค้นหา ออกแบบ ปรับแต่ง Prompt สำหรับการสอน ออกข้อสอบ งานเอกสาร วPA หรือวิจัยในชั้นเรียน สามารถสอบถามหรือคลิกเลือกหัวข้อแนะนำด้านล่างได้เลยครับ!`,
        timestamp: new Date().toISOString(),
        prompts: ['b1_1_1']
      }
    ];
    saveChatHistory();
  }
}

function saveChatHistory() {
  try {
    const trimmed = chatbotState.messages.slice(-30);
    localStorage.setItem(chatbotState.storageKey, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[Chatbot] Failed to save history:', e);
  }
}

function clearChatHistory() {
  if (confirm('คุณครูต้องการล้างประวัติการสนทนาทั้งหมดใช่หรือไม่?')) {
    localStorage.removeItem(chatbotState.storageKey);
    chatbotState.messages = [];
    loadChatHistory();
    renderChatMessages();
  }
}

/* ─────────────────────────────────────────────
   DOM CREATION & RENDERING
───────────────────────────────────────────── */
function renderChatbotDOM() {
  if (document.getElementById('chatbot-widget-container')) return;

  const botName = (typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.botName) || 'น้องครูพร้อม';
  const botSubtitle = (typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.botSubtitle) || 'ผู้ช่วย AI คลัง Prompt ครูไทย';
  const avatar = (typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.avatarEmoji) || '🤖';

  const container = document.createElement('div');
  container.id = 'chatbot-widget-container';
  container.className = 'chatbot-widget-container';

  container.innerHTML = `
    <!-- Floating Action Button (FAB) -->
    <button id="chatbot-fab" class="chatbot-fab" aria-label="เปิดผู้ช่วย AI น้องครูพร้อม" title="แชทกับน้องครูพร้อม AI">
      <span class="fab-avatar">${avatar}</span>
      <span class="fab-pulse"></span>
      <span id="chatbot-fab-badge" class="chatbot-fab-badge hidden">1</span>
    </button>

    <!-- Chatbot Window -->
    <div id="chatbot-window" class="chatbot-window hidden" role="dialog" aria-labelledby="chatbot-title">
      <!-- Header -->
      <div class="chatbot-header">
        <div class="chatbot-header-left">
          <div class="chatbot-avatar-wrap">
            <span class="chatbot-avatar">${avatar}</span>
            <span class="chatbot-status-dot online"></span>
          </div>
          <div class="chatbot-title-wrap">
            <div id="chatbot-title" class="chatbot-title">${botName} <span class="ai-pill">Gemini AI</span></div>
            <div class="chatbot-subtitle">${botSubtitle}</div>
          </div>
        </div>
        <div class="chatbot-header-actions">
          <button id="chatbot-settings-btn" class="chatbot-action-btn" title="ตั้งค่า API Key">⚙️</button>
          <button id="chatbot-clear-btn" class="chatbot-action-btn" title="ล้างการสนทนา">🗑️</button>
          <button id="chatbot-close-btn" class="chatbot-action-btn close" title="ปิดหน้าต่างแชท">✕</button>
        </div>
      </div>

      <!-- Settings Dropdown / Panel -->
      <div id="chatbot-settings-panel" class="chatbot-settings-panel hidden">
        <div class="settings-panel-header">
          <strong>⚙️ ตั้งค่า Google Gemini API</strong>
          <button id="chatbot-settings-close" class="settings-panel-close">✕</button>
        </div>
        <p class="settings-hint">
          ระบบพร้อมใช้งานฟรีทันทีผ่านโหมดอัจฉริยะ (Local Assistant) หรือสามารถใส่ 
          <a href="https://aistudio.google.com/" target="_blank" rel="noopener">Google AI Studio API Key (ฟรี)</a> 
          เพื่อความฉลาดในการตอบขั้นสูงสุด:
        </p>
        <div class="settings-input-row">
          <input type="password" id="chatbot-apikey-input" placeholder="AIzaSy..." value="${chatbotState.apiKey || ''}" autocomplete="off" />
          <button id="chatbot-apikey-save" class="btn-primary-sm">บันทึก</button>
        </div>
        <div class="settings-model-badge">โมเดลที่ใช้งาน: <code>${(typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.model) || 'gemini-3.5-flash'}</code> (Free Tier)</div>
      </div>

      <!-- Messages Body -->
      <div id="chatbot-messages" class="chatbot-messages">
        <!-- Rendered dynamically -->
      </div>

      <!-- Quick Suggestion Chips -->
      <div id="chatbot-quick-chips" class="chatbot-quick-chips">
        <!-- Populated dynamically -->
      </div>

      <!-- Footer Input Area -->
      <div class="chatbot-footer">
        <textarea id="chatbot-input" class="chatbot-input" placeholder="พิมพ์คำถาม หรือปรึกษาการใช้ Prompt..." rows="1"></textarea>
        <button id="chatbot-send-btn" class="chatbot-send-btn" title="ส่งข้อความ" aria-label="ส่ง">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  renderChatMessages();
  renderQuickChips();
}

/* ─────────────────────────────────────────────
   RENDER MESSAGES
───────────────────────────────────────────── */
function renderChatMessages() {
  const container = document.getElementById('chatbot-messages');
  if (!container) return;

  container.innerHTML = '';

  chatbotState.messages.forEach((msg, index) => {
    const isBot = msg.sender === 'bot';
    const row = document.createElement('div');
    row.className = `chat-msg-row ${isBot ? 'bot-row' : 'user-row'}`;

    let html = '';
    if (isBot) {
      html += `<div class="msg-avatar">🤖</div>`;
    }

    html += `<div class="msg-bubble ${isBot ? 'bot-bubble' : 'user-bubble'}">`;
    html += formatChatMessageText(msg.text);

    // If message includes recommended prompt cards
    if (msg.prompts && msg.prompts.length > 0 && typeof PROMPTS_DATA !== 'undefined') {
      html += `<div class="msg-prompt-cards">`;
      msg.prompts.forEach(pId => {
        const p = PROMPTS_DATA.find(x => x.id === pId);
        if (p) {
          html += `
            <div class="msg-prompt-card book-${p.book}">
              <div class="mpc-top">
                <span class="mpc-badge book${p.book}">เล่ม ${p.book}</span>
                <span class="mpc-num">${p.promptNum}</span>
                <span class="mpc-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</span>
              </div>
              <div class="mpc-actions">
                <button class="mpc-btn view" onclick="openPromptModal('${p.id}')">🔍 ดูเนื้อหา</button>
                <button class="mpc-btn copy" onclick="copyPromptFromChat('${p.id}', this)">📋 คัดลอก</button>
              </div>
            </div>
          `;
        }
      });
      html += `</div>`;
    }

    html += `<div class="msg-time">${formatTime(msg.timestamp)}</div>`;
    html += `</div>`;

    row.innerHTML = html;
    container.appendChild(row);
  });

  if (chatbotState.isThinking) {
    const thinkingRow = document.createElement('div');
    thinkingRow.className = 'chat-msg-row bot-row thinking-row';
    thinkingRow.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-bubble bot-bubble thinking-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    container.appendChild(thinkingRow);
  }

  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 50);
}

function renderQuickChips() {
  const chipsContainer = document.getElementById('chatbot-quick-chips');
  if (!chipsContainer) return;

  const quickPrompts = (typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.quickPrompts) || [
    '💡 ออกแบบแผนการสอน Active Learning',
    '📝 ขอตัวอย่างข้อสอบคิดวิเคราะห์ (HOTS)',
    '📋 ช่วยร่างข้อตกลง วPA ด้านที่ 1',
    '🔬 แนะนำ Prompt ทำวิจัยในชั้นเรียน',
    '✨ ขอ Prompt Master Context ตั้งต้น'
  ];

  chipsContainer.innerHTML = '';
  quickPrompts.forEach(text => {
    const chip = document.createElement('button');
    chip.className = 'chatbot-chip';
    chip.textContent = text;
    chip.onclick = () => {
      sendChatMessage(text);
    };
    chipsContainer.appendChild(chip);
  });
}

/* ─────────────────────────────────────────────
   EVENTS & INTERACTIONS
───────────────────────────────────────────── */
function setupChatbotEvents() {
  const fab = document.getElementById('chatbot-fab');
  const win = document.getElementById('chatbot-window');
  const closeBtn = document.getElementById('chatbot-close-btn');
  const clearBtn = document.getElementById('chatbot-clear-btn');
  const settingsBtn = document.getElementById('chatbot-settings-btn');
  const settingsPanel = document.getElementById('chatbot-settings-panel');
  const settingsClose = document.getElementById('chatbot-settings-close');
  const apiKeySave = document.getElementById('chatbot-apikey-save');
  const input = document.getElementById('chatbot-input');
  const sendBtn = document.getElementById('chatbot-send-btn');

  fab?.addEventListener('click', toggleChatbot);
  closeBtn?.addEventListener('click', () => toggleChatbot(false));

  clearBtn?.addEventListener('click', clearChatHistory);

  settingsBtn?.addEventListener('click', () => {
    settingsPanel?.classList.toggle('hidden');
  });
  settingsClose?.addEventListener('click', () => {
    settingsPanel?.classList.add('hidden');
  });

  apiKeySave?.addEventListener('click', () => {
    const keyVal = document.getElementById('chatbot-apikey-input')?.value.trim();
    chatbotState.apiKey = keyVal;
    if (keyVal) {
      localStorage.setItem(chatbotState.apiKeyStorageKey, keyVal);
      if (typeof showToast === 'function') showToast('บันทึก Google Gemini API Key เรียบร้อยแล้วครับ!', 'success');
    } else {
      localStorage.removeItem(chatbotState.apiKeyStorageKey);
      if (typeof showToast === 'function') showToast('เปลี่ยนเป็นโหมด Local Assistant อัจฉริยะแล้ว', 'info');
    }
    settingsPanel?.classList.add('hidden');
  });

  sendBtn?.addEventListener('click', () => {
    const text = input.value.trim();
    if (text) {
      sendChatMessage(text);
      input.value = '';
      adjustTextareaHeight(input);
    }
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.value.trim();
      if (text) {
        sendChatMessage(text);
        input.value = '';
        adjustTextareaHeight(input);
      }
    }
  });

  input?.addEventListener('input', () => {
    adjustTextareaHeight(input);
  });
}

function toggleChatbot(forceState) {
  const win = document.getElementById('chatbot-window');
  const fabBadge = document.getElementById('chatbot-fab-badge');
  if (!win) return;

  const nextState = typeof forceState === 'boolean' ? forceState : !chatbotState.isOpen;
  chatbotState.isOpen = nextState;

  if (nextState) {
    win.classList.remove('hidden');
    chatbotState.unreadCount = 0;
    if (fabBadge) fabBadge.classList.add('hidden');
    setTimeout(() => {
      document.getElementById('chatbot-input')?.focus();
      const container = document.getElementById('chatbot-messages');
      if (container) container.scrollTop = container.scrollHeight;
    }, 100);
  } else {
    win.classList.add('hidden');
  }
}

function adjustTextareaHeight(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/* ─────────────────────────────────────────────
   SEND & PROCESS MESSAGE
───────────────────────────────────────────── */
async function sendChatMessage(userText) {
  if (!userText || chatbotState.isThinking) return;

  chatbotState.messages.push({
    sender: 'user',
    text: userText,
    timestamp: new Date().toISOString()
  });

  chatbotState.isThinking = true;
  renderChatMessages();

  try {
    let botResponse = null;

    if (chatbotState.apiKey) {
      try {
        botResponse = await callGeminiAPI(userText);
      } catch (apiErr) {
        console.warn('[Chatbot] Gemini API call failed, falling back to local engine:', apiErr);
        botResponse = processLocalAssistant(userText, true);
      }
    } else {
      await new Promise(r => setTimeout(r, 500));
      botResponse = processLocalAssistant(userText, false);
    }

    chatbotState.messages.push({
      sender: 'bot',
      text: botResponse.text,
      prompts: botResponse.prompts || [],
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Chatbot] Processing error:', err);
    chatbotState.messages.push({
      sender: 'bot',
      text: 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล คุณครูสามารถลองพิมพ์ใหม่อีกครั้ง หรือเลือกใช้เมนูค้นหาของเว็บได้เลยครับ',
      timestamp: new Date().toISOString()
    });
  } finally {
    chatbotState.isThinking = false;
    saveChatHistory();
    renderChatMessages();
  }
}

/* ─────────────────────────────────────────────
   GEMINI FLASH API INTEGRATION (FREE TIER)
───────────────────────────────────────────── */
async function callGeminiAPI(userPrompt) {
  const model = (typeof CHATBOT_CONFIG !== 'undefined' && CHATBOT_CONFIG.model) || 'gemini-3.5-flash';
  const apiKey = chatbotState.apiKey;

  const systemInstruction = `
คุณคือ "น้องครูพร้อม" ผู้ช่วย AI ประจำเว็บไซต์ "คลัง AI Prompt ครูไทย" (ai-prompt-kruthai)
บทบาทของคุณคือให้คำปรึกษา คำแนะนำ และช่วยเหลือคุณครูไทยในการประยุกต์ใช้ AI ในการจัดการเรียนการสอน

ข้อมูลโครงสร้างคลัง Prompt ของเว็บไซต์ (ทั้งหมด 331 รายการ ใน 3 เล่ม):
- เล่ม 1: AI Prompt ครูไทย: ลดงานสอน (การออกแบบแผนจัดการเรียนรู้, สื่อใบงาน, Active Learning, สื่อดิจิทัล)
- เล่ม 2: AI Prompt วัดผลผู้เรียน (Bloom's Taxonomy, ข้อสอบ HOTS, แบบประเมิน Rubric, วิเคราะห์คะแนน, แผนซ่อมเสริม)
- เล่ม 3: AI Prompt งานเอกสารครู (หนังสือราชการ, รายงานโครงการ, วิจัยในชั้นเรียน CAR, ข้อตกลง วPA, SAR, Portfolio & PLC)
- มี Master Context Prompt รหัส b1_1_1 ที่แนะนำให้ใช้ตั้งต้นทุก Session

คำแนะนำในการตอบ:
1. ตอบด้วยภาษาไทยที่สุภาพ เป็นกันเอง มีมารยาท ให้เกียรติครู และเข้าใจบริบทการศึกษาไทย
2. แนะนำแนวทางที่เป็นรูปธรรม ใช้งานได้จริงในห้องเรียนไทย
3. หากคำถามเกี่ยวข้องกับ Prompt ในคลัง ให้ระบุรหัส Prompt ในรูปแบบ [PROMPT:รหัส] เช่น [PROMPT:b1_1_1] หรือ [PROMPT:b1_2_1] หรือ [PROMPT:b2_2_1] หรือ [PROMPT:b3_4_1] เพื่อให้ระบบแสดงการ์ด Prompt ให้คุณครูกดคัดลอกได้ทันที
4. กระชับ ชัดเจน และจัดรูปแบบด้วยหัวข้อย่อยให้อ่านง่าย
`;

  const contents = [];
  const recentMsgs = chatbotState.messages.slice(-6);

  recentMsgs.forEach(m => {
    contents.push({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    });
  });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'ขออภัยครับ ไม่ได้รับข้อความตอบกลับจากระบบ AI';

  const promptRegex = /\[PROMPT:([a-zA-Z0-9_]+)\]/g;
  const matchedPrompts = [];
  let cleanText = rawText.replace(promptRegex, (match, pId) => {
    matchedPrompts.push(pId);
    return '';
  });

  return {
    text: cleanText.trim(),
    prompts: matchedPrompts
  };
}

/* ─────────────────────────────────────────────
   LOCAL INTELLIGENT ASSISTANT (100% FREE / NO KEY)
───────────────────────────────────────────── */
function processLocalAssistant(query, wasFallback = false) {
  const q = query.toLowerCase();
  let text = '';
  let matchedPromptIds = [];

  // 0. Website Usage / How to use website
  if (q.includes('เริ่มใช้งาน') || q.includes('วิธีใช้') || q.includes('ใช้งานยังไง') || q.includes('ใช้ยังไง') || q.includes('ทำยังไง') || q.includes('คู่มือ') || q.includes('สอนใช้') || q.includes('แนะนำเว็บ') || q.includes('สมัคร')) {
    text = `📖 **วิธีใช้งานเว็บไซต์ AI Prompt ครูไทย ให้เกิดประโยชน์สูงสุด:**\n\n` +
           `1. **เริ่มต้นด้วย Master Context (เล่ม 1.1):** คัดลอก Prompt บริบทตั้งต้นนี้ไปวางใน AI (Claude, ChatGPT หรือ Gemini) เป็นข้อความแรกเพื่อกำหนดวิชา ชั้นเรียน และบริบทโรงเรียน\n` +
           `2. **เลือกค้นหา Prompt ตามหมวดงาน:**\n` +
           `   • 📗 **เล่ม 1 (งานสอน):** แผนการสอน, สื่อใบงาน, Active Learning\n` +
           `   • 📘 **เล่ม 2 (วัดผล):** ข้อสอบ HOTS, รูบริก (Rubric), ซ่อมเสริม\n` +
           `   • 📙 **เล่ม 3 (เอกสาร):** วPA, วิจัยในชั้นเรียน (CAR), SAR\n` +
           `3. **คัดลอกและนำไปใช้:** กดปุ่ม **"📋 คัดลอก"** หรือเปิดดูรายละเอียดแล้วแทนที่ข้อความในวงเล็บ \`[...]\` ด้วยข้อมูลจริงของห้องเรียนคุณครู\n` +
           `4. **สมัครสมาชิกฟรี:** เพื่อบันทึกรายการโปรด ⭐ ดูสถิติการใช้งานส่วนตัว 📊 และร่วมแสดงความคิดเห็นในชุมชนครูครับ!`;
    matchedPromptIds = ['b1_1_1', 'b1_2_1', 'b2_2_1'];
  }
  else if (q.includes('master') || q.includes('บริบท') || q.includes('ตั้งต้น') || q.includes('เริ่มต้น')) {
    text = `✨ **Prompt Master Context (บริบทตั้งต้น)** เป็นหัวใจสำคัญที่สุดในการใช้งาน AI สำหรับครูไทยครับ! 
ช่วยให้ AI เข้าใจวิชา ระดับชั้น บริบทโรงเรียน และลักษณะผู้เรียนของคุณครูก่อนเริ่มสั่งงานในแต่ละคาบ`;
    matchedPromptIds = ['b1_1_1', 'b1_1_2'];
  }
  else if (q.includes('แผน') || q.includes('active learning') || q.includes('สอน') || q.includes('กิจกรรม')) {
    text = `📚 สำหรับ **การออกแบบแผนการจัดการเรียนรู้และ Active Learning** ในเล่ม 1 มีชุด Prompt ครอบคลุมตั้งแต่การเขียนแผน 5 ขั้น, เทคนิค Game-based, การตั้งคำถามกระตุ้นความคิด ไปจนถึงใบงานสร้างสรรค์ครับ:`;
    matchedPromptIds = findPromptsByKeywords(['Active Learning', 'แผนการสอน', 'แผนการจัดการเรียนรู้', 'กิจกรรม'], 3);
    if (matchedPromptIds.length === 0) matchedPromptIds = ['b1_2_1', 'b1_4_1', 'b1_3_1'];
  }
  else if (q.includes('ข้อสอบ') || q.includes('hots') || q.includes('วัดผล') || q.includes('rubric') || q.includes('รูบริก') || q.includes('ประเมิน')) {
    text = `🎯 สำหรับ **การออกข้อสอบคิดวิเคราะห์ (HOTS) และแบบประเมิน Rubric** ในเล่ม 2 ได้จัดโครงสร้างตาม Bloom's Taxonomy ช่วยให้ครูออกข้อสอบสถานการณ์และเกณฑ์การให้คะแนนได้อย่างแม่นยำครับ:`;
    matchedPromptIds = findPromptsByKeywords(['HOTS', 'ข้อสอบ', 'Rubric', 'วัดผล'], 3);
    if (matchedPromptIds.length === 0) matchedPromptIds = ['b2_2_1', 'b2_3_1', 'b2_1_1'];
  }
  else if (q.includes('วpa') || q.includes('pa') || q.includes('พัฒนางาน') || q.includes('วิทยฐานะ')) {
    text = `📋 ในส่วนของ **วPA (ข้อตกลงในการพัฒนางาน)** ในเล่ม 3 บทที่ 4 มี Prompt ช่วยร่างทั้ง 3 ด้าน (การจัดการเรียนรู้, การส่งเสริมสนับสนุน, และการพัฒนาตนเอง) รวมถึงประเด็นท้าทาย:`;
    matchedPromptIds = ['b3_4_1', 'b3_4_2', 'b3_4_3'];
  }
  else if (q.includes('วิจัย') || q.includes('car') || q.includes('ปัญหาผู้เรียน')) {
    text = `🔬 สำหรับ **วิจัยในชั้นเรียน (Classroom Action Research - CAR)** ในเล่ม 3 บทที่ 3 ช่วยคุณครูตั้งแต่การตั้งโจทย์วิจัยจากปัญหาจริงในคาบเรียน การออกแบบนวัตกรรม ไปจนถึงการเขียนรายงาน 5 บทครับ:`;
    matchedPromptIds = ['b3_3_1', 'b3_3_2', 'b3_3_3'];
  }
  else if (q.includes('sar') || q.includes('รายงาน') || q.includes('หนังสือราชการ') || q.includes('โครงการ')) {
    text = `📁 สำหรับ **งานเอกสารราชการ รายงานโครงการ และ SAR** สามารถใช้ชุดคำสั่งจากเล่ม 3 ช่วยร่างหนังสือราชการตามระเบียบสารบรรณ และสรุปเล่มโครงการได้อย่างรวดเร็วครับ:`;
    matchedPromptIds = ['b3_1_1', 'b3_2_1', 'b3_5_1'];
  }
  else {
    const results = searchPromptsLocally(q, 3);
    if (results.length > 0) {
      text = `🔎 น้องครูพร้อมค้นพบ **Prompt ที่เกี่ยวข้องกับ "${escapeHtml(query)}"** ในคลัง 331 รายการ ดังนี้ครับ คุณครูสามารถคลิกดูเนื้อหาหรือคัดลอกไปใช้ได้ทันที:`;
      matchedPromptIds = results.map(p => p.id);
    } else {
      text = `น้องครูพร้อมยินดีให้คำปรึกษาครับ! คุณครูสามารถสอบถามเรื่อง **แผนการสอน, Active Learning, ข้อสอบ HOTS, แบบประเมิน Rubric, วิจัยในชั้นเรียน CAR หรือ วPA** ได้เลยครับ หรือเลือกหัวข้อแนะนำด้านล่างได้ทันทีครับ 😊`;
      matchedPromptIds = ['b1_1_1'];
    }
  }

  if (wasFallback) {
    text += `\n\n*(หมายเหตุ: ระบบกำลังแสดงผลผ่านโหมด Local Assistant อัจฉริยะ คุณครูสามารถตรวจเช็ค API Key ในไอคอน ⚙️ ด้านบนได้ตลอดเวลาครับ)*`;
  }

  return {
    text: text,
    prompts: matchedPromptIds
  };
}

function findPromptsByKeywords(keywords, maxCount = 3) {
  if (typeof PROMPTS_DATA === 'undefined') return [];
  const results = [];

  for (const p of PROMPTS_DATA) {
    const combined = `${p.title} ${p.tags?.join(' ')} ${p.content}`.toLowerCase();
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) {
        results.push(p.id);
        break;
      }
    }
    if (results.length >= maxCount) break;
  }
  return results;
}

function searchPromptsLocally(query, limit = 3) {
  if (typeof PROMPTS_DATA === 'undefined') return [];
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return PROMPTS_DATA.filter(p => {
    return (
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      (p.content && p.content.toLowerCase().includes(q))
    );
  }).slice(0, limit);
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function copyPromptFromChat(promptId, btnEl) {
  if (typeof copyPrompt === 'function') {
    copyPrompt(promptId);
    if (btnEl) {
      const orig = btnEl.textContent;
      btnEl.textContent = '✅ คัดลอกแล้ว!';
      btnEl.classList.add('copied');
      setTimeout(() => {
        btnEl.textContent = orig;
        btnEl.classList.remove('copied');
      }, 2000);
    }
  }
}

function formatChatMessageText(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);

  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  escaped = escaped.replace(/\n/g, '<br>');

  return escaped;
}

function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatbot);
} else {
  initChatbot();
}

window.initChatbot = initChatbot;
window.toggleChatbot = toggleChatbot;
window.copyPromptFromChat = copyPromptFromChat;
window.sendChatMessage = sendChatMessage;
