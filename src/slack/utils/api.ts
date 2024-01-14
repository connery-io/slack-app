import axios from 'axios';
import {
  Plugin,
  AccessData,
  Action,
  ApiResponse,
  IdentifyActionResult,
  Input,
  PluginShort,
  RunActionResult,
} from '../types';

//
// Functions
//

export async function identifyAction(accessData: AccessData, prompt: string): Promise<IdentifyActionResult> {
  const response = await axios.post(
    `${accessData.runner_url}/v1/actions/identify`,
    { prompt },
    {
      headers: {
        'x-api-key': accessData.runner_api_key,
      },
    },
  );

  const apiResponse: ApiResponse<IdentifyActionResult> = response.data;
  const result: IdentifyActionResult = apiResponse.data;
  return result;
}

export async function getAction(accessData: AccessData, actionId: string): Promise<Action> {
  const response = await axios.get(`${accessData.runner_url}/v1/actions/${actionId}`, {
    headers: {
      'x-api-key': accessData.runner_api_key,
    },
  });

  const apiResponse: ApiResponse<Action> = response.data;
  const action: Action = apiResponse.data;
  return action;
}

export async function verifyAccess(accessData: AccessData): Promise<boolean> {
  try {
    await axios.get(`${accessData.runner_url}/v1/verify-access`, {
      headers: {
        'x-api-key': accessData.runner_api_key,
      },
    });
    return true;
  } catch (error: any) {
    console.log(JSON.stringify(error.response.data));
    return false;
  }
}

export async function runAction(accessData: AccessData, actionId: string, userInput: Input): Promise<RunActionResult> {
  const response = await axios.post(
    `${accessData.runner_url}/v1/actions/${actionId}/run`,
    {
      input: userInput,
    },
    {
      headers: {
        'x-api-key': accessData.runner_api_key,
      },
    },
  );

  const apiResponse: ApiResponse<RunActionResult> = response.data;
  const result: RunActionResult = apiResponse.data;
  return result;
}

export async function getPlugins(accessData: AccessData): Promise<PluginShort[]> {
  const response = await axios.get(`${accessData.runner_url}/v1/plugins`, {
    headers: {
      'x-api-key': accessData.runner_api_key,
    },
  });

  const apiResponse: ApiResponse<PluginShort[]> = response.data;
  const plugins: PluginShort[] = apiResponse.data;
  return plugins;
}

export async function getPlugin(accessData: AccessData, pluginId: string): Promise<Plugin> {
  const response = await axios.get(`${accessData.runner_url}/v1/plugins/${pluginId}`, {
    headers: {
      'x-api-key': accessData.runner_api_key,
    },
  });

  const apiResponse: ApiResponse<Plugin> = response.data;
  const plugin: Plugin = apiResponse.data;
  return plugin;
}
