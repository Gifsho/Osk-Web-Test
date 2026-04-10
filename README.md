# SOSK - Secure On-Screen Keyboard

[English Version](#english-version) | [ฉบับภาษาไทย](#ฉบับภาษาไทย)

---

## English Version

### Overview
**SOSK (Secure On-Screen Keyboard)** is a browser extension that provides a virtual keyboard with multiple layouts and scrambling modes to reduce the risk of keystroke capture by common keylogger techniques.

### Key Features
- Secure on-screen keyboard for browser-based text input
- 6 keyboard layouts:
  - English
  - Thai
  - Numpad
  - English (Scramble)
  - Thai (Scramble)
  - Numpad (Scramble)
- AES-GCM encryption workflow for secure input handling
- Extension options page for configuration
- Compatible with Chromium-based browsers

### Browser Compatibility
- Google Chrome
- Opera
- Microsoft Edge

### Project Structure
- `manifest.json` - Chrome Extension Manifest V3 configuration
- `background/` - Background service worker logic
- `content/` - Content scripts injected into web pages
- `popup/` - Extension popup UI
- `set/` - Settings UI and crypto-related logic
- `MiniScreen/` - Mini keyboard interface
- `utils/` - Utility modules
- `icons/` - Extension icons
- `build.js` - Build script for packaging/copying output

### Installation
1. Clone this repository:

   ```bash
   git clone "https://github.com/Gifsho/Osk-Web-Test"
   ```

2. Install dependencies (if required in your environment):

   ```bash
   npm install
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Load the extension in your browser:
   - Open `Extensions` page
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select this project folder

### Security Testing
The project includes demonstrations/tests against keylogger scenarios (for example, Bettercap-based tests) to validate the secure input approach.

### Screenshots
- Keyboard layouts and extension setup screenshots are available in the repository history and attached assets.

---

## ฉบับภาษาไทย

### ภาพรวม
**SOSK (Secure On-Screen Keyboard)** คือส่วนขยายเบราว์เซอร์ที่ให้บริการแป้นพิมพ์เสมือน พร้อมโหมดสุ่มตำแหน่งปุ่มหลายรูปแบบ เพื่อช่วยลดความเสี่ยงจากการถูกดักจับการพิมพ์ด้วยเทคนิค keylogger ทั่วไป

### ความสามารถหลัก
- แป้นพิมพ์เสมือนสำหรับการกรอกข้อมูลบนหน้าเว็บ
- รองรับเลย์เอาต์ 6 รูปแบบ ได้แก่
  - English
  - Thai
  - Numpad
  - English (Scramble)
  - Thai (Scramble)
  - Numpad (Scramble)
- มีการใช้งานกระบวนการเข้ารหัสแบบ AES-GCM เพื่อเพิ่มความปลอดภัยของข้อมูลนำเข้า
- มีหน้า Options สำหรับตั้งค่าการทำงานของส่วนขยาย
- รองรับเบราว์เซอร์ตระกูล Chromium

### เบราว์เซอร์ที่รองรับ
- Google Chrome
- Opera
- Microsoft Edge

### โครงสร้างโครงการ
- `manifest.json` - ไฟล์กำหนดค่า Chrome Extension Manifest V3
- `background/` - ตรรกะส่วน service worker เบื้องหลัง
- `content/` - สคริปต์ที่ฝังทำงานบนหน้าเว็บ
- `popup/` - ส่วนติดต่อผู้ใช้ของหน้าต่างป๊อปอัป
- `set/` - หน้าการตั้งค่าและโค้ดที่เกี่ยวข้องกับการเข้ารหัส
- `MiniScreen/` - ส่วนแสดงผลคีย์บอร์ดขนาดย่อ
- `utils/` - โมดูลเครื่องมือช่วยเหลือ
- `icons/` - ไฟล์ไอคอนของส่วนขยาย
- `build.js` - สคริปต์สำหรับกระบวนการ build

### วิธีติดตั้ง
1. โคลนโปรเจกต์:

   ```bash
   git clone "https://github.com/Gifsho/Osk-Web-Test"
   ```

2. ติดตั้งแพ็กเกจที่จำเป็น (หากสภาพแวดล้อมของคุณต้องใช้):

   ```bash
   npm install
   ```

3. สั่ง build โปรเจกต์:

   ```bash
   npm run build
   ```

4. ติดตั้งส่วนขยายแบบ Load unpacked:
   - เปิดหน้า `Extensions` ของเบราว์เซอร์
   - เปิดใช้งาน **Developer mode**
   - คลิก **Load unpacked**
   - เลือกโฟลเดอร์โปรเจกต์นี้

### การทดสอบด้านความปลอดภัย
โครงการมีตัวอย่าง/แนวทางการทดสอบกรณี keylogger (เช่น Bettercap) เพื่อใช้ประเมินแนวทางการป้องกันข้อมูลนำเข้า

### ภาพประกอบ
- ภาพเลย์เอาต์คีย์บอร์ดและขั้นตอนการติดตั้งสามารถอ้างอิงได้จาก assets ที่แนบไว้ในประวัติของโครงการ
