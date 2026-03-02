import { Module } from '@nestjs/common';
import { ConnectedAccountsController } from './connected-accounts.controller';
import { ConnectedAccountsService } from './connected-accounts.service';
import { OAuthService } from './oauth.service';
import { DatabaseService } from '../db/database.service';

@Module({
  controllers: [ConnectedAccountsController],
  providers: [ConnectedAccountsService, OAuthService, DatabaseService],
  exports: [ConnectedAccountsService, OAuthService],
})
export class ConnectedAccountsModule {}
