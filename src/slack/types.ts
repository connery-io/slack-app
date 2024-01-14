//
// Runner API types
//

export type ApiResponse<T> = {
  status: 'success';
  data: T;
};

export type Input = {
  [key: string]: string;
};

export type Output = {
  [key: string]: string;
};

export type IdentifyActionResult = {
  identified: boolean;
  actionId?: string;
  input?: Input;
  used: {
    prompt: string;
  };
};

export type PluginShort = {
  id: string;
  key: string;
  title: string;
  description: string;
};

export type Parameter = {
  key: string;
  title: string;
  description: string;
  type: string;
  validation: {
    required: boolean;
  };
};

export type Action = {
  id: string;
  key: string;
  title: string;
  description: string;
  type: string;
  inputParameters: Parameter[];
  outputParameters: Parameter[];
  pluginId: string;
};

export type Plugin = PluginShort & {
  actions: Action[];
};

export type RunActionResult = {
  output: Output;
  used: {
    actionId: string;
    input: Input;
  };
};

//
// Slack types
//

export type Metadata = {
  action: Action;
};

export type AccessData = {
  runner_url: string;
  runner_api_key: string;
};

export type RunnerConfig = {
  slack_team_id: string;
  runner_url: string;
  runner_api_key: string;
};
