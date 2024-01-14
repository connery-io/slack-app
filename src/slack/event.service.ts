import { Inject, Injectable } from '@nestjs/common';
import { createEventAdapter } from '@slack/events-api';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SlackAppDataService } from 'src/slack/slack-app-data.service';
import { getAction, getPlugin, getPlugins, identifyAction, runAction, verifyAccess } from './utils/api';
import { removeUsernameFromText, retrieveInputParametersFromState } from './utils/misc';
import { Metadata, RunnerConfig, Input, Plugin } from './types';
import {
  blocksForAuthenticatedUser,
  getBlocksForNotAuthenticatedUser,
  getBlocksforActionApproval,
  getModalConfig,
} from './utils/blocks';

Injectable();
export class EventService {
  private _listener: any;

  //
  // Initialization
  //

  constructor(
    @Inject(ConfigService) private configService: ConfigService,
    private authService: AuthService,
    private slackAppDatabaseService: SlackAppDataService,
  ) {
    const slackEventAdapter = createEventAdapter(this.configService.get<string>('SLACK_SIGNING_SECRET'), {
      waitForResponse: true,
      includeBody: true,
    });

    slackEventAdapter.on('app_home_opened', this.handleAppHomeOpenedEvent);
    slackEventAdapter.on('message', this.handleUserRequest);
    slackEventAdapter.on('app_mention', this.handleUserRequest);

    this._listener = slackEventAdapter.requestListener();
  }

  async eventsHandler(req: any, res: any) {
    return await this._listener(req, res);
  }

  //
  // General event handlers
  //

  async actionsHandler(payload: any, res: any) {
    try {
      console.log(JSON.stringify({ function: 'actionsHandler', type: 'log_received_data', payload }));

      const openConfigurationModalAction =
        payload.type === 'block_actions' && payload.actions?.[0]?.action_id === 'update_configuration';
      const submitConfigurationModalAction =
        payload.type === 'view_submission' && payload.view?.private_metadata === 'update_configuration_modal';
      const runConneryAction = payload.type === 'block_actions' && payload.actions?.[0]?.action_id === 'run_action';
      const cancelCnneryAction =
        payload.type === 'block_actions' && payload.actions?.[0]?.action_id === 'cancel_action';

      if (openConfigurationModalAction || submitConfigurationModalAction) {
        await this.configurationModalHandler(payload, res, {
          openConfigurationModalAction,
          submitConfigurationModalAction,
        });
      } else if (runConneryAction) {
        await this.runConneryActionHandler(payload, res);
      } else if (cancelCnneryAction) {
        await this.cancelConneryActionHandler(payload, res);
      }
    } catch (error) {
      console.log(JSON.stringify({ type: 'error', error }));
    }
  }

  private handleAppHomeOpenedEvent = async (event: any, body: any, respond: any) => {
    try {
      // Do not run the function if the tab is not the home tab (e.g. the user is switching to the messages tab)
      if (event.tab !== 'home') {
        respond();
        return;
      }

      console.log(JSON.stringify({ function: 'handleAppHomeOpenedEvent', type: 'log_received_data', event, body }));

      const accessData = await this.slackAppDatabaseService.fetchRunnerConfig(body.team_id);
      const client = await this.authService.getClient(body.team_id);

      let currentHomeView;
      if (accessData && accessData.runner_url && accessData.runner_api_key) {
        const availableActions = await this.pullAvailableActions(body.team_id);
        currentHomeView = blocksForAuthenticatedUser(accessData, availableActions);
      } else {
        currentHomeView = getBlocksForNotAuthenticatedUser();
      }

      await client.views.publish({
        user_id: event.user,
        view: {
          type: 'home',
          blocks: currentHomeView,
        },
      });

      respond();
    } catch (error: any) {
      console.log(JSON.stringify({ type: 'error', error: error.message }));
    }
  };

