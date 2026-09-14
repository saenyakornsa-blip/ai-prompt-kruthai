// ============================================================
// AI Prompt ครูไทย — Configuration
// ============================================================
// SETUP INSTRUCTIONS:
// 1. ไปที่ https://supabase.com และสร้างบัญชีฟรี
// 2. สร้าง New Project
// 3. ไปที่ Settings > API และคัดลอก URL และ anon key
// 4. แทนที่ค่าด้านล่าง
// 5. รัน SQL ใน supabase-setup.sql ใน Supabase SQL Editor
// ============================================================

const SUPABASE_CONFIG = {
  url: 'https://mijiyukignwfomwrneot.supabase.co',     // เช่น https://xyz.supabase.co
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1paml5dWtpZ253Zm9td3JuZW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MjM4NzMsImV4cCI6MjEwNDM5OTg3M30.qdLA_6sW5MnskxSzOosPRGqW8_Jn5-09XOscgb4lVt4',   // เริ่มต้นด้วย eyJ...
  enabled: true  // เปลี่ยนเป็น true หลังจากใส่ credentials
};

// ============================================================
// ACCESS CONTROL — ระบบควบคุมการเข้าถึง
// ============================================================
const ACCESS_CONFIG = {
  // --- เลือก MODE เดียว ---

  // MODE A: เปิดทุกอย่างฟรี สมาชิกได้ฟีเจอร์พิเศษ (stats, sync favorites)
  // mode: 'open',

  // MODE B: ดูและค้นหาได้ฟรี แต่กด Copy ต้องสมัครสมาชิก [แนะนำ]
  mode: 'copy_requires_login',

  // MODE C: ปิดทั้งหมด ต้องสมัครสมาชิกก่อนใช้งาน
  // mode: 'login_required',

  // --- ตั้งค่าเพิ่มเติม ---
  // จำนวน Copy ฟรีสำหรับ guest (ใช้กับ mode 'copy_requires_login')
  // 0 = ต้องสมัครก่อน copy ทุกครั้ง
  // 5 = copy ฟรีได้ 5 ครั้ง/วัน แล้วค่อยต้องสมัคร
  freeCopiesPerDay: 3,

  // แสดง popup ต้อนรับให้สมัครสมาชิก ครั้งแรกที่เข้าเว็บ
  showWelcomePopup: true,
  welcomePopupDelay: 8000,  // ms หลังโหลดเว็บ (8 วินาที)

  // ข้อความในหน้า login wall (mode C)
  loginWallTitle: 'เข้าสู่ระบบเพื่อใช้งาน AI Prompt ครูไทย',
  loginWallSubtitle: 'สมัครสมาชิกฟรี เข้าถึง 331 Prompts พร้อมสถิติการใช้งาน',
};

// Site configuration
const SITE_CONFIG = {
  name: 'AI Prompt ครูไทย',
  version: '1.3.0',
  promptsPerPage: 24,
  maxSearchSuggestions: 8,
  gaId: '',  // Google Analytics 4 ID เช่น 'G-XXXXXXXXXX'
};

// ============================================================
// CHATBOT CONFIG — น้องครูพร้อม (AI Assistant)
// ============================================================
const CHATBOT_CONFIG = {
  enabled: true,
  botName: 'น้องครูพร้อม',
  botSubtitle: 'ผู้ช่วย AI คลัง Prompt ครูไทย',
  avatarEmoji: '🤖',
  // สามารถใช้ 'gemini-3.5-flash', 'gemini-3.8-flash', หรือ 'gemini-2.5-flash'
  model: 'gemini-3.5-flash',
  // Google AI Studio API Token (Free Tier)
  token: 'QVEuQWI4Uk42TGExZjZRR2txbldRU2g5WVhBVC1NUVRPX1FUdExBRUhqWTd4WjVmaUpTN2c=',
  quickPrompts: [
    '💡 ออกแบบแผนการสอน Active Learning',
    '📝 ขอตัวอย่างข้อสอบคิดวิเคราะห์ (HOTS)',
    '📋 ช่วยร่างข้อตกลง วPA ด้านที่ 1',
    '🔬 แนะนำ Prompt ทำวิจัยในชั้นเรียน (CAR)',
    '✨ ขอ Prompt Master Context ตั้งต้น'
  ]
};

