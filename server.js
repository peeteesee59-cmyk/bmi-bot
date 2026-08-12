const express = require('express');
const app = express();

app.use(express.json());

app.post('/', (req, res) => {
  const body = req.body;
  const intentName = body.queryResult && body.queryResult.intent ? body.queryResult.intent.displayName : '';
  const parameters = body.queryResult && body.queryResult.parameters ? body.queryResult.parameters : {};

  // ดึงค่าที่ผู้ใช้พิมพ์เข้ามาในรอบปัจจุบันเท่านั้น (ไม่ดึงค่าเก่า)
  const weight = parameters.weight ? parseFloat(parameters.weight) : null;
  const height = parameters.height ? parseFloat(parameters.height) : null;
  const age = parameters.age ? parseFloat(parameters.age) : null;
  const gender = parameters.gender ? String(parameters.gender).toLowerCase() : '';

  // ==========================================
  // 1. คำนวณ BMI (ใช้น้ำหนัก + ส่วนสูง)
  // ==========================================
  if (intentName.includes('BMI')) {
    const missing = [];
    if (!height) missing.push("ส่วนสูง (ซม.)");
    if (!weight) missing.push("น้ำหนัก (กก.)");

    // ถ้าข้อมูลรอบนี้ไม่ครบ ให้เด้งบอกทันที
    if (missing.length > 0) {
      return res.json({
        fulfillmentText: `รบกวนระบุ **${missing.join(' และ ')}** เพื่อคำนวณ BMI ครับ ✨\n(ตัวอย่าง: 'สูง 165 หนัก 55')`
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
      fulfillmentText: `📊 **ผลการคำนวณ BMI ของคุณ**\n\n• ส่วนสูง: ${height} ซม.\n• น้ำหนัก: ${weight} กก.\n• ค่า BMI: ${bmi}\n• แปลผล: ${resultText}`
    });
  }

  // ==========================================
  // 2. คำนวณ BMR (ใช้เพศ + อายุ + ส่วนสูง + น้ำหนัก)
  // ==========================================
  if (intentName.includes('BMR')) {
    const missing = [];
    if (!gender) missing.push("เพศ (ชาย/หญิง)");
    if (!age) missing.push("อายุ (ปี)");
    if (!height) missing.push("ส่วนสูง (ซม.)");
    if (!weight) missing.push("น้ำหนัก (กก.)");

    if (missing.length > 0) {
      return res.json({
        fulfillmentText: `รบกวนระบุข้อมูลให้ครบ: **${missing.join(', ')}** เพื่อคำนวณ BMR ครับ ✨\n(ตัวอย่าง: 'หญิง 22 สูง 160 หนัก 50')`
      });
    }

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender.includes('female') || gender.includes('หญิง')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }
    bmr = Math.round(bmr);

    const genderText = (gender.includes('female') || gender.includes('หญิง')) ? 'หญิง' : 'ชาย';

    return res.json({
      fulfillmentText: `🔥 **ผลการคำนวณ BMR ของคุณ**\n\n• ข้อมูล: เพศ${genderText} | อายุ ${age} ปี | สูง ${height} ซม. | หนัก ${weight} กก.\n• **BMR (เผาผลาญขั้นต่ำ):** ${bmr} แคลอรี/วัน\n\n💡 *BMR คือพลังงานขั้นต่ำที่ร่างกายต้องการเพื่อมีชีวิตอยู่ต่อวันครับ*`
    });
  }

  // ==========================================
  // 3. คำนวณ TDEE (ใช้เพศ + อายุ + ส่วนสูง + น้ำหนัก)
  // ==========================================
  if (intentName.includes('TDEE')) {
    const missing = [];
    if (!gender) missing.push("เพศ (ชาย/หญิง)");
    if (!age) missing.push("อายุ (ปี)");
    if (!height) missing.push("ส่วนสูง (ซม.)");
    if (!weight) missing.push("น้ำหนัก (กก.)");

    if (missing.length > 0) {
      return res.json({
        fulfillmentText: `รบกวนระบุข้อมูลให้ครบ: **${missing.join(', ')}** เพื่อคำนวณ TDEE ครับ ✨\n(ตัวอย่าง: 'หญิง 22 สูง 160 หนัก 50')`
      });
    }

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender.includes('female') || gender.includes('หญิง')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }

    const tdee = Math.round(bmr * 1.375);
    const genderText = (gender.includes('female') || gender.includes('หญิง')) ? 'หญิง' : 'ชาย';

    return res.json({
      fulfillmentText: `⚡ **ผลการคำนวณ TDEE ของคุณ**\n\n• ข้อมูล: เพศ${genderText} | อายุ ${age} ปี | สูง ${height} ซม. | หนัก ${weight} กก.\n• **TDEE (พลังงานใช้จริงต่อวัน):** ประมาณ ${tdee} แคลอรี/วัน\n\n💡 **แนวทางคุมอาหาร:**\n• ลดน้ำหนัก: ทานวันละ ${tdee - 400} แคลอรี\n• รักษาน้ำหนัก: ทานวันละ ${tdee} แคลอรี`
    });
  }

  return res.json({});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
