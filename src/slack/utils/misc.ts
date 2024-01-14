import { Output, Parameter, Input } from '../types';

export function removeUsernameFromText(message: string): string {
  if (message) {
    return message.replace(/<@[^\s>]+>/, '').trim();
  } else {
    return message;
  }
}

export function hideSecret(secret: string): string {
  if (secret.length <= 5) {
    return '*****';
  }

  const firstFiveChars = secret.slice(0, 5);
  const remainingChars = '*'.repeat(secret.length - 5);

  return firstFiveChars + remainingChars;
}

export function escapeNewLines(text: string): string {
  if (text) {
    return text.replace(/\n/g, '\\n');
  } else {
    return text;
  }
}

export function retrieveInputParametersFromState(state: any, inputParameters: Parameter[]): Input {
  let result = {};

  inputParameters.forEach((inputParameter: Parameter) => {
    result[inputParameter.key] = unescapeNewLines(state[inputParameter.key].content.value);
  });

  return result;
}

export function parseRawOutputToJson(rawOutput: Output): any {
  const tryParseJSON = (str: string) => {
    try {
      // If the value is JSON string, parse it to JSON object
      return JSON.parse(str);
    } catch (e) {
      return str;
    }
  };

  const result = {};

  for (const key in rawOutput) {
    result[key] = tryParseJSON(rawOutput[key]);
  }

  return result;
}

function unescapeNewLines(text: string): string {
  if (text) {
    return text.replace(/\\n/g, '\n');
  } else {
    return text;
  }
}
