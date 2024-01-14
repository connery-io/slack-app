import { Module } from '@nestjs/common';
import { SlackController } from './slack.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { EventService } from './event.service';
import { SlackAppDataService } from './slack-app-data.service';

@Module({
  imports: [ConfigModule],
  controllers: [SlackController],
  providers: [AuthService, EventService, SlackAppDataService],
  exports: [EventService, SlackAppDataService],
})
export class SlackModule {}
