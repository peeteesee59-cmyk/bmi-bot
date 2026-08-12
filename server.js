const express = require('express');
const app = express();

app.use(express.json());

// ความจำชั่วคราวบน Server สำหรับเก็บข้อมูลส่วนตัวของ User แต่ละคน (จำค่า น้ำหนัก, ส่วนสูง, อายุ, เพศ)
const userMemory = {};

app.post('/', (req, res) => {
  const body = req.body;
  const intentName = body.queryResult && body.queryResult.intent ? body.queryResult.intent.displayName : '';
  const parameters = body.queryResult && body.queryResult.parameters ? body.queryResult.parameters : {};

  // ดึง LINE User ID (ถ้าไม่มีจะใช้ session ID ของ Dialogflow แทน)
  const userId = body.originalDetectIntentRequest && body.originalDetectIntentRequest.payload && body.originalDetectIntentRequest.payload.data && body.originalDetectIntentRequest.payload.data.source
    ? body.originalDetectIntentRequest.payload.data.source.userId
    : (body.session || 'default_user');

  // ถ้ายังไม่มีความจำของ User คนนี้ ให้สร้างกะบะเก็บข้อมูลว่างๆ ไว้ก่อน
  if (!userMemory[userId]) {
    userMemory[userId] = { weight: null, height: null, age: null, gender: null };
  }

  // อัปเดตข้อมูลใหม่เข้า Memory ถ้าผู้ใช้มีการส่งค่ามาในรอบนี้
  if (parameters.weight && !isNaN(parseFloat(parameters.weight))) userMemory[userId].weight = parseFloat(parameters.weight);
  if (parameters.height && !isNaN(parseFloat(parameters.height))) userMemory[userId].height = parseFloat(parameters.height);
  if (parameters.age && !isNaN(parseFloat(parameters.age))) userMemory[userId].age = parseFloat(parameters.age);
  if (parameters.gender && String(parameters.gender).trim() !== '') userMemory[userId].gender = String(parameters.gender).toLowerCase();

  // ดึงค่าล่าสุดที่มีอยู่ใน Memory ออกมาเตรียมใช้คำนวณ
  const { weight, height, age, gender } = userMemory[userId];

  // ==========================================
  // 1. Intent สำหรับคำนวณ BMI
  // ==========================================
  if (intentName.includes('BMI')) {
    if (!weight || !height) {
      return res.json({
        fulfillmentText: "รบกวนระบุ **ส่วนสูง (ซม.)** และ **น้ำหนัก (กก.)** เพื่อคำนวณ BMI ให้ด้วยนะครับ ✨\n(เช่น พิมพ์: 'สูง 165 หนัก 55')"
      });
    }

    const heightM = height / 100;
    const bmi = (weight / (heightM * heightM)).toFixed(2);

    let resultText = "";
    if (bmi < 18.5) resultText = "น้ำหนักน้อย / ผอมเกินไป 🦴";
    else if (bmi <= 22.9) resultText = "น้ำหนักปกติ / สมส่วน สุขภาพดีเยี่ยม! ✨";
    else if (bmi <= 24.9) resultText = "น้ำหนักเกิน / ท้วม ⚠️";
    else if (bmi <= 29.9) resultText = "อ้วนระดับ 1 🚨";
    else resultText = "อ้วนระดับ 2 (เสี่ยงโรคเรื้อรัง) ❌";

    return res.json({
      fulfillmentText: `📊 **ผลการคำนวณ BMI ของคุณ**\n\n• ส่วนสูง: ${height} ซม.\n• น้ำหนัก: ${weight} กก.\n• ค่า BMI: ${bmi}\n• แปลผล: ${resultText}\n\n💡 *จำค่าไว้เรียบร้อย! สามารถกดเช็ก BMR หรือ TDEE ต่อได้เลยโดยไม่ต้องกรอกซ้ำครับ*`
    });
  }

  // ==========================================
  // 2. Intent สำหรับคำนวณ BMR
  // ==========================================
  if (intentName.includes('BMR')) {
    const missing = [];
    if (!gender) missing.push("เพศ (ชาย/หญิง)");
    if (!age) missing.push("อายุ (ปี)");
    if (!height) missing.push("ส่วนสูง (ซม.)");
    if (!weight) missing.push("น้ำหนัก (กก.)");

    if (missing.length > 0) {
      return res.json({
        fulfillmentText: `รบกวนระบุข้อมูลเพิ่มเติม: **${missing.join(', ')}** เพื่อคำนวณ BMR ครับ ✨`
      });
    }

    // คำนวณ BMR ตามสูตร Mifflin-St Jeor
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender.includes('female') || gender.includes('หญิง')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }
    bmr = Math.round(bmr);

    return res.json({
      fulfillmentText: `🔥 **ผลการคำนวณ BMR ของคุณ**\n\n• เพศ: ${gender.includes('female') || gender.includes('หญิง') ? 'หญิง' : 'ชาย'} | อายุ: ${age} ปี\n• ส่วนสูง: ${height} ซม. | น้ำหนัก: ${weight} กก.\n• **BMR:** ${bmr} แคลอรี/วัน\n\n💡 *BMR คือพลังงานขั้นต่ำที่ร่างกายต้องการเพื่อมีชีวิตอยู่ ไม่ควรรับประทานน้อยกว่าค่านี้นะครับ!*`
    });
  }

  // ==========================================
  // 3. Intent สำหรับคำนวณ TDEE
  // ==========================================
  if (intentName.includes('TDEE')) {
    const missing = [];
    if (!gender) missing.push("เพศ (ชาย/หญิง)");
    if (!age) missing.push("อายุ (ปี)");
    if (!height) missing.push("ส่วนสูง (ซม.)");
    if (!weight) missing.push("น้ำหนัก (กก.)");

    if (missing.length > 0) {
      return res.json({
        fulfillmentText: `รบกวนระบุข้อมูลเพิ่มเติม: **${missing.join(', ')}** เพื่อคำนวณ TDEE ครับ ✨`
      });
    }

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender.includes('female') || gender.includes('หญิง')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }

    const tdee = Math.round(bmr * 1.375);

    return res.json({
      fulfillmentText: `⚡ **ผลการคำนวณ TDEE ของคุณ**\n\n• **TDEE (พลังงานที่ใช้จริงต่อวัน):** ประมาณ ${tdee} แคลอรี/วัน\n\n💡 **แนวทางคุมอาหาร:**\n• ลดน้ำหนัก: ทานวันละ ${tdee - 300} - ${tdee - 500} แคลอรี\n• รักษาน้ำหนัก: ทานวันละ ${tdee} แคลอรี\n• เพิ่มกล้ามเนื้อ: ทานวันละ ${tdee + 300} แคลอรี`
    });
  }

  // คำสั่งสำหรับล้างข้อมูลความจำส่วนตัว (รีเซ็ตข้อมูลใหม่)
  if (intentName.includes('Reset') || intentName.includes('Clear')) {
    userMemory[userId] = { weight: null, height: null, age: null, gender: null };
    return res.json({
      fulfillmentText: "ลบข้อมูลส่วนตัวของคุณเรียบร้อยแล้วครับ! สามารถระบุข้อมูลใหม่ได้เลย ✨"
    });
  }

  return res.json({});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