  private handleUserRequest = async (event: any, body: any, respond: any) => {
    try {
      // Ignore messages from bots and other apps
      if (event.subtype || event.bot_id) {
        respond();
        return;
      }

      console.log(JSON.stringify({ function: 'handleUserRequest', type: 'log_received_data', event, body }));

      // Mark the event as received
      respond();

      const accessData = await this.slackAppDatabaseService.fetchRunnerConfig(event.team);
      const client = await this.authService.getClient(event.team);

      if (accessData && accessData.runner_url && accessData.runner_api_key) {
        // If the runner is configured, send the request to the runner

        try {
          const identifyActionResponse = await identifyAction(accessData, removeUsernameFromText(event.text));

          if (identifyActionResponse.identified) {
            const action = await getAction(accessData, identifyActionResponse.actionId);

            // Send a message to the user to confirm the action
            await client.chat.postMessage({
              channel: event.channel,
              blocks: getBlocksforActionApproval({
                action,
                userInput: identifyActionResponse.input,
                type: 'show',
              }),
              unfurl_links: false,
            });
          } else {
            const message =
              "I'm sorry, I could not identify the action you want to run. Please be more specific and try again.";

            await client.chat.postMessage({
              channel: event.channel,
              text: message,
              unfurl_links: false,
            });

            console.log(
              JSON.stringify({ type: 'action_not_identified_response_sent', response: { message }, event, body }),
            );
          }
        } catch (error) {
          console.log(JSON.stringify({ type: 'error', error }));

          const errorMessage = error.response?.data?.error?.message || error.message;
          console.log(JSON.stringify({ type: 'error_response_sent', response: { errorMessage }, event, body }));
          await client.chat.postMessage({
            channel: event.channel,
            text: `🔴 Error: ${errorMessage}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `🔴 Error: \n\n \`\`\`${errorMessage}\`\`\``,
                },
              },
            ],
            unfurl_links: false,
          });
        }
      } else {
        // If the runner is not configured, ask the user to configure it

        await client.chat.postMessage({
          channel: event.channel,
          blocks: getBlocksForNotAuthenticatedUser(),
          unfurl_links: false,
        });

        console.log(JSON.stringify({ type: 'unauthorized_response_sent', event, body }));
      }
    } catch (error) {
      console.log(JSON.stringify({ type: 'error', error }));
    }
  };

  //
  // Specific event handlers
  //

  private async configurationModalHandler(payload: any, res: any, conditions: any) {
    const client = await this.authService.getClient(payload.team.id);

    if (conditions.openConfigurationModalAction) {
      client.views.open({
        trigger_id: payload.trigger_id,
        view: getModalConfig(),
      });
    } else if (conditions.submitConfigurationModalAction) {
      const teamId = payload.team.id;
      const runnerUrl = payload.view.state.values.runner_url.content.value;
      const apiKey = payload.view.state.values.api_key.content.value;

      // Make a test request to the runner to verify the configuration
      const accessAllowed = await verifyAccess({ runner_url: runnerUrl, runner_api_key: apiKey });

      if (!accessAllowed) {
        const errorMessage =
          'Can not connect to the runner with the provided configuration. Please check the runner URL and API Key.';

        res.send({
          response_action: 'update',
          view: getModalConfig(errorMessage),
        });

        return;
      }

      const runnerConfig: RunnerConfig = {
        slack_team_id: teamId,
        runner_url: runnerUrl,
        runner_api_key: apiKey,
      };

      // Save the configuration to the database
      await this.slackAppDatabaseService.storeRunnerConfig(runnerConfig);

      // Update the home tab
      const availableActions = await this.pullAvailableActions(teamId);
      const homeView = blocksForAuthenticatedUser(runnerConfig, availableActions);
      await client.views.publish({
        user_id: payload.user.id,
        view: {
          type: 'home',
          blocks: homeView,
        },
      });
    }

    // Send empty response to acknowledge the command request and avoid an error
    res.send('');
  }

  private async runConneryActionHandler(payload: any, res: any) {
    const client = await this.authService.getClient(payload.team.id);

    const metadata: Metadata = JSON.parse(payload.actions?.[0]?.value);
    const userInput: Input = retrieveInputParametersFromState(payload.state.values, metadata.action.inputParameters);

    try {
      // Update the message to show the loading state
      await client.chat.update({
        channel: payload.channel.id,
        ts: payload.message.ts,
        blocks: getBlocksforActionApproval({
          action: metadata.action,
          userInput,
          type: 'loading',
        }),
        unfurl_links: false,
      });

      const accessData = await this.slackAppDatabaseService.fetchRunnerConfig(payload.team.id);

      const actionResult = await runAction(accessData, metadata.action.id, userInput);

      // Update the message to show the success state
      await client.chat.update({
        channel: payload.channel.id,
        ts: payload.message.ts,
        blocks: getBlocksforActionApproval({
          action: metadata.action,
          userInput,
          type: 'success',
          actionOutput: actionResult.output,
        }),
        unfurl_links: false,
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;

      // Update the message to show the error state
      await client.chat.update({
        channel: payload.channel.id,
        ts: payload.message.ts,
        blocks: getBlocksforActionApproval({
          action: metadata.action,
          userInput,
          type: 'error',
          errorMessage,
        }),
        unfurl_links: false,
      });
    }

    // Send empty response to acknowledge the command request and avoid an error
    res.send('');
  }

  private async cancelConneryActionHandler(payload: any, res: any) {
    const client = await this.authService.getClient(payload.team.id);

    const metadata: Metadata = JSON.parse(payload.actions?.[0]?.value);

    // Update the message to show the cancel state
    await client.chat.update({
      channel: payload.channel.id,
      ts: payload.message.ts,
      blocks: getBlocksforActionApproval({
        action: metadata.action,
        userInput: retrieveInputParametersFromState(payload.state.values, metadata.action.inputParameters),
        type: 'cancel',
      }),
      unfurl_links: false,
    });

    // Send empty response to acknowledge the command request and avoid an error
    res.send('');
  }

  private async pullAvailableActions(teamId: string): Promise<string> {
    const accessData = await this.slackAppDatabaseService.fetchRunnerConfig(teamId);
    const plugins = await getPlugins(accessData);
    var result = [];

    for (const plugin of plugins) {
      result.push(plugin.title);

      const pluginDetails: Plugin = await getPlugin(accessData, plugin.id);

      for (const action of pluginDetails.actions) {
        result.push(`        ⚡ *${action.title}*`);
      }

      result.push('\n');
    }

    return result.join('\n');
  }
}
