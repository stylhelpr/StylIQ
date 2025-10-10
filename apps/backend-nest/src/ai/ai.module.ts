import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DatabaseService } from '../db/database.service';
import { VertexService } from '../vertex/vertex.service'; // ✅ added

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/backend-nest/.env', // ✅ explicit .env path
    }),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    DatabaseService,
    VertexService, // ✅ inject VertexService here
  ],
  exports: [AiService],
})
export class AiModule {}

//////////////////

// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { AiController } from './ai.controller';
// import { AiService } from './ai.service';
// import { DatabaseService } from '../db/database.service';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//       envFilePath: 'apps/backend-nest/.env', // ⬅️ explicitly point to your .env file
//     }),
//   ],
//   controllers: [AiController],
//   providers: [AiService, DatabaseService],
// })
// export class AiModule {}

//////////////////

// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { AiController } from './ai.controller';
// import { AiService } from './ai.service';
// import { DatabaseService } from '../db/database.service';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true, // ensures envs are loaded for the whole app
//     }),
//   ],
//   controllers: [AiController],
//   providers: [AiService, DatabaseService],
// })
// export class AiModule {}

////////////////////////

// import { Module } from '@nestjs/common';
// import { AiController } from './ai.controller';
// import { AiService } from './ai.service';
// import { DatabaseService } from '../db/database.service';

// @Module({
//   controllers: [AiController],
//   providers: [AiService, DatabaseService], // ✅ inject
// })
// export class AiModule {}

//////////////////////

// import { Module } from '@nestjs/common';
// import { AiController } from './ai.controller';
// import { AiService } from './ai.service';

// @Module({
//   controllers: [AiController],
//   providers: [AiService],
// })
// export class AiModule {}
