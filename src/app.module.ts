import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { SlackModule } from './slack/slack.module';

@Module({
  imports: [ConfigModule.forRoot(), HealthModule, SlackModule],
})
export class AppModule {}
