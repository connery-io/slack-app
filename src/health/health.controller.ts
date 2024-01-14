import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, HealthCheck } from '@nestjs/terminus';
//import { ConfigService } from '@nestjs/config';

@Controller('/health')
export class HealthController {
  constructor(private health: HealthCheckService) //private http: HttpHealthIndicator,
  //private configService: ConfigService,
  {}

  @Get()
  @HealthCheck()
  async check() {
    try {
      await this.health.check([]);
    } catch (error: any) {
      console.log('Health ERROR', error);

      return {
        status: 'error',
        error: {
          message: error.message,
        },
      };
    }

    console.log('Health OK');

    return {
      status: 'ok',
    };
  }
}
