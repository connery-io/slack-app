import { Inject, Injectable } from '@nestjs/common';
const { InstallProvider, LogLevel } = require('@slack/oauth');
import { ConfigService } from '@nestjs/config';
import { SlackAppDataService } from './slack-app-data.service';
const { WebClient } = require('@slack/web-api');

Injectable();
export class AuthService {
  private _scopes = ['app_mentions:read', 'im:history', 'chat:write'];
  private _userScopes = [''];
  private _installer: any;

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    private slackappDatabaseService: SlackAppDataService,
  ) {
    this._installer = new InstallProvider({
      clientId: configService.get<string>('SLACK_CLIENT_ID'),
      clientSecret: configService.get<string>('SLACK_CLIENT_SECRET'),
      authVersion: 'v2',
      scopes: this._scopes,
      userScopes: this._userScopes,
      installationStore: {
        storeInstallation: this.storeInstallation.bind(this),
        fetchInstallation: this.fetchInstallation.bind(this),
        deleteInstallation: this.deleteInstallation.bind(this),
      },
      logLevel: LogLevel.DEBUG,
      stateVerification: false,
    });
  }

  async handleInstall(req: any, res: any) {
    await this._installer.handleInstallPath(
      req,
      res,
      {},
      {
        scopes: this._scopes,
        userScopes: this._userScopes,
      },
    );
  }

  async handleCallback(req: any, res: any) {
    await this._installer.handleCallback(req, res);
  }

  async getClient(teamId: string) {
    const token = await this.getToken(teamId);
    const webClient = new WebClient(token);
    return webClient;
  }

  private async getToken(teamId: string) {
    // org wide installation is not supported
    let dbInstallData = await this._installer.authorize({ teamId });
    return dbInstallData.botToken;
  }

  private async storeInstallation(installation) {
    // org wide installation is not supported
    await this.slackappDatabaseService.storeInstallation(installation.team.id, installation);
  }

  private async fetchInstallation(installQuery) {
    // org wide installation is not supported
    return await this.slackappDatabaseService.fetchInstallation(installQuery.teamId);
  }

  private async deleteInstallation(installQuery) {
    // org wide installation is not supported
    await this.slackappDatabaseService.deleteInstallation(installQuery.teamId);
  }
}
