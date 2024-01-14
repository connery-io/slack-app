import { Controller, Get, Post, RawBodyRequest, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { EventService } from './event.service';

@Controller('/slack')
export class SlackController {
  constructor(private slackAuthService: AuthService, private slackEventService: EventService) {}

  @Get('/install')
  appInstall(@Req() req: Request, @Res() res: Response) {
    this.slackAuthService.handleInstall(req, res);
  }

  @Get('/redirect')
  authCallback(@Req() req: Request, @Res() res: Response) {
    this.slackAuthService.handleCallback(req, res);
  }

  @Post('/events')
  eventsHandler(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    if (req.body.payload) {
      return;
    }

    // Slack needs a raw body to verify the request signature
    req.body = req.rawBody;
    this.slackEventService.eventsHandler(req, res);
  }

  @Post('/actions')
  actionsHandler(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    this.slackEventService.actionsHandler(JSON.parse(req.body.payload), res);
  }
}
