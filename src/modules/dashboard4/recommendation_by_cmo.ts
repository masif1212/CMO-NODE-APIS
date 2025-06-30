import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';

interface CMORecommendationInput {
  user_id: string;
  website_id: string;
}

interface DashboardRecommendations {
  dashboard1?: string; // Website analytics recommendations
  dashboard2?: string; // Social media analysis recommendations
  dashboard3?: string; // Competitor analysis recommendations
}

interface CMORecommendationOutput {
  recommendation_by_cmo: string;
}

export class CMORecommendationService {
  private prisma: PrismaClient;
  private openai: OpenAI;
  private model: string;

  constructor(prisma: PrismaClient, openai: OpenAI, model: string = 'gpt-4o') {
    this.prisma = prisma;
    this.openai = openai;
    this.model = model;
  }

  // Fetch existing recommendations for a website
  private async fetchRecommendations(user_id: string, website_id: string): Promise<DashboardRecommendations> {
    const llmResponse = await this.prisma.llm_responses.findUnique({
      where: { website_id },
      select: {
        recommendation_by_mo_dashboard1: true,
        recommendation_by_mo_dashboard2: true,
        recommendation_by_mo_dashboard3: true,
      },
    });

    if (!llmResponse) {
      return {};
    }

    // Verify user_id matches the website's user_id
    const website = await this.prisma.user_websites.findUnique({
      where: { website_id: website_id },
      select: { user_id: true },
    });

    if (!website || website.user_id !== user_id) {
      throw new Error('Invalid user_id or website_id');
    }

    return {
      dashboard1: llmResponse.recommendation_by_mo_dashboard1 || undefined,
      dashboard2: llmResponse.recommendation_by_mo_dashboard2 || undefined,
      dashboard3: llmResponse.recommendation_by_mo_dashboard3 || undefined,
    };
  }

  // Generate CMO-level recommendation
  public async generateCMORecommendation(input: CMORecommendationInput): Promise<CMORecommendationOutput> {
    try {
      // Fetch existing recommendations
      const recommendations = await this.fetchRecommendations(input.user_id, input.website_id);

      // Prepare data for the prompt
      const allData = {
        website_analytics: recommendations.dashboard1 || null,
        social_media: recommendations.dashboard2 || null,
        competitor_analysis: recommendations.dashboard3 || null,
      };

      // System prompt for all combinations
      const systemPrompt = `
        You are a Chief Marketing Officer (CMO) tasked with generating a high-level strategic recommendation for a business. Based on the provided data, synthesize a concise, actionable CMO-level recommendation in a single paragraph, focusing on maximizing ROI, brand visibility, and competitive advantage. Use only the available data (website analytics, social media, or competitor analysis) and avoid referencing external tools. Output in JSON format with a single field "recommendation_by_cmo". If no specific data is available, provide a general marketing strategy.
        Example output: {"recommendation_by_cmo": "Optimize website performance and align social media campaigns to boost engagement."}
      `;

      // Log for debugging
      console.log("Generating LLM response...");

      // Call OpenAI directly, mimicking your snippet
      const llmResponse = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0.5,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(allData) },
        ],
        max_tokens: 500,
      });

      // Extract and validate response
      const responseContent = llmResponse.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No valid response from OpenAI');
      }

      let recommendation: CMORecommendationOutput;
      try {
        recommendation = JSON.parse(responseContent);
        if (!recommendation.recommendation_by_cmo) {
          throw new Error('Invalid OpenAI response: missing recommendation_by_cmo');
        }
      } catch (error) {
        console.error('Failed to parse OpenAI response:', error);
        recommendation = {
          recommendation_by_cmo: 'Unable to generate specific recommendation due to processing error. Focus on integrated marketing strategies to enhance brand visibility.',
        };
      }

      // Save recommendation to database
      await this.prisma.llm_responses.upsert({
        where: { website_id: input.website_id },
        update: {
          recommendation_by_cmo: recommendation.recommendation_by_cmo,
          updated_at: new Date(),
        },
        create: {
          id: uuidv4(),
          website_id: input.website_id,
          recommendation_by_cmo: recommendation.recommendation_by_cmo,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return recommendation;
    } catch (error) {
      console.error('Error generating CMO recommendation:', error);
      throw new Error('Failed to generate CMO recommendation');
    }
  }
}