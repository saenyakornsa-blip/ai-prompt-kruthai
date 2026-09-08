/**
 * AI Prompt ครูไทย — access.js
 * ระบบควบคุมการเข้าถึงตาม ACCESS_CONFIG.mode
 *
 * MODE A: open              - ทุกคนใช้ได้, สมาชิกได้ฟีเจอร์เพิ่ม
 * MODE B: copy_requires_login - ดู/ค้นหาฟรี, copy ต้องสมัคร
 * MODE C: login_required    - ต้องเข้าสู่ระบบก่อนทุกอย่าง
 */

'use strict';

/* ─────────────────────────────────────────────
   ACCESS STATE
───────────────────────────────────────────── */
const accessState = {
  copyCountToday: 0,
  copyCountKey: 'ai_kruthai_copy_count',
  copyDateKey: 'ai_kruthai_copy_date',
  welcomeShown: false,
};

/* ─────────────────────────────────────────────
   INIT ACCESS SYSTEM
───────────────────────────────────────────── */
function initAccessSystem() {
  const mode = (typeof ACCESS_CONFIG !== 'undefined') ? ACCESS_CONFIG.mode : 'open';

  // Load daily copy count
  loadDailyCopyCount();

  if (mode === 'login_required') {
    // MODE C: สร้าง overlay ทันที ถ้ายังไม่ login
    enforceLoginWall();
  }

  if (mode === 'copy_requires_login' || mode === 'open') {
    // แสดง welcome popup หลัง X วินาที (ถ้า user ยังไม่ login)
    const delay = ACCESS_CONFIG && ACCESS_CONFIG.welcomePopupDelay != null
      ? ACCESS_CONFIG.welcomePopupDelay : 8000;
    if (ACCESS_CONFIG && ACCESS_CONFIG.showWelcomePopup) {
      setTimeout(() => {
        if (!state.user && !accessState.welcomeShown) {
          showWelcomePopup();
        }
      }, delay);
    }
  }
}

/* ─────────────────────────────────────────────
   MODE C: LOGIN WALL — ปิดทั้งเว็บ
───────────────────────────────────────────── */
function enforceLoginWall() {
  if (state.user) {
    // ล็อกอินแล้ว — ถอด overlay ออก
    removeLoginWall();
    return;
  }

  // ถ้ายังไม่มี overlay ให้สร้าง
  if (document.getElementById('login-wall-overlay')) return;

  const cfg = ACCESS_CONFIG || {};
  const title = cfg.loginWallTitle || 'เข้าสู่ระบบเพื่อใช้งาน';
  const sub   = cfg.loginWallSubtitle || 'สมัครสมาชิกฟรีเพื่อเข้าถึง Prompts ทั้งหมด';

  const overlay = document.createElement('div');
  overlay.id = 'login-wall-overlay';
  overlay.innerHTML = `
    <div class="login-wall-inner">
      <div class="login-wall-logo">📚</div>
      <h1 class="login-wall-title">${title}</h1>
      <p class="login-wall-sub">${sub}</p>

      <div class="login-wall-features">
        <div class="lw-feature"><span>📋</span><span>331 AI Prompts สำหรับครู</span></div>
        <div class="lw-feature"><span>🔍</span><span>ค้นหาตามสถานการณ์</span></div>
        <div class="lw-feature"><span>📊</span><span>สถิติการใช้งานส่วนตัว</span></div>
        <div class="lw-feature"><span>⭐</span><span>บันทึกรายการโปรด</span></div>
        <div class="lw-feature"><span>🤖</span><span>เปิดตรงใน Claude / ChatGPT / Gemini</span></div>
        <div class="lw-feature"><span>🆓</span><span>ฟรีตลอด ไม่มีค่าใช้จ่าย</span></div>
      </div>

      <div class="login-wall-actions">
        <button class="btn-primary lw-btn" onclick="openAuthModal('signup')">
          🎉 สมัครสมาชิกฟรี
        </button>
        <button class="btn-secondary lw-btn" onclick="openAuthModal('login')">
          เข้าสู่ระบบ
        </button>
      </div>

      <p class="login-wall-hint">
        หรือถ้าต้องการ ทดลองใช้ก่อน
        <a href="#" onclick="previewMode(); return false;">ดูตัวอย่าง Prompts (จำกัด)</a>
      </p>
    </div>
  `;
  document.body.appendChild(overlay);

  // Intercept all interactive elements
  interceptInteractions();
}

