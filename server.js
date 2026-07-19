import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const GEMINI_MODEL = 'gemini-2.5-flash';
const ALLOWED_CONFIDENCE = new Set(['low', 'medium', 'high']);

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const ANALYSIS_PROMPT = `You are a nutrition assistant analyzing a photo of food.
Respond with ONLY a JSON object (no markdown, no extra text) matching exactly this shape:
{
  "food_name": string,
  "estimated_calories": number,
  "healthiness_rating": number (integer 1-5, 5 is healthiest),
  "portion_recommendation": string (a short suggestion about portion size),
  "confidence": "low" | "medium" | "high",
  "notes": string (one short sentence of useful context)
}
Estimate calories for the visible portion as best you can. If the image does not clearly show food, set food_name to "Unrecognized" and confidence to "low".`;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || '');
  return match ? { mimeType: match[1], base64: match[2] } : null;
}

function coerceAnalysis(raw) {
  const rating = Number(raw?.healthiness_rating);
  const calories = Number(raw?.estimated_calories);

  return {
    food_name: typeof raw?.food_name === 'string' && raw.food_name.trim()
      ? raw.food_name.trim()
      : 'Unknown food',
    estimated_calories: Number.isFinite(calories) ? Math.max(0, Math.round(calories)) : 0,
    healthiness_rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : 3,
    portion_recommendation: typeof raw?.portion_recommendation === 'string' && raw.portion_recommendation.trim()
      ? raw.portion_recommendation.trim()
      : 'No recommendation available.',
    confidence: ALLOWED_CONFIDENCE.has(raw?.confidence) ? raw.confidence : 'low',
    notes: typeof raw?.notes === 'string' ? raw.notes.trim() : '',
  };
}

app.post('/api/analyze-food', async (req, res) => {
  if (!genAI) {
    return res.status(500).json({ error: 'Server is missing a Gemini API key.' });
  }

  const parsed = parseDataUrl(req.body?.image);
  if (!parsed) {
    return res.status(400).json({ error: 'No valid image provided.' });
  }

  const imageBytes = Buffer.byteLength(parsed.base64, 'base64');
  if (imageBytes > MAX_IMAGE_BYTES) {
    return res.status(400).json({ error: 'Image is too large. Please use an image under 4MB.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json' },
    });

    const result = await model.generateContent([
      { text: ANALYSIS_PROMPT },
      { inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } },
    ]);

    const raw = JSON.parse(result.response.text());
    res.json(coerceAnalysis(raw));
  } catch (err) {
    console.error('Gemini analysis failed:', err.message);
    res.status(502).json({ error: 'Could not analyze the image right now. Please try again in a moment.' });
  }
});

app.listen(PORT, () => {
  console.log(`K21 Calorie Tracker running at http://localhost:${PORT}`);
});
