cconst express = require('express');
const app = express();

app.use(express.json());

// ความจำชั่วคราวจำค่ารายคน (LINE User ID)
const userMemory = {};

app.post('/', (req, res) => {
  const body = req.body;
  const intentName = body.queryResult && body.queryResult.intent ? body.queryResult.intent.displayName : '';
  const parameters = body.queryResult && body.queryResult.parameters ? body.queryResult.parameters : {};

  // ดึง LINE User ID (ถ้าไม่มีจะใช้ Session ID ของ Dialogflow แทน)
  const userId = body.originalDetectIntentRequest && body.originalDetectIntentRequest.payload && body.originalDetectIntentRequest.payload.data && body.originalDetectIntentRequest.payload.data.source
    ? body.originalDetectIntentRequest.payload.data.source.userId
    : (body.session || 'default_user');

  // ถ้าเป็นผู้ใช้ใหม่ ให้สร้างกะบะเก็บข้อมูลว่างๆ ไว้ก่อน
  if (!userMemory[userId]) {
    userMemory[userId] = { weight: null, height: null, age: null, gender: null };
  }

  // อัปเดตข้อมูล Memory หากผู้ใช้มีการส่งค่าใหม่เข้ามาในรอบนี้
  if (parameters.weight && !isNaN(parseFloat(parameters.weight))) userMemory[userId].weight = parseFloat(parameters.weight);
  if (parameters.height && !isNaN(parseFloat(parameters.height))) userMemory[userId].height = parseFloat(parameters.height);
  if (parameters.age && !isNaN(parseFloat(parameters.age))) userMemory[userId].age = parseFloat(parameters.age);
  if (parameters.gender && String(parameters.gender).trim() !== '') userMemory[userId].gender = String(parameters.gender).toLowerCase();

  // ดึงค่าล่าสุดจาก Memory มาเตรียมใช้งาน
  const { weight, height, age, gender } = userMemory[userId];

  // ==========================================
  // 1. เคสคำนวณ BMI
  // ==========================================
  if (intentName.includes('BMI')) {
    const missing = [];
    if (!height) missing.push("ส่วนสูง (ซม.)");
    if (!weight) missing.push("น้ำหนัก (กก.)");

    // ถ้าข้อมูลไม่ครบ ให้เด้งถามเฉพาะตัวที่ขาด
    if (missing.length > 0) {
      return res.json({
        fulfillmentText: `ขอดาต้าเพิ่มหน่อยน้า รบกวนระบุ **${missing.join(' และ ')}** ให้หน่อยครับ ✨\n(เช่น พิมพ์ว่า: 'สูง 160 หนัก 50')`
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
      fulfillmentText: `📊 **ผลการคำนวณ BMI ของคุณ**\n\n• ส่วนสูง: ${height} ซม.\n• น้ำหนัก: ${weight} กก.\n• ค่า BMI: ${bmi}\n• แปลผล: ${resultText}\n\n✨ *จำข้อมูลไว้แล้ว! สามารถกดเช็ก BMR หรือ TDEE ต่อได้เลยโดยไม่ต้องกรอกซ้ำครับ*`
    });
  }

  // ==========================================
  // 2. เคสคำนวณ BMR
  // ==========================================
  if (intentName.includes('BMR')) {
    const missing = [];
    if (!gender) missing.push("เพศ (ชาย/หญิง)");
    if (!age) missing.push("อายุ (ปี)");
    if (!height) missing.push("ส่วนสูง (ซม.)");
    if (!weight) missing.push("น้ำหนัก (กก.)");

    if (missing.length > 0) {
      return res.json({
        fulfillmentText: `ยังไม่มีข้อมูลครบเลยครับ รบกวนระบุ: **${missing.join(', ')}** ให้หน่อยนะครับ ✨\n(เช่น พิมพ์ว่า: 'หญิง 22 สูง 160 หนัก 50')`
      });
    }

    // สูตร Mifflin-St Jeor
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender.includes('female') || gender.includes('หญิง')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }
    bmr = Math.round(bmr);

    const genderText = (gender.includes('female') || gender.includes('หญิง')) ? 'หญิง' : 'ชาย';

    return res.json({
      fulfillmentText: `🔥 **ผลการคำนวณ BMR ของคุณ**\n\n• ข้อมูลของคุณ: เพศ${genderText} | อายุ ${age} ปี | สูง ${height} ซม. | หนัก ${weight} กก.\n• **BMR (เผาผลาญขั้นต่ำ):** ${bmr} แคลอรี/วัน\n\n💡 *BMR คือพลังงานขั้นต่ำที่ร่างกายต้องการเพื่อมีชีวิตอยู่ ไม่ควรรับประทานน้อยกว่าค่านี้นะครับ!*`
    });
  }

  // ==========================================
  // 3. เคสคำนวณ TDEE
  // ==========================================
  if (intentName.includes('TDEE')) {
    const missing = [];
    if (!gender) missing.push("เพศ (ชาย/หญิง)");
    if (!age) missing.push("อายุ (ปี)");
    if (!height) missing.push("ส่วนสูง (ซม.)");
    if (!weight) missing.push("น้ำหนัก (กก.)");

    if (missing.length > 0) {
      return res.json({
        fulfillmentText: `ยังไม่มีข้อมูลครบเลยครับ รบกวนระบุ: **${missing.join(', ')}** ให้หน่อยนะครับ ✨\n(เช่น พิมพ์ว่า: 'หญิง 22 สูง 160 หนัก 50')`
      });
    }

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (gender.includes('female') || gender.includes('หญิง')) {
      bmr -= 161;
    } else {
      bmr += 5;
    }

    const tdee = Math.round(bmr * 1.375); // ประเมินกิจกรรมระดับปานกลาง
    const genderText = (gender.includes('female') || gender.includes('หญิง')) ? 'หญิง' : 'ชาย';

    return res.json({
      fulfillmentText: `⚡ **ผลการคำนวณ TDEE ของคุณ**\n\n• ข้อมูลของคุณ: เพศ${genderText} | อายุ ${age} ปี | สูง ${height} ซม. | หนัก ${weight} กก.\n• **TDEE (พลังงานใช้จริงต่อวัน):** ประมาณ ${tdee} แคลอรี/วัน\n\n💡 **แนวทางคุมอาหาร:**\n• ลดน้ำหนัก: ทานวันละ ${tdee - 400} แคลอรี\n• รักษาน้ำหนัก: ทานวันละ ${tdee} แคลอรี\n• เพิ่มกล้ามเนื้อ: ทานวันละ ${tdee + 300} แคลอรี`
    });
  }

  // ==========================================
  // 4. เคสล้างข้อมูล / รีเซ็ต Memory
  // ==========================================
  if (intentName.includes('Reset') || intentName.includes('Clear')) {
    userMemory[userId] = { weight: null, height: null, age: null, gender: null };
    return res.json({
      fulfillmentText: "ลบข้อมูลส่วนตัวของคุณเรียบร้อยแล้วครับ! สามารถระบุข้อมูลส่วนตัวใหม่ได้เลยครับ ✨"
    });
  }

  return res.json({});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