function removeLoginWall() {
  const wall = document.getElementById('login-wall-overlay');
  if (wall) {
    wall.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => wall.remove(), 300);
  }
  restoreInteractions();
}

/* ─────────────────────────────────────────────
   MODE B: COPY GATE — copy ต้องสมัคร
───────────────────────────────────────────── */
function checkCopyAccess(promptId, onAllowed) {
  const mode = (typeof ACCESS_CONFIG !== 'undefined') ? ACCESS_CONFIG.mode : 'open';

  // MODE A: ทุกคนใช้ได้เลย
  if (mode === 'open') {
    onAllowed();
    return;
  }

  // ล็อกอินแล้ว: อนุญาตเสมอ
  if (state.user) {
    onAllowed();
    return;
  }

  // MODE C: ต้อง login ก่อน
  if (mode === 'login_required') {
    showCopyGateModal('ต้องเข้าสู่ระบบก่อน copy Prompt');
    return;
  }

  // MODE B: ตรวจ free copies
  const freeCopies = ACCESS_CONFIG && ACCESS_CONFIG.freeCopiesPerDay != null
    ? ACCESS_CONFIG.freeCopiesPerDay : 3;

  if (freeCopies === 0) {
    // ไม่มี free copies — ต้องสมัครก่อนเลย
    showCopyGateModal('สมัครสมาชิกฟรีเพื่อ copy Prompt');
    return;
  }

  if (accessState.copyCountToday < freeCopies) {
    // ยังมี free quota
    accessState.copyCountToday++;
    saveDailyCopyCount();
    onAllowed();

    // แสดง hint ว่าใกล้หมด
    const remaining = freeCopies - accessState.copyCountToday;
    if (remaining === 1) {
      showToast(`เหลือ copy ฟรี 1 ครั้ง — สมัครสมาชิกเพื่อใช้ไม่จำกัด`, 'info');
    } else if (remaining === 0) {
      setTimeout(() => showCopyGateModal('คุณใช้ copy ฟรีครบ ' + freeCopies + ' ครั้งแล้ว'), 1500);
    }
  } else {
    // หมด quota
    showCopyGateModal('คุณใช้ copy ฟรีครบ ' + freeCopies + ' ครั้งต่อวันแล้ว');
  }
}

/* ─────────────────────────────────────────────
   COPY GATE MODAL
───────────────────────────────────────────── */
function showCopyGateModal(reason) {
  const existing = document.getElementById('copy-gate-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'copy-gate-modal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal copy-gate-modal" onclick="event.stopPropagation()">
      <div class="copy-gate-icon">🔓</div>
      <h2 class="copy-gate-title">${reason}</h2>
      <p class="copy-gate-sub">
        สมัครสมาชิกฟรีเพื่อ copy Prompt ได้ไม่จำกัด<br/>
        พร้อมสถิติการใช้งาน รายการโปรด และอีกมากมาย
      </p>

      <div class="copy-gate-benefits">
        <span>✅ ใช้ได้ไม่จำกัด</span>
        <span>✅ บันทึกรายการโปรด</span>
        <span>✅ ดูสถิติของตัวเอง</span>
        <span>✅ ฟรีตลอดชีพ</span>
      </div>

      <div class="copy-gate-actions">
        <button class="btn-primary" onclick="closeCopyGate(); openAuthModal('signup')">
          🎉 สมัครสมาชิกฟรี
        </button>
        <button class="btn-secondary" onclick="closeCopyGate(); openAuthModal('login')">
          มีบัญชีแล้ว เข้าสู่ระบบ
        </button>
        <button class="btn-text" onclick="closeCopyGate()">
          ปิด
        </button>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCopyGate();
  });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function closeCopyGate() {
  const el = document.getElementById('copy-gate-modal-overlay');
  if (el) el.remove();
}

