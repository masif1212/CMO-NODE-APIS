import axios, { AxiosInstance } from 'axios';

interface LLMClientOptions {
  apiKey: string;
  apiUrl: string;
}

interface GenerateOptions {
  prompt: string;
  responseFormat: 'json' | 'text';
  maxRetries?: number;
}

export class LLMClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(options: LLMClientOptions) {
    this.apiKey = options.apiKey;
    this.client = axios.create({
      baseURL: options.apiUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  public async generate(options: GenerateOptions): Promise<string> {
    const { prompt, responseFormat, maxRetries = 3 } = options;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const response = await this.client.post('/completions', {
          prompt,
          response_format: responseFormat === 'json' ? { type: 'json_object' } : undefined,
          max_tokens: 4000, // Adjust based on your needs
          temperature: 0.7,
           // Adjust for creativity vs. determinism
        });

        // Assuming the API returns a JSON response with a 'text' or 'content' field
        const result = response.data?.choices?.[0]?.text || response.data?.content;
        if (!result) {
          throw new Error('No valid response from LLM');
        }

        // Validate JSON if responseFormat is 'json'
        if (responseFormat === 'json') {
          try {
            JSON.parse(result);
          } catch (error) {
            throw new Error('Invalid JSON response from LLM');
          }
        }

        return result;
      } catch (error) {
        attempts++;
        console.error(`LLM request failed (attempt ${attempts}):`, error);
        if (attempts >= maxRetries) {
          throw new Error('Max retries reached for LLM request');
        }
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
      }
    }

    throw new Error('Failed to generate response from LLM');
  }
}