import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { RunnerConfig } from './types';

Injectable();
export class SlackAppDataService {
  private _supabase: SupabaseClient;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const supabaseUrl = configService.get<string>('SLACK_APP_SUPABASE_URL');
    const apiKey = configService.get<string>('SLACK_APP_SUPABASE_PRIVATE_API_KEY');

    this._supabase = createClient(supabaseUrl, apiKey);
  }

  async storeInstallation(id, data) {
    const { error } = await this._supabase.from('slack_installations').upsert([{ id, data }]);

    if (error) {
      console.error(error);
    }
  }

  async fetchInstallation(id) {
    const { data, error } = await this._supabase.from('slack_installations').select('data').eq('id', id);

    if (error) {
      console.error(error);
      throw error;
    }

    return data.length > 0 ? data[0].data : null;
  }

  async deleteInstallation(id) {
    const { error } = await this._supabase.from('slack_installations').delete().eq('id', id);

    if (error) {
      console.error(error);
    }
  }

  async storeRunnerConfig(data: RunnerConfig) {
    try {
      const { error } = await this._supabase.from('slack_runners').upsert([data]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async fetchRunnerConfig(slackTeamId: string): Promise<RunnerConfig | null> {
    const { data, error } = await this._supabase.from('slack_runners').select('*').eq('slack_team_id', slackTeamId);

    if (error) {
      console.error(error);
      throw error;
    }

    return data.length > 0 ? (data[0] as RunnerConfig) : null;
  }
}
