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
          // response_format: responseFormat === 'json' ? { type: 'json_object' } : undefined,
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




     const systemPrompt = `
You are a Chief Marketing Officer (CMO) tasked with generating a full strategic marketing report based on provided data. The data includes:

- website_analytics: Technical SEO performance, content engagement, traffic sources, UX issues, and site optimization.
- social_media: Platform performance, engagement rates, content types, and growth strategies.
- competitor_analysis: Insights into competitor marketing, content, pricing, SEO, and social strategy.

Generate a detailed, multi-section report **that not only recommends strategies, but also explains how each recommendation influences or enhances others.** Emphasize the **interconnections between SEO, social media, user experience, and competitive positioning.**

Use the following structure:

---

**1. Executive Summary**  
- Provide a concise overview of the business’s marketing strengths, weaknesses, and opportunity areas.  
- Mention the synergies between website, social, and competitive insights.

**2. Key Findings (Data-Driven)**  
- Website Analytics  
- Social Media Performance  
- Competitor Analysis  
*(Include only sections for which data is available.)*

**3. Cross-Validated Strategic Recommendations**  
For each recommendation, clearly explain:
- The **primary benefit** (e.g., better SEO, higher engagement, improved ROI)  
- The **secondary effects** it enables in other areas (e.g., “Improved site speed boosts SEO **and** lowers bounce rate, which improves social share success”)  
- How **combined efforts** across areas create compounding growth (e.g., content SEO + social amplification = exponential reach)

**4. Strategic Integration Plan**  
- Short-term actions (0–3 months)  
- Mid-term actions (3–12 months)  
- Prioritize initiatives that unlock multi-channel advantages

**5. Risk & Dependency Notes**  
- Outline where progress in one area depends on another (e.g., “Social performance is gated by content SEO”)

**6. Conclusion**  
- Recap how integrated marketing efforts create a competitive advantage and long-term ROI.

---

Use only the non-null data provided. If all fields are null, generate a general version of this cross-validated report based on best practices in SEO, engagement, and competitive positioning. Avoid referencing third-party tools or external vendors.
`;