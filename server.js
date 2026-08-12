const express = require('express');
const app = express();

app.use(express.json());

app.post('/', (req, res) => {
  const parameters = req.body.queryResult && req.body.queryResult.parameters;
  
  const weight = parameters ? parseFloat(parameters.weight) : null;
  const heightCm = parameters ? parseFloat(parameters.height) : null;

  // ถ้าค่าที่ส่งมาไม่ใช่ตัวเลข หรือส่งมาไม่ครบ ไม่ต้องตอบอะไรขัดจังหวะ
  if (!weight || !heightCm || isNaN(weight) || isNaN(heightCm)) {
    return res.json({});
  }

  const heightM = heightCm / 100;
  const bmi = (weight / (heightM * heightM)).toFixed(2);

  let resultText = "";
  if (bmi < 18.5) {
    resultText = "น้ำหนักน้อย / ผอมเกินไป 🦴";
  } else if (bmi <= 22.9) {
    resultText = "น้ำหนักปกติ / สมส่วน สุขภาพดีเยี่ยม! ✨";
  } else if (bmi <= 24.9) {
    resultText = "น้ำหนักเกิน / ท้วม ⚠️";
  } else if (bmi <= 29.9) {
    resultText = "อ้วนระดับ 1 🚨";
  } else {
    resultText = "อ้วนระดับ 2 (เสี่ยงโรคเรื้อรัง) ❌";
  }

  const responseText = `📊 ผลการคำนวณ BMI ของคุณ:\n\n• ส่วนสูง: ${heightCm} ซม.\n• น้ำหนัก: ${weight} กก.\n• ค่า BMI: ${bmi}\n• แปลผล: ${resultText}\n\nพยายามรักษาโภชนาการและออกกำลังกายอย่างสม่ำเสมอนะครับ! 💪`;

  return res.json({
    fulfillmentText: responseText
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
