# AI Prompt ครูไทย — คู่มือการติดตั้งและ Deploy

เว็บไซต์คลัง AI Prompt สำหรับครูไทย 325+ Prompts จาก 3 เล่ม พร้อมระบบสมาชิกและสถิติการใช้งาน

---

## 🚀 วิธี Deploy บน GitHub Pages

### ขั้นตอนที่ 1: สร้าง Repository บน GitHub

1. เข้า https://github.com/new
2. ตั้งชื่อ Repository เช่น i-prompt-kruthai
3. ตั้งค่าเป็น **Public**
4. กด **Create repository**

### ขั้นตอนที่ 2: Upload ไฟล์

`ash
# ใน folder website/ ให้รันคำสั่ง:
git init
git add .
git commit -m "Initial: AI Prompt ครูไทย website"
git branch -M main
git remote add origin https://github.com/[username]/ai-prompt-kruthai.git
git push -u origin main
`

หรือ Drag & Drop ไฟล์ทั้งหมดเข้า GitHub ผ่านเว็บได้เลย

### ขั้นตอนที่ 3: เปิด GitHub Pages

1. Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: **main** / **(root)**
4. Save
5. รอ 1-2 นาที แล้วเข้า: https://[username].github.io/ai-prompt-kruthai/

---

## 🔐 ตั้งค่าระบบสมาชิก (Supabase) - ฟรี!

### ขั้นตอนที่ 1: สร้าง Supabase Project

1. เข้า https://supabase.com → Sign up ฟรี
2. **New Project** → ตั้งชื่อ i-prompt-kruthai
3. รอ ~2 นาที ให้ project พร้อม

### ขั้นตอนที่ 2: ตั้งค่าฐานข้อมูล

1. ไปที่ **SQL Editor** (เมนูซ้าย)
2. คัดลอก SQL จากไฟล์ supabase-setup.sql
3. วางใน editor และกด **Run**

### ขั้นตอนที่ 3: เปิด Google Login (Optional)

1. Authentication → Providers → Google → Enable
2. ใส่ Client ID & Secret จาก Google Cloud Console

### ขั้นตอนที่ 4: เพิ่ม Credentials ในเว็บ

แก้ไขไฟล์ config.js:

`js
const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',    // จาก Settings > API
  anonKey: 'eyJhbGciOi...',                   // จาก Settings > API
  enabled: true   // เปลี่ยนเป็น true
};
`

---

## 📁 โครงสร้างไฟล์

`
website/
├── index.html          # หน้าเว็บหลัก (SPA)
├── style.css           # ดีไซน์ Responsive
├── app.js              # Logic หลัก
├── config.js           # ตั้งค่า Supabase (แก้ไขตรงนี้!)
├── supabase-setup.sql  # SQL สำหรับตั้งค่าฐานข้อมูล
├── data/
│   └── prompts.js      # ข้อมูล 325+ Prompts ทั้งหมด
└── README.md           # คู่มือนี้
`

---

## ✨ ฟีเจอร์ทั้งหมด

| ฟีเจอร์ | ไม่มีสมาชิก | มีสมาชิก |
|---------|------------|---------|
| ดู Prompt 325+ | ✅ | ✅ |
| ค้นหาตามสถานการณ์ | ✅ | ✅ |
| Copy Prompt ทันที | ✅ | ✅ |
| Dark Mode | ✅ | ✅ |
| แชร์ Prompt | ✅ | ✅ |
| เปิดใน Claude/ChatGPT/Gemini | ✅ | ✅ |
| บันทึกโปรด (localStorage) | ✅ | ✅ |
| บันทึกโปรด (sync ทุกอุปกรณ์) | ❌ | ✅ |
| ดูสถิติการใช้งาน | ❌ | ✅ |
| ประวัติ Prompt ที่ใช้ | ❌ | ✅ |

---

## 📊 ข้อมูล Prompt

| เล่ม | หัวข้อ | จำนวน |
|-----|--------|-------|
| 📗 เล่ม 1 | AI Prompt ครูไทย: ลดงานสอน | 100+ Prompts |
| 📘 เล่ม 2 | AI Prompt วัดผลผู้เรียน | 110+ Prompts |
| 📙 เล่ม 3 | AI Prompt งานเอกสารครู | 115+ Prompts |

---

## 🔧 การปรับแต่งเพิ่มเติม

### เปลี่ยนโลโก้/ชื่อเว็บ
แก้ไข index.html บรรทัดที่มี AI Prompt ครูไทย

### เพิ่ม Analytics
แก้ไข config.js:
`js
const SITE_CONFIG = {
  gaId: 'G-XXXXXXXXXX',  // Google Analytics 4 ID
};
`

### เปลี่ยนสี Theme
แก้ไข style.css ที่ตัวแปร CSS:
`css
:root {
  --primary: #4F46E5;  /* สีหลัก */
}
`

---

## 🆘 ปัญหาที่พบบ่อย

**Q: Prompt ไม่โหลด**
A: ตรวจสอบว่าไฟล์ data/prompts.js อยู่ในโฟลเดอร์ website/data/ และเปิดเว็บผ่าน Server (ไม่ใช่ดับเบิ้ลคลิก HTML โดยตรง)

**Q: สมาชิกไม่ทำงาน**
A: ตรวจสอบ config.js ว่า enabled: true และ URL/Key ถูกต้อง

**Q: เปิดผ่าน Local ได้ไหม**
A: ใช้ VS Code + Live Server extension หรือ python -m http.server 8000

---

Made with ❤️ for Thai Teachers | 2568
