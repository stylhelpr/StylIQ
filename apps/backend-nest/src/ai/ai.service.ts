import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ChatDto } from './dto/chat.dto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID,
});
console.log('OPENAI_API_KEY loaded?', process.env.OPENAI_API_KEY?.slice(0, 10));

@Injectable()
export class AiService {
  /** Handles AI chat and returns GPT response (no DB logging) */
  async chat(dto: ChatDto) {
    const { messages } = dto;

    const lastUserMsg = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user')?.content;

    if (!lastUserMsg) {
      throw new Error('No user message provided');
    }

    // 🧠 Call GPT
    const completion = await openai.chat.completions.create({
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
}

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
