const express = require('express');
const app = express();

app.use(express.json());

// ความจำชั่วคราวระหว่างการสนทนา (จะถูกล้างทิ้งทันทีที่คำนวณเสร็จ)
const sessionStore = {};

app.post('/', (req, res) => {
  const body = req.body;
  const intentName = body.queryResult && body.queryResult.intent ? body.queryResult.intent.displayName : '';
  const parameters = body.queryResult && body.queryResult.parameters ? body.queryResult.parameters : {};

  // ดึง User ID
  const userId = body.originalDetectIntentRequest && body.originalDetectIntentRequest.payload && body.originalDetectIntentRequest.payload.data && body.originalDetectIntentRequest.payload.data.source
    ? body.originalDetectIntentRequest.payload.data.source.userId
    : (body.session || 'default_user');

  if (!sessionStore[userId]) {
    sessionStore[userId] = { weight: null, height: null, age: null, gender: null };
  }

  // เก็บค่าที่ผู้ใช้ทยอยตอบมาทีละข้อ
  if (parameters.weight && !isNaN(parseFloat(parameters.weight))) sessionStore[userId].weight = parseFloat(parameters.weight);
  if (parameters.height && !isNaN(parseFloat(parameters.height))) sessionStore[userId].height = parseFloat(parameters.height);
  if (parameters.age && !isNaN(parseFloat(parameters.age))) sessionStore[userId].age = parseFloat(parameters.age);
  if (parameters.gender && String(parameters.gender).trim() !== '') sessionStore[userId].gender = String(parameters.gender).toLowerCase();

  const { weight, height, age, gender } = sessionStore[userId];

  // ==========================================
  // 1. คำนวณ BMI (ถามทีละอย่าง: น้ำหนัก -> ส่วนสูง)
  // ==========================================
  if (intentName.includes('BMI')) {
    if (!weight) {
      return res.json({ fulfillmentText: "กรุณาระบุ **น้ำหนัก (กก.)** ของคุณครับ ✨" });
    }
    if (!height) {
      return res.json({ fulfillmentText: "กรุณาระบุ **ส่วนสูง (ซม.)** ของคุณครับ ✨" });
    }

    // ได้ข้อมูลครบแล้ว -> คำนวณผลลัพธ์
    const heightM = height / 100;
    const bmi = (weight / (heightM * heightM)).toFixed(2);

    let resultText = "";
    if (bmi < 18.5) resultText = "น้ำหนักน้อย / ผอมเกินไป 🦴";
    else if (bmi <= 22.9) resultText = "น้ำหนักปกติ / สมส่วน สุขภาพดีเยี่ยม! ✨";
    else if (bmi <= 24.9) resultText = "น้ำหนักเกิน / ท้วม ⚠️";
    else if (bmi <= 29.9) resultText = "อ้วนระดับ 1 🚨";
    else resultText = "อ้วนระดับ 2 (เสี่ยงโรคเรื้อรัง) ❌";

    // คำนวณเสร็จแล้ว ล้างความจำออกทันที เพื่อให้ครั้งหน้าเริ่มใหม่สดๆ
    sessionStore[userId] = { weight: null, height: null, age: null, gender: null };

    return res.json({
      fulfillmentText: `📊 **ผลการคำนวณ BMI ของคุณ**\n\n• ส่วนสูง: ${height} ซม.\n• น้ำหนัก: ${weight} กก.\n• ค่า BMI: ${bmi}\n• แปลผล: ${resultText}`
    });
  }

  // ==========================================
  // 2. คำนวณ BMR (ถามทีละอย่าง: เพศ -> อายุ -> ส่วนสูง -> น้ำหนัก)
  // ==========================================
  if (intentName.includes('BMR')) {
    if (!gender) {
      return res.json({ fulfillmentText: "กรุณาระบุ **เพศ (ชาย/หญิง)** ของคุณครับ ✨" });
    }
    if (!age) {
      return res.json({ fulfillmentText: "กรุณาระบุ **อายุ (ปี)** ของคุณครับ ✨" });
    }
    if (!height) {
      return res.json({ fulfillmentText: "กรุณาระบุ **ส่วนสูง (ซม.)** ของคุณครับ ✨" });
    }
    if (!weight) {
      return res.json({ fulfillmentText: "กรุณาระบุ **น้ำหนัก (กก.)** ของคุณครับ ✨" });
    }

    // ได้ข้อมูลครบแล้ว -> คำนวณ BMR
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender.includes('female') || gender.includes('หญิง')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }
    bmr = Math.round(bmr);

    const genderText = (gender.includes('female') || gender.includes('หญิง')) ? 'หญิง' : 'ชาย';

    // คำนวณเสร็จแล้ว ล้างความจำออกทันที
    sessionStore[userId] = { weight: null, height: null, age: null, gender: null };

    return res.json({
      fulfillmentText: `🔥 **ผลการคำนวณ BMR ของคุณ**\n\n• ข้อมูล: เพศ${genderText} | อายุ ${age} ปี | สูง ${height} ซม. | หนัก ${weight} กก.\n• **BMR (เผาผลาญขั้นต่ำ):** ${bmr} แคลอรี/วัน`
    });
  }

  // ==========================================
  // 3. คำนวณ TDEE (ถามทีละอย่าง: เพศ -> อายุ -> ส่วนสูง -> น้ำหนัก)
  // ==========================================
  if (intentName.includes('TDEE')) {
    if (!gender) {
      return res.json({ fulfillmentText: "กรุณาระบุ **เพศ (ชาย/หญิง)** ของคุณครับ ✨" });
    }
    if (!age) {
      return res.json({ fulfillmentText: "กรุณาระบุ **อายุ (ปี)** ของคุณครับ ✨" });
    }
    if (!height) {
      return res.json({ fulfillmentText: "กรุณาระบุ **ส่วนสูง (ซม.)** ของคุณครับ ✨" });
    }
    if (!weight) {
      return res.json({ fulfillmentText: "กรุณาระบุ **น้ำหนัก (กก.)** ของคุณครับ ✨" });
    }

    // ได้ข้อมูลครบแล้ว -> คำนวณ TDEE
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender.includes('female') || gender.includes('หญิง')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }

    const tdee = Math.round(bmr * 1.375);
    const genderText = (gender.includes('female') || gender.includes('หญิง')) ? 'หญิง' : 'ชาย';

    // คำนวณเสร็จแล้ว ล้างความจำออกทันที
    sessionStore[userId] = { weight: null, height: null, age: null, gender: null };

    return res.json({
      fulfillmentText: `⚡ **ผลการคำนวณ TDEE ของคุณ**\n\n• ข้อมูล: เพศ${genderText} | อายุ ${age} ปี | สูง ${height} ซม. | หนัก ${weight} กก.\n• **TDEE (พลังงานใช้จริงต่อวัน):** ประมาณ ${tdee} แคลอรี/วัน`
    });
  }

  return res.json({});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
