const express = require('express');
const app = express();

app.use(express.json());

app.post('/', (req, res) => {
  const parameters = req.body.queryResult && req.body.queryResult.parameters;
  
  const weight = parameters ? parameters.weight : null;
  const heightCm = parameters ? parameters.height : null;

  if (!weight || !heightCm) {
    return res.json({
      fulfillmentText: 'รบกวนระบุทั้งส่วนสูง (ซม.) และน้ำหนัก (กก.) ให้ครบด้วยนะครับ'
    });
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
