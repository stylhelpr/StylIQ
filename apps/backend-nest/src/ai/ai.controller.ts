import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { PromptDto } from './dto/prompt.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('prompt')
  logPrompt(@Body() dto: PromptDto) {
    return this.service.handlePrompt(dto);
  }
}
