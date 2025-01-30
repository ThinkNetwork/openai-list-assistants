window.function = async function(api_key, system_prompt, message, model, temperature, max_tokens, frequency_penalty, json) {
  // GET VALUES FROM INPUTS, WITH DEFAULT VALUES WHERE APPLICABLE
  const apiKey = api_key.value ?? "";
  const systemPromptValue = system_prompt.value ?? "You are a helpful assistant.";
  const messageValue = message.value ?? "";
  const modelValue = model.value ?? "gpt-4o-mini";
  const temperatureValue = temperature.value ?? 1.0;
  const maxCompletionTokensValue = max_tokens.value ?? 4096;
  const frequencyPenaltyValue = frequency_penalty.value ?? 0.0;
  const jsonValue = json.value ?? "";

  // INPUT VALIDATION
  if (!apiKey) {
    return "Error: API Key is required.";
  }
  if (!messageValue) {
    return "Error: Please enter a message.";
  }

  // VALIDATE NUMERICAL INPUTS WITHIN ALLOWED RANGES
  const temperatureNum = parseFloat(temperatureValue);
  const maxCompletionTokens = parseInt(maxCompletionTokensValue);
  const frequencyPenaltyNum = parseFloat(frequencyPenaltyValue);

  // VALIDATE TEMPERATURE (0 TO 2)
  if (isNaN(temperatureNum) || temperatureNum < 0 || temperatureNum > 2) {
    return "Error: Temperature must be a number between 0 and 2.";
  }

  // MAP OF MODELS TO THEIR MAX_COMPLETION_TOKENS LIMITS
  const modelMaxCompletionTokens = {
    'gpt-4o': 16384,
    'gpt-4o-2024-11-20': 16384,
    'gpt-4o-2024-08-06': 16384,
    'gpt-4o-2024-05-13': 4096,
    'chatgpt-4o-latest': 16384,
    'gpt-4o-mini': 16384,
    'gpt-4o-mini-2024-07-18': 16384,
    'gpt-4o-realtime-preview': 4096,
    'gpt-4o-realtime-preview-2024-10-01': 4096,
    'gpt-4o-audio-preview': 16384,
    'gpt-4o-audio-preview-2024-10-01': 16384,
    'o1-preview': 32768,
    'o1-preview-2024-09-12': 32768,
    'o1-mini': 65536,
    'o1-mini-2024-09-12': 65536,
    'gpt-4-turbo': 4096,
    'gpt-4-turbo-2024-04-09': 4096,
    'gpt-4-turbo-preview': 4096,
    'gpt-4-0125-preview': 4096,
    'gpt-4-1106-preview': 4096,
    'gpt-4': 8192,
    'gpt-4-0613': 8192,
    'gpt-4-0314': 8192,
    'gpt-3.5-turbo-0125': 4096,
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-1106': 4096,
    'gpt-3.5-turbo-instruct': 4096
  };

  // GET THE MAX_COMPLETION_TOKENS LIMIT FOR THE SELECTED MODEL
  const modelKey = modelValue.toLowerCase();
  const maxCompletionTokensLimit = modelMaxCompletionTokens[modelKey] ?? 4096;

  // VALIDATE MAXCOMPLETIONTOKENS BASED ON THE MODEL'S LIMIT
  if (isNaN(maxCompletionTokens) || maxCompletionTokens < 1 || maxCompletionTokens > maxCompletionTokensLimit) {
    return `Error: Maximum completion tokens must be a number between 1 and ${maxCompletionTokensLimit}.`;
  }

  // VALIDATE FREQUENCY_PENALTY (-2.0 TO 2.0)
  if (isNaN(frequencyPenaltyNum) || frequencyPenaltyNum < -2.0 || frequencyPenaltyNum > 2.0) {
    return "Error: Frequency penalty must be a number between -2.0 and 2.0.";
  }

  // DETERMINE IF THE MODEL IS A REASONING MODEL
  const reasoningModels = ['o1-mini', 'o1-preview'];
  const isReasoningModel = reasoningModels.includes(modelKey);

  // BUILD THE REQUEST PAYLOAD
  let payload = {
    model: modelValue,
    messages: []
  };

  // INITIALIZE VARIABLE FOR JSON MESSAGE
  let jsonMessage = "";

  if (jsonValue) {
    // TRY TO PARSE THE JSON TO SEE IF IT'S VALID
    try {
      const parsedJson = JSON.parse(jsonValue);

      // CHECK IF JSON IS EMPTY
      if (Object.keys(parsedJson).length === 0) {
        return "Error: Invalid JSON Schema - Schema is empty.";
      }
    } catch (e) {
      return "Error: Invalid JSON Schema";
    }

    // CREATE THE JSON MESSAGE
    jsonMessage = `You must format your output as a JSON value. Your output will be parsed and type-checked according to the provided schema, so make sure all fields in your output match the schema exactly and there are no trailing commas! Do not, under any circumstances, include markdown or a markdown code-block in your response. Your response should be raw JSON only, with nothing else added.\n\nHere is the JSON Schema your output must adhere to:\n\n${jsonValue}`;
  }

  if (isReasoningModel) {
    // REASONING MODELS (NO SYSTEM PROMPT OR PARAMETERS)
    let combinedMessage = `${systemPromptValue}\n\n${messageValue}`;
    if (jsonMessage) {
      combinedMessage += `\n\n${jsonMessage}`;
    }
    payload.messages = [
      { role: 'user', content: combinedMessage }
    ];
  } else {
    // STANDARD MODELS
    // CREATE FINALMESSAGEVALUE TO AVOID OVERWRITING MESSAGEVALUE
    let finalMessageValue = messageValue;
    if (jsonMessage) {
      // APPEND JSON MESSAGE TO THE USER'S MESSAGE IF PROVIDED
      finalMessageValue += `\n\n${jsonMessage}`;
    }
    payload.messages = [
      { role: 'system', content: systemPromptValue },
      { role: 'user', content: finalMessageValue }
    ];
    payload.temperature = temperatureNum;
    payload.max_completion_tokens = maxCompletionTokens;
    payload.frequency_penalty = frequencyPenaltyNum;
  }

  // PERFORM POST REQUEST TO OPENAI
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    // IF THERE'S AN ERROR, RETURN THE ERROR MESSAGE
    if (!response.ok) {
      let errorMessage = `Error ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.message) {
          errorMessage += `: ${errorData.error.message}`;
        }
      } catch (e) {
        errorMessage += ": Unable to parse error details.";
      }
      return errorMessage;
    }

    // ELSE, PARSE THE RESPONSE
    let data;
    try {
      data = await response.json();
    } catch (e) {
      return "Error: Failed to parse API response.";
    }

    // SAFELY ACCESS ASSISTANT'S MESSAGE
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      const assistantMessage = data.choices[0].message.content.trim();
      // RETURN THE ASSISTANT MESSAGE
      return assistantMessage;
    } else {
      return "Error: Received an invalid response from the API.";
    }

  } catch (error) {
    // CATCH ANY ERRORS THAT OCCUR WHILE FETCHING THE RESPONSE
    return `Error: Request failed - ${error.message}`;
  }
};
