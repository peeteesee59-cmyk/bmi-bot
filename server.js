const express = require('express');
const app = express();

app.use(express.json());

// พื้นที่ความจำชั่วคราว (ปรับปรุงใหม่ให้เสถียรที่สุด)
const sessionStore = {};

app.post('/', (req, res) => {
  try {
    // 1. ดึงข้อมูลแบบปลอดภัยสูงสุด (ป้องกัน Error ตัวแปรไม่มีค่า)
    const body = req.body;
    const intentName = body.queryResult?.intent?.displayName || '';
    const parameters = body.queryResult?.parameters || {};
    
    // ค้นหา User ID ถ้าไม่มีให้ใช้ค่าเริ่มต้น
    const userId = body.originalDetectIntentRequest?.payload?.data?.source?.userId 
      || body.session 
      || 'default_user';

    // 2. ตรวจสอบและจัดการความจำ (ระบบป้องกันอาการรวน)
    if (!sessionStore[userId]) {
      sessionStore[userId] = { weight: null, height: null, age: null, gender: null, currentIntent: intentName };
    }

    // 🔥 ป้องกันบั๊ค: ถ้าผู้ใช้เปลี่ยนเรื่องคุยกระทันหัน (เช่น ถาม BMI อยู่ แล้วเปลี่ยนไปพิมพ์ BMR) ให้ล้างความจำทิ้งทันที
    if (sessionStore[userId].currentIntent !== intentName) {
      sessionStore[userId] = { weight: null, height: null, age: null, gender: null, currentIntent: intentName };
    }

    // 3. เก็บข้อมูลที่ถูกส่งมาเข้าสู่ระบบความจำ
    if (parameters.weight && !isNaN(parseFloat(parameters.weight))) sessionStore[userId].weight = parseFloat(parameters.weight);
    if (parameters.height && !isNaN(parseFloat(parameters.height))) sessionStore[userId].height = parseFloat(parameters.height);
    if (parameters.age && !isNaN(parseFloat(parameters.age))) sessionStore[userId].age = parseFloat(parameters.age);
    if (parameters.gender && String(parameters.gender).trim() !== '') sessionStore[userId].gender = String(parameters.gender).toLowerCase();

    const { weight, height, age, gender } = sessionStore[userId];

    // ==========================================
    // 🧮 ส่วนที่ 1: คำนวณ BMI
    // ==========================================
    if (intentName.includes('BMI')) {
      if (!weight) return res.json({ fulfillmentText: "กรุณาระบุ **น้ำหนัก (กก.)** ของคุณด้วยครับ ✨" });
      if (!height) return res.json({ fulfillmentText: "กรุณาระบุ **ส่วนสูง (ซม.)** ของคุณด้วยครับ ✨" });

      const heightM = height / 100;
      const bmi = (weight / (heightM * heightM)).toFixed(2);
      
      let resultText = "";
      if (bmi < 18.5) resultText = "น้ำหนักน้อย / ผอมเกินไป 🦴";
      else if (bmi <= 22.9) resultText = "น้ำหนักปกติ / สมส่วน สุขภาพดีเยี่ยม! ✨";
      else if (bmi <= 24.9) resultText = "น้ำหนักเกิน / ท้วม ⚠️";
      else if (bmi <= 29.9) resultText = "อ้วนระดับ 1 🚨";
      else resultText = "อ้วนระดับ 2 (เสี่ยงโรคเรื้อรัง) ❌";

      // ลบความจำทันทีเมื่อคำนวณสำเร็จ
      delete sessionStore[userId];

      return res.json({
        fulfillmentText: `📊 **ผลการคำนวณ BMI ของคุณ**\n\n• ส่วนสูง: ${height} ซม.\n• น้ำหนัก: ${weight} กก.\n• ค่า BMI: ${bmi}\n• แปลผล: ${resultText}`
      });
    }

    // ==========================================
    // 🔥 ส่วนที่ 2: คำนวณ BMR
    // ==========================================
    if (intentName.includes('BMR')) {
      if (!gender) return res.json({ fulfillmentText: "กรุณาระบุ **เพศ (ชาย/หญิง)** ของคุณครับ ✨" });
      if (!age) return res.json({ fulfillmentText: "กรุณาระบุ **อายุ (ปี)** ของคุณครับ ✨" });
      if (!height) return res.json({ fulfillmentText: "กรุณาระบุ **ส่วนสูง (ซม.)** ของคุณครับ ✨" });
      if (!weight) return res.json({ fulfillmentText: "กรุณาระบุ **น้ำหนัก (กก.)** ของคุณครับ ✨" });

      let bmr = (10 * weight) + (6.25 * height) - (5 * age);
      if (gender.includes('female') || gender.includes('หญิง')) {
        bmr -= 161;
      } else {
        bmr += 5;
      }
      bmr = Math.round(bmr);
      const genderText = (gender.includes('female') || gender.includes('หญิง')) ? 'หญิง' : 'ชาย';

      delete sessionStore[userId];

      return res.json({
        fulfillmentText: `🔥 **ผลการคำนวณ BMR ของคุณ**\n\n• ข้อมูล: เพศ${genderText} | อายุ ${age} ปี | สูง ${height} ซม. | หนัก ${weight} กก.\n• **BMR (เผาผลาญขั้นต่ำ):** ${bmr} แคลอรี/วัน`
      });
    }

    // ==========================================
    // ⚡ ส่วนที่ 3: คำนวณ TDEE
    // ==========================================
    if (intentName.includes('TDEE')) {
      if (!gender) return res.json({ fulfillmentText: "กรุณาระบุ **เพศ (ชาย/หญิง)** ของคุณครับ ✨" });
      if (!age) return res.json({ fulfillmentText: "กรุณาระบุ **อายุ (ปี)** ของคุณครับ ✨" });
      if (!height) return res.json({ fulfillmentText: "กรุณาระบุ **ส่วนสูง (ซม.)** ของคุณครับ ✨" });
      if (!weight) return res.json({ fulfillmentText: "กรุณาระบุ **น้ำหนัก (กก.)** ของคุณครับ ✨" });

      let bmr = (10 * weight) + (6.25 * height) - (5 * age);
      if (gender.includes('female') || gender.includes('หญิง')) {
        bmr -= 161;
      } else {
        bmr += 5;
      }
      const tdee = Math.round(bmr * 1.375); // ใช้สูตรกิจกรรมระดับกลางเป็นมาตรฐาน
      const genderText = (gender.includes('female') || gender.includes('หญิง')) ? 'หญิง' : 'ชาย';

      delete sessionStore[userId];

      return res.json({
        fulfillmentText: `⚡ **ผลการคำนวณ TDEE ของคุณ**\n\n• ข้อมูล: เพศ${genderText} | อายุ ${age} ปี | สูง ${height} ซม. | หนัก ${weight} กก.\n• **TDEE (พลังงานใช้จริงต่อวัน):** ประมาณ ${tdee} แคลอรี/วัน`
      });
    }

    // ==========================================
    // 💧 ส่วนที่ 4: คำนวณปริมาณน้ำดื่ม (เพิ่มใหม่!)
    // ==========================================
    // รองรับชื่อ Intent ที่มีคำว่า 'น้ำ', 'Water', 'water'
    if (intentName.includes('น้ำ') || intentName.toLowerCase().includes('water')) {
      if (!weight) return res.json({ fulfillmentText: "กรุณาระบุ **น้ำหนัก (กก.)** ของคุณ เพื่อคำนวณปริมาณน้ำดื่มที่เหมาะสมครับ 💧" });

      // สูตร: น้ำหนักตัว (กก.) x 33 = ปริมาณน้ำ (มิลลิลิตร)
      const waterML = Math.round(weight * 33); 
      const waterLiters = (waterML / 1000).toFixed(2);
      const glasses = Math.round(waterML / 250); // สมมติว่าแก้วละ 250ml

      delete sessionStore[userId];

      return res.json({
        fulfillmentText: `💧 **ปริมาณน้ำดื่มที่เหมาะสมสำหรับคุณ**\n\n• น้ำหนักตัว: ${weight} กก.\n• ปริมาณที่ร่างกายต้องการ: **${waterML} มิลลิลิตร** (ประมาณ ${waterLiters} ลิตร)\n• เทียบเท่ากับการดื่มน้ำประมาณ **${glasses} แก้ว** ต่อวันครับ!`
      });
    }

    // ==========================================
    // 🛡️ ส่วนที่ 5: ป้องกันการ Error เมื่อเรียก Intent ผิด
    // ==========================================
    // หากบังเอิญเปิด Webhook ทิ้งไว้ใน Intent ที่ไม่มีสูตรคำนวณ ให้ตีกลับเป็นข้อความนี้
    return res.json({
      fulfillmentText: "ระบบได้รับข้อความของคุณแล้วครับ 🤖"
    });

  } catch (error) {
    // 🛡️ ป้องกันแอปดับ: ถ้ามีโค้ดพังหรือข้อมูลผิดพลาด ให้ทำงานในส่วนนี้แทน
    console.error("Webhook Error: ", error);
    return res.json({
      fulfillmentText: "ขออภัยครับ ระบบประมวลผลขัดข้องชั่วคราว ลองใหม่อีกครั้งนะครับ 🛠️"
    });
  }
});

// บรรทัดสั่งเปิด Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
