import { Action, Output, Input, AccessData, Metadata } from '../types';
import { escapeNewLines, hideSecret, parseRawOutputToJson } from './misc';

export function getModalConfig(errorMessage?: string): any {
  var blocks = [];

  if (errorMessage) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔴 ERROR: ${errorMessage}`,
      },
    });
  }

  blocks.push({
    type: 'input',
    block_id: 'runner_url',
    label: {
      type: 'plain_text',
      text: 'Runner URL',
    },
    element: {
      action_id: 'content',
      type: 'plain_text_input',
    },
  });

  blocks.push({
    type: 'input',
    block_id: 'api_key',
    label: {
      type: 'plain_text',
      text: 'API Key',
    },
    element: {
      action_id: 'content',
      type: 'plain_text_input',
    },
  });

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `After you connect the app to the runner, every user in this Slack workspace can run actions from the runner.`,
    },
  });

  const modal = {
    type: 'modal',
    private_metadata: 'update_configuration_modal', // This is required to identify the modal in the actions handler
    title: {
      type: 'plain_text',
      text: 'Conect to runner',
    },
    submit: {
      type: 'plain_text',
      text: 'Connect',
    },
    blocks,
  };

  return modal;
}

export function getBlocksForNotAuthenticatedUser(): any[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Configuration required',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Please connect the app to a runner to continue.',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Conect to runner',
          },
          style: 'primary',
          action_id: 'update_configuration',
        },
      ],
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Support',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'See more information about the app in the <https://docs.connery.io/docs/clients/native/slack|documentation>. \n\nIf you have any questions or need help, please get in touch with us at support@connery.io.',
      },
    },
  ];
}

export function getBlocksforActionApproval({
  action,
  userInput,
  type,
  errorMessage,
  actionOutput,
}: {
  action: Action;
  userInput: Input;
  type: 'show' | 'cancel' | 'loading' | 'success' | 'error';
  errorMessage?: string;
  actionOutput?: Output;
}): any[] {
  let blocks = [];

  let foundActionMessage;
  let runActionButtonText;
  if (action.inputParameters.length > 0) {
    foundActionMessage = 'Based on your request, I found the following action and prefilled input parameters:';
    runActionButtonText = 'Run action with parameters';
  } else {
    foundActionMessage = 'Based on your request, I found the following action:';
    runActionButtonText = 'Run action';
  }

  blocks.push(
    ...[
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: foundActionMessage,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚡ *${action.title}* \n${action.description}`,
        },
      },
    ],
  );

  blocks.push({
    type: 'divider',
  });

  if (action.inputParameters.length > 0) {
    action.inputParameters.forEach((inputParameter) => {
      if (type === 'show') {
        const inputBlock = {
          type: 'input',
          block_id: inputParameter.key,
          element: {
            type: 'plain_text_input',
            action_id: 'content',
            initial_value: escapeNewLines(userInput[inputParameter.key]),
          },
          label: {
            type: 'plain_text',
            text: `${inputParameter.title}${inputParameter.validation.required ? ' (required)' : ''}`,
          },
        };

        // Add input description if available
        if (inputParameter.description) {
          inputBlock['hint'] = {
            type: 'plain_text',
            text: `${inputParameter.description}`,
          };
        }

        blocks.push(inputBlock);
      } else {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${inputParameter.title}*: ${userInput[inputParameter.key] || ''}`,
          },
        });
      }
    });
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'This action does not have any input parameters.',
      },
    });
  }

  blocks.push({
    type: 'divider',
  });

  if (type === 'show') {
    const metadata: Metadata = { action };

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'run_action',
          style: 'primary',
          text: {
            type: 'plain_text',
            text: runActionButtonText,
          },
          value: JSON.stringify(metadata),
        },
        {
          type: 'button',
          action_id: 'cancel_action',
          text: {
            type: 'plain_text',
            text: 'Cancel',
          },
          value: JSON.stringify(metadata),
        },
      ],
    });
  } else if (type === 'cancel') {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '⚪ The action was cancelled without running.',
      },
    });
  } else if (type === 'loading') {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🔵 The action is running...',
      },
    });
  } else if (type === 'success') {
    let message = '🟢 The action was successfully run.';

    if (actionOutput && Object.keys(actionOutput).length > 0) {
      const formattedOutputJson = JSON.stringify(parseRawOutputToJson(actionOutput), null, 2);
      message = `🟢 The action was successfully run with the following raw output: \n\n \`\`\`${formattedOutputJson}\`\`\``;
    }

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: message,
      },
    });
  } else if (type === 'error') {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🔴 Error happened while running the action: \n\n \`\`\`${errorMessage}\`\`\``,
      },
    });
  }

  return blocks;
}

export function blocksForAuthenticatedUser(accessData: AccessData, availableActions: string): any[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Welcome! This app lets you run action from the runner using natural language.',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'For example, you can ask the app "List what you can do" to see the list of available actions.',
      },
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Available actions',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Below, is a list of available actions installed on the runner. You can ask the app to run any of them using natural language. \nThe actions are grouped by the plugins they belong to.',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: availableActions,
      },
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Configuration',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'The app is connected to the runner and ready to use:',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `- Runner URL: \`${accessData.runner_url}\`\n- API Key: \`${hideSecret(accessData.runner_api_key)}\``,
      },
      accessory: {
        type: 'button',
        action_id: 'update_configuration',
        text: {
          type: 'plain_text',
          text: 'Update configuration',
        },
      },
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Support',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'See more information about the app in the <https://docs.connery.io/docs/clients/native/slack|documentation>. \n\nIf you have any questions or need help, please get in touch with us at support@connery.io.',
      },
    },
  ];
}
