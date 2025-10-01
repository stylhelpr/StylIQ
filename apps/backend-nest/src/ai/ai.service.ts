import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatDto } from './dto/chat.dto';

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

function loadOpenAISecrets(): {
  apiKey?: string;
  project?: string;
  source: string;
} {
  // Try the most likely locations FIRST. We prefer reading the file directly
  // so a masked/global OPENAI_API_KEY can't override it.
  const candidates = [
    path.join(process.cwd(), '.env'), // when CWD = apps/backend-nest
    path.join(process.cwd(), 'apps', 'backend-nest', '.env'), // when CWD = repo root
    path.join(__dirname, '..', '..', '.env'), // dist/src-relative fallback
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const parsed = dotenv.parse(fs.readFileSync(p));
        const apiKey = parsed['OPENAI_API_KEY'];
        const project = parsed['OPENAI_PROJECT_ID'];
        if (apiKey) return { apiKey, project, source: p };
      }
    } catch {
      // ignore and keep searching
    }
  }

  // Final fallback to process.env (may be masked by your shell/IDE)
  return {
    apiKey: process.env.OPENAI_API_KEY,
    project: process.env.OPENAI_PROJECT_ID,
    source: 'process.env',
  };
}

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor() {
    const { apiKey, project, source } = loadOpenAISecrets();

    // Debug (safe): show where it came from + snippet/length, not the full secret.
    const snippet = apiKey?.slice(0, 20) ?? '';
    const len = apiKey?.length ?? 0;
    console.log('🔑 OPENAI key source:', source);
    console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
    console.log('🔑 OPENAI key length:', len);
    console.log('📂 CWD:', process.cwd());

    // Guards: catch masked/bad keys ASAP.
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in .env or environment.');
    }
    // Reject obviously masked placeholders like "sk-xxxxx***"
    if (/^sk-?x{3,}/i.test(apiKey)) {
      throw new Error(
        'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
      );
    }
    // Accept both "sk-proj-" and normal "sk-" formats; prefer project-scoped key.
    if (!apiKey.startsWith('sk-')) {
      throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
    }

    this.openai = new OpenAI({ apiKey, project });
  }

  /**
   * 💬 Full conversational chat (powers AiStylistChatScreen)
   */
  async chat(dto: ChatDto) {
    const { messages } = dto;

    const lastUserMsg = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user')?.content;

    if (!lastUserMsg) {
      throw new Error('No user message provided');
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content:
            'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
        },
        ...messages,
      ],
    });

    const aiReply =
      completion.choices[0]?.message?.content?.trim() ||
      'Styled response unavailable.';

    return { reply: aiReply };
  }

  /**
   * 🧠 Suggest: Quick proactive outfit suggestion, wardrobe insight, and tomorrow preview.
   * Powers AiStylistSuggestions.tsx on the home screen.
   */
  async suggest(body: {
    user?: string;
    weather?: any;
    wardrobe?: any[];
    preferences?: Record<string, any>;
  }) {
    const { user, weather, wardrobe, preferences } = body;

    const temp = weather?.fahrenheit?.main?.temp;
    const tempDesc = temp
      ? `${temp}°F and ${
          temp < 60 ? 'cool' : temp > 85 ? 'warm' : 'mild'
        } weather`
      : 'unknown temperature';

    const wardrobeCount = wardrobe?.length || 0;

    const systemPrompt = `
You are a luxury personal stylist. 
Your goal is to provide a daily style briefing that helps the user feel prepared, stylish, and confident.
Be concise, intelligent, and polished — similar to a stylist at a high-end menswear brand.
Output must be JSON with three fields: "suggestion", "insight", and "tomorrow".
`;

    const userPrompt = `
Client: ${user || 'The user'}
Weather: ${tempDesc}
Wardrobe items: ${wardrobeCount}
Preferences: ${JSON.stringify(preferences || {})}

1. suggestion: One outfit recommendation (1–2 sentences) based on the above.
2. insight: One smart observation about their wardrobe (gap, underused item, etc.).
3. tomorrow: One brief note predicting how they should approach tomorrow’s outfit.
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('No suggestion response received from model.');
    }

    let parsed: { suggestion: string; insight: string; tomorrow: string };
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('❌ Failed to parse AI JSON:', raw);
      throw new Error('AI response was not valid JSON.');
    }

    return parsed;
  }
}

///////////////////

// // apps/backend-nest/src/ai/ai.service.ts
// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// import * as fs from 'fs';
// import * as path from 'path';
// import * as dotenv from 'dotenv';

// function loadOpenAISecrets(): {
//   apiKey?: string;
//   project?: string;
//   source: string;
// } {
//   // Try the most likely locations FIRST. We prefer reading the file directly
//   // so a masked/global OPENAI_API_KEY can't override it.
//   const candidates = [
//     path.join(process.cwd(), '.env'), // when CWD = apps/backend-nest
//     path.join(process.cwd(), 'apps', 'backend-nest', '.env'), // when CWD = repo root
//     path.join(__dirname, '..', '..', '.env'), // dist/src-relative fallback
//   ];

//   for (const p of candidates) {
//     try {
//       if (fs.existsSync(p)) {
//         const parsed = dotenv.parse(fs.readFileSync(p));
//         const apiKey = parsed['OPENAI_API_KEY'];
//         const project = parsed['OPENAI_PROJECT_ID'];
//         if (apiKey) return { apiKey, project, source: p };
//       }
//     } catch {
//       // ignore and keep searching
//     }
//   }

//   // Final fallback to process.env (may be masked by your shell/IDE)
//   return {
//     apiKey: process.env.OPENAI_API_KEY,
//     project: process.env.OPENAI_PROJECT_ID,
//     source: 'process.env',
//   };
// }

// @Injectable()
// export class AiService {
//   private openai: OpenAI;

//   constructor() {
//     const { apiKey, project, source } = loadOpenAISecrets();

//     // Debug (safe): show where it came from + snippet/length, not the full secret.
//     const snippet = apiKey?.slice(0, 20) ?? '';
//     const len = apiKey?.length ?? 0;
//     console.log('🔑 OPENAI key source:', source);
//     console.log('🔑 OPENAI key snippet:', JSON.stringify(snippet));
//     console.log('🔑 OPENAI key length:', len);
//     console.log('📂 CWD:', process.cwd());

//     // Guards: catch masked/bad keys ASAP.
//     if (!apiKey) {
//       throw new Error('OPENAI_API_KEY not found in .env or environment.');
//     }
//     // Reject obviously masked placeholders like "sk-xxxxx***"
//     if (/^sk-?x{3,}/i.test(apiKey)) {
//       throw new Error(
//         'OPENAI_API_KEY appears masked (e.g., "sk-xxxxx..."). Read from the correct .env instead.',
//       );
//     }
//     // Accept both "sk-proj-" and normal "sk-" formats; prefer project-scoped key.
//     if (!apiKey.startsWith('sk-')) {
//       throw new Error('OPENAI_API_KEY is malformed — must start with "sk-".');
//     }

//     this.openai = new OpenAI({ apiKey, project });
//   }

//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }
// }

/////////////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// @Injectable()
// export class AiService {
//   private openai: OpenAI;

//   constructor() {
//     const apiKey = process.env.OPENAI_API_KEY;
//     const project = process.env.OPENAI_PROJECT_ID;
//     console.log('ENV KEY >>>', JSON.stringify(process.env.OPENAI_API_KEY));
//     console.log('ENV LENGTH >>>', process.env.OPENAI_API_KEY?.length);
//     console.log('DOTENV PATH >>>', process.env.PWD);

//     console.log('OPENAI_API_KEY loaded?', apiKey?.slice(0, 10));

//     this.openai = new OpenAI({
//       apiKey,
//       project,
//     });
//   }

//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     const completion = await this.openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }
// }

///////////////

// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai';
// import { ChatDto } from './dto/chat.dto';

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
//   project: process.env.OPENAI_PROJECT_ID,
// });
// console.log('OPENAI_API_KEY loaded?', process.env.OPENAI_API_KEY?.slice(0, 10));

// @Injectable()
// export class AiService {
//   /** Handles AI chat and returns GPT response (no DB logging) */
//   async chat(dto: ChatDto) {
//     const { messages } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 🧠 Call GPT
//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';

//     return { reply: aiReply };
//   }
// }

///////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import OpenAI from 'openai';
// import { PromptDto } from './dto/prompt.dto';
// import { ChatDto } from './dto/chat.dto';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// // const openai = new OpenAI({
// //   apiKey: process.env.OPENAI_API_KEY,
// //   project: process.env.OPENAI_PROJECT_ID,
// // });
// // console.log('OPENAI_API_KEY loaded?', process.env.OPENAI_API_KEY?.slice(0, 10));

// @Injectable()
// export class AiService {
//   async handlePrompt(dto: PromptDto) {
//     const {
//       user_id,
//       prompt,
//       ai_response_summary,
//       location,
//       weather,
//       suggested_outfit_id,
//     } = dto;

//     const res = await pool.query(
//       `INSERT INTO ai_prompts (
//          user_id, prompt, ai_response_summary, location, weather, suggested_outfit_id
//        ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id;`,
//       [
//         user_id,
//         prompt,
//         ai_response_summary ?? null,
//         location ?? null,
//         weather ?? null,
//         suggested_outfit_id ?? null,
//       ],
//     );

//     return { message: 'Prompt logged', prompt_id: res.rows[0].id };
//   }

//   async chat(dto: ChatDto) {
//     const { user_id, messages, location, weather, suggested_outfit_id } = dto;

//     const lastUserMsg = [...messages]
//       .reverse()
//       .find((m) => m.role === 'user')?.content;
//     if (!lastUserMsg) throw new Error('No user message provided');

//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ??
//       'Styled response unavailable.';
//     const aiSummary = aiReply.slice(0, 240);

//     void this.handlePrompt({
//       user_id: user_id ?? 'anon',
//       prompt: lastUserMsg,
//       ai_response_summary: aiSummary,
//       location,
//       weather,
//       ...(suggested_outfit_id ? { suggested_outfit_id } : {}),
//     });

//     return { reply: aiReply };
//   }
// }

/////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import OpenAI from 'openai';
// import { PromptDto } from './dto/prompt.dto';
// import { ChatDto } from './dto/chat.dto';

// const pool = new Pool();

// // const openai = new OpenAI({
// //   apiKey: process.env.OPENAI_API_KEY,
// //   project: process.env.OPENAI_PROJECT_ID,
// // });
// // console.log('OPENAI_API_KEY loaded?', process.env.OPENAI_API_KEY?.slice(0, 10));

// @Injectable()
// export class AiService {
//   /** Logs a user prompt + optional AI response summary into ai_prompts table */
//   async handlePrompt(dto: PromptDto) {
//     const {
//       user_id,
//       prompt,
//       ai_response_summary,
//       location,
//       weather,
//       suggested_outfit_id,
//     } = dto;

//     const res = await pool.query(
//       `
//       INSERT INTO ai_prompts (
//         user_id,
//         prompt,
//         ai_response_summary,
//         location,
//         weather,
//         suggested_outfit_id
//       )
//       VALUES ($1, $2, $3, $4, $5, $6)
//       RETURNING id;
//       `,
//       [
//         user_id,
//         prompt,
//         ai_response_summary ?? null,
//         location ?? null,
//         weather ?? null,
//         suggested_outfit_id ?? null,
//       ],
//     );

//     return { message: 'Prompt logged', prompt_id: res.rows[0].id };
//   }

//   /** Handles AI chat, returns GPT-5 response and logs summary */
//   async chat(dto: ChatDto) {
//     const { user_id, messages, location, weather, suggested_outfit_id } = dto;

//     const lastUserMsg = messages
//       .slice()
//       .reverse()
//       .find((m) => m.role === 'user')?.content;

//     if (!lastUserMsg) {
//       throw new Error('No user message provided');
//     }

//     // 🧠 Call GPT-5
//     const completion = await openai.chat.completions.create({
//       model: 'gpt-4o',
//       temperature: 0.8,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a world-class personal fashion stylist. Give sleek, modern, practical outfit advice with attention to silhouette, color harmony, occasion, climate, and user comfort. Keep responses concise and actionable.',
//         },
//         ...messages,
//       ],
//     });

//     const aiReply =
//       completion.choices[0]?.message?.content?.trim() ||
//       'Styled response unavailable.';
//     const aiSummary = aiReply.slice(0, 240);

//     // 📝 Fire-and-forget log to ai_prompts
//     void this.handlePrompt({
//       user_id: user_id || 'anon',
//       prompt: lastUserMsg,
//       ai_response_summary: aiSummary,
//       location,
//       weather,
//       ...(suggested_outfit_id ? { suggested_outfit_id } : {}),
//     });

//     return { reply: aiReply };
//   }
// }

////////////////////

// import { Injectable } from '@nestjs/common';
// import { Pool } from 'pg';
// import { PromptDto } from './dto/prompt.dto';

// const pool = new Pool();

// @Injectable()
// export class AiService {
//   async handlePrompt(dto: PromptDto) {
//     const {
//       user_id,
//       prompt,
//       ai_response_summary,
//       location,
//       weather,
//       suggested_outfit_id,
//     } = dto;

//     const res = await pool.query(
//       `
//       INSERT INTO ai_prompts (
//         user_id, prompt, ai_response_summary, location, weather, suggested_outfit_id
//       ) VALUES ($1, $2, $3, $4, $5, $6)
//       RETURNING id;
//     `,
//       [
//         user_id,
//         prompt,
//         ai_response_summary,
//         location,
//         weather,
//         suggested_outfit_id,
//       ],
//     );

//     return { message: 'Prompt logged', prompt_id: res.rows[0].id };
//   }
// }
