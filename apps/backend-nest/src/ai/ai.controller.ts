import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('chat')
  chat(@Body() dto: ChatDto) {
    return this.service.chat(dto);
  }

  // 🧠 New endpoint for AI stylist suggestions
  @Post('suggest')
  suggest(@Body() body: any) {
    return this.service.suggest(body);
  }
}

////////////

// import { Controller, Post, Body } from '@nestjs/common';
// import { AiService } from './ai.service';
// import { ChatDto } from './dto/chat.dto';

// @Controller('ai')
// export class AiController {
//   constructor(private readonly service: AiService) {}

//   @Post('chat')
//   chat(@Body() dto: ChatDto) {
//     return this.service.chat(dto);
//   }
// }

///////////////

// import { Controller, Post, Body } from '@nestjs/common';
// import { AiService } from './ai.service';
// import { PromptDto } from './dto/prompt.dto';
// import { ChatDto } from './dto/chat.dto';

// @Controller('ai')
// export class AiController {
//   constructor(private readonly service: AiService) {}

//   // @Post('prompt')
//   // logPrompt(@Body() dto: PromptDto) {
//   //   return this.service.handlePrompt(dto); // ← your existing logger
//   // }

//   @Post('chat')
//   chat(@Body() dto: ChatDto) {
//     return this.service.chat(dto); // ← NEW: GPT-5 relay + logging
//   }
// }

////////////////

// import { Controller, Post, Body } from '@nestjs/common';
// import { AiService } from './ai.service';
// import { PromptDto } from './dto/prompt.dto';

// @Controller('ai')
// export class AiController {
//   constructor(private readonly service: AiService) {}

//   @Post('prompt')
//   logPrompt(@Body() dto: PromptDto) {
//     return this.service.handlePrompt(dto);
//   }
// }
