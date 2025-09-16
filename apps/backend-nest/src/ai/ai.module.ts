import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DatabaseService } from '../db/database.service';

@Module({
  controllers: [AiController],
  providers: [AiService, DatabaseService], // ✅ inject
})
export class AiModule {}

//////////////////////

// import { Module } from '@nestjs/common';
// import { AiController } from './ai.controller';
// import { AiService } from './ai.service';

// @Module({
//   controllers: [AiController],
//   providers: [AiService],
// })
// export class AiModule {}
