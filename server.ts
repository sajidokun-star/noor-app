import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT = `You are "Noor Islamic Learning Assistant", a careful, respectful, source-grounded Islamic educational assistant.

STRICT RULES YOU MUST FOLLOW:
1. Ground every answer STRICTLY in verified verses of the Noble Quran (citing exact Surah name and Surah:Ayah numbers) and authentic Hadith collections (Sahih al-Bukhari, Sahih Muslim, Jami at-Tirmidhi, Sunan Abi Dawud, etc., citing Book & Hadith number).
2. NEVER fabricate Quran verses, Hadith narrations, or rulings. If you are uncertain or if no verified direct primary reference exists for a specific claim, explicitly state that you do not have a verified primary reference rather than guessing.
3. NEVER issue binding personal Fatwas on complex, disputed, or case-specific Fiqh matters (e.g., divorce, complex inheritance disputes, medical/financial edge cases). Summarize established general Quran/Sunnah principles and explicitly advise consulting qualified local scholars (Ulama / Mufti).
4. Respond clearly in the language of the user's question (Bengali বাংলা, English, or Arabic العربية). Keep Arabic script accurate when quoting short phrases or duas, and provide crisp Bengali/English clarity.
5. Return ONLY valid JSON matching the requested response schema.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/islamic-assistant', async (req: Request, res: Response) => {
    try {
      const body = req.body as {
        question?: unknown;
        language?: unknown;
        history?: unknown;
      };

      const question = typeof body?.question === 'string' ? body.question.trim() : '';
      if (!question || question.length > 1500) {
        res.status(400).json({
          error:
            'Please provide a valid question between 1 and 1500 characters.',
        });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured in Settings > Secrets. Please add a valid Gemini API key to enable live AI responses.',
        });
        return;
      }

      const langHint = body?.language === 'bn' ? 'Bengali (বাংলা)' : 'English (or match user language)';
      const historyItems = Array.isArray(body?.history)
        ? body.history
            .slice(-4)
            .filter(
              (item): item is { role: string; text: string } =>
                Boolean(
                  item &&
                    typeof item === 'object' &&
                    typeof (item as { role?: unknown }).role === 'string' &&
                    typeof (item as { text?: unknown }).text === 'string'
                )
            )
        : [];

      const conversationContext = historyItems
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
        .join('\n');

      const prompt = [
        `Preferred UI Language: ${langHint} (always match the user question language if they write in Bengali, English, or Arabic).`,
        conversationContext ? `Recent Context:\n${conversationContext}` : '',
        `Current Question: ${question}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const generateWithConfig = (modelName: string) =>
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                answer: {
                  type: Type.STRING,
                  description:
                    'Clear, compassionate educational explanation grounded strictly in verified Quran & Hadith sources.',
                },
                references: {
                  type: Type.ARRAY,
                  description: 'Verified Quran or authentic Hadith citations supporting the answer.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sourceType: {
                        type: Type.STRING,
                        description: 'Must be one of: quran, hadith, scholarly_note',
                      },
                      citation: {
                        type: Type.STRING,
                        description:
                          'Exact citation e.g. Surah Al-Baqarah 2:153 or Sahih al-Bukhari 1',
                      },
                      excerpt: {
                        type: Type.STRING,
                        description: 'Short verified meaning or relevant wording of the source.',
                      },
                    },
                  },
                },
                scholarAdvice: {
                  type: Type.STRING,
                  description:
                    'Brief respectful reminder to consult qualified Ulama for complex or personal Fiqh rulings.',
                },
              },
            },
          },
        });

      const modelsToTry = [
        'gemini-4-hydrogen',
        'gemini-4-hydrogen',
        'gemini-3.1-flash-lite',
      ] as const;
      let rawText = '';
      let lastErr: unknown = null;

      for (let i = 0; i < modelsToTry.length; i++) {
        try {
          const response = await generateWithConfig(modelsToTry[i]);
          const candidateText = (response.text ?? '').trim();
          if (!candidateText) {
            throw new Error('503 UNAVAILABLE: Empty model output');
          }
          rawText = candidateText;
          break;
        } catch (err) {
          lastErr = err;
          const errStr = err instanceof Error ? err.message : String(err);
          const isTransient =
            errStr.includes('503') ||
            errStr.includes('UNAVAILABLE') ||
            errStr.includes('429');
          if (!isTransient || i === modelsToTry.length - 1) {
            throw err;
          }
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      }

      if (!rawText) {
        throw lastErr ?? new Error('Unable to reach AI service.');
      }

      const parsed = JSON.parse(rawText) as {
        answer?: string;
        references?: Array<{ sourceType?: string; citation?: string; excerpt?: string }>;
        scholarAdvice?: string;
      };

      const sanitizedRefs = Array.isArray(parsed.references)
        ? parsed.references.map((r) => ({
            sourceType:
              r.sourceType === 'quran' || r.sourceType === 'hadith'
                ? r.sourceType
                : 'scholarly_note',
            citation: typeof r.citation === 'string' ? r.citation : 'Primary Source',
            excerpt: typeof r.excerpt === 'string' ? r.excerpt : '',
          }))
        : [];

      res.json({
        answer: typeof parsed.answer === 'string' ? parsed.answer : rawText,
        references: sanitizedRefs,
        scholarAdvice:
          typeof parsed.scholarAdvice === 'string' && parsed.scholarAdvice.trim()
            ? parsed.scholarAdvice
            : 'For complex or personal Fiqh rulings, please consult a qualified Islamic scholar (Alim/Mufti).',
      });
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : 'Unable to process AI assistant request.';
      let status = 500;
      let friendly = rawMsg;

      if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')) {
        status = 503;
        friendly =
          'The AI model is experiencing temporary high demand. Please try again in a few moments, or explore the verified Quran & Hadith pages below.';
      } else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        status = 429;
        friendly = 'AI request rate limit reached. Please wait a moment and try again.';
      } else if (rawMsg.includes('403') || rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('API_KEY_INVALID')) {
        status = 403;
        friendly = 'Please verify your Gemini API key configuration in Settings > Secrets.';
      } else {
        try {
          const parsedErr = JSON.parse(rawMsg) as { error?: { message?: string; code?: number } };
          if (parsedErr?.error?.message) {
            friendly = parsedErr.error.message;
            if (parsedErr.error.code && parsedErr.error.code >= 400 && parsedErr.error.code < 600) {
              status = parsedErr.error.code;
            }
          }
        } catch {
          // keep rawMsg
        }
      }

      res.status(status).json({ error: friendly });
    }
  });

  // The service worker and manifest must never be served from a stale HTTP cache,
  // otherwise PWA updates (and notification handling fixes) would not reach devices.
  app.use((req: Request, res: Response, next) => {
    if (req.path === '/sw.js' || req.path === '/manifest.json') {
      res.set('Cache-Control', 'no-cache');
    }
    next();
  });

  const distDir = path.resolve(__dirname, 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(distDir, 'index.html')));
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use(async (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let html = fs.readFileSync(indexPath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(distDir));
    app.use((req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found' });
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Noor server listening on http://localhost:${port}`);
  });
}

startServer();