/* ─────────────────────────────────────────────
   WELCOME POPUP (non-intrusive)
───────────────────────────────────────────── */
function showWelcomePopup() {
  if (state.user) return;
  if (document.getElementById('welcome-popup')) return;
  accessState.welcomeShown = true;

  const popup = document.createElement('div');
  popup.id = 'welcome-popup';
  popup.innerHTML = `
    <button class="welcome-close" onclick="document.getElementById('welcome-popup').remove()">✕</button>
    <div class="welcome-icon">👋</div>
    <div class="welcome-content">
      <strong>สวัสดีคุณครู!</strong>
      <p>สมัครสมาชิกฟรีเพื่อ copy ได้ไม่จำกัด<br/>พร้อมบันทึก Prompt โปรดและดูสถิติ</p>
    </div>
    <div class="welcome-actions">
      <button class="btn-primary sm" onclick="document.getElementById('welcome-popup').remove(); openAuthModal('signup')">
        สมัครฟรี
      </button>
      <button class="btn-text sm" onclick="document.getElementById('welcome-popup').remove()">
        ภายหลัง
      </button>
    </div>
  `;
  document.body.appendChild(popup);
  setTimeout(() => popup.classList.add('show'), 100);
}

/* ─────────────────────────────────────────────
   PREVIEW MODE (สำหรับ mode C)
   ให้ดูได้บางส่วน โดยไม่ต้องสมัคร
───────────────────────────────────────────── */
function previewMode() {
  const wall = document.getElementById('login-wall-overlay');
  if (wall) {
    wall.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => wall.remove(), 300);
  }
  // Flag preview mode
  sessionStorage.setItem('preview_mode', '1');
  showToast('กำลังดู 10 Prompts ตัวอย่าง — สมัครสมาชิกเพื่อดูทั้งหมด', 'info');
  // Limit to 10 prompts in preview
  state.previewMode = true;
}

/* ─────────────────────────────────────────────
   INTERCEPT INTERACTIONS (mode C)
───────────────────────────────────────────── */
function interceptInteractions() {
  const searchInput = document.getElementById('search-input');
  if (searchInput && !state.user) {
    searchInput.addEventListener('focus', redirectToLogin, { once: false });
  }
}

function restoreInteractions() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.removeEventListener('focus', redirectToLogin);
  }
}

function redirectToLogin() {
  if (!state.user) {
    openAuthModal('login');
  }
}

/* ─────────────────────────────────────────────
   DAILY COPY COUNT (localStorage)
───────────────────────────────────────────── */
function loadDailyCopyCount() {
  try {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(accessState.copyDateKey);
    if (savedDate === today) {
      accessState.copyCountToday = parseInt(localStorage.getItem(accessState.copyCountKey) || '0', 10);
    } else {
      // New day — reset
      accessState.copyCountToday = 0;
      localStorage.setItem(accessState.copyDateKey, today);
      localStorage.setItem(accessState.copyCountKey, '0');
    }
  } catch {}
}

function saveDailyCopyCount() {
  try {
    localStorage.setItem(accessState.copyCountKey, String(accessState.copyCountToday));
  } catch {}
}

/* ─────────────────────────────────────────────
   CALLED AFTER LOGIN SUCCESS
───────────────────────────────────────────── */
function onUserLoggedIn(user) {
  removeLoginWall();
  closeCopyGate();
  const wp = document.getElementById('welcome-popup');
  if (wp) wp.remove();
  state.previewMode = false;
}

/* ─────────────────────────────────────────────
   ACCESS INDICATOR (top bar)
   แสดงสถานะ guest copy quota
───────────────────────────────────────────── */
function updateAccessIndicator() {
  const mode = (typeof ACCESS_CONFIG !== 'undefined') ? ACCESS_CONFIG.mode : 'open';
  if (mode !== 'copy_requires_login') return;
  if (state.user) return;

  const freeCopies = ACCESS_CONFIG && ACCESS_CONFIG.freeCopiesPerDay != null
    ? ACCESS_CONFIG.freeCopiesPerDay : 3;
  if (freeCopies === 0) return;

  const remaining = Math.max(0, freeCopies - accessState.copyCountToday);
  let indicator = document.getElementById('copy-quota-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'copy-quota-indicator';
    const header = document.getElementById('main-header');
    if (header) header.insertAdjacentElement('afterend', indicator);
  }
  indicator.innerHTML = `
    <span>📋 copy ฟรีวันนี้: <strong>${remaining}/${freeCopies}</strong> ครั้ง</span>
    <button onclick="openAuthModal('signup')">สมัครฟรีเพื่อใช้ไม่จำกัด →</button>
  `;
  indicator.className = remaining === 0 ? 'quota-bar quota-empty' : 'quota-bar';
}
