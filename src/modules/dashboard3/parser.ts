export function parseCompetitorData(aiResponse: string): {
    name: string;
    website_url: string;
    industry: string;
    region: string;
    target_audience: string;
    primary_offering: string;
    usp: string;
}[] {
    try {
        if (!aiResponse || typeof aiResponse !== 'string') throw new Error('Empty or invalid response');

        // Step 1: Strip Markdown code blocks
        const cleanResponse = aiResponse
            .replace(/^```(?:json)?\s*/i, '') // Remove opening code block
            .replace(/```$/, '')             // Remove closing code block
            .trim();

        // Step 2: Attempt direct JSON parse
        try {
            const parsed = JSON.parse(cleanResponse);
            if (!Array.isArray(parsed)) throw new Error('Expected array');
            return normalizeCompetitorArray(parsed);
        } catch {
            // Step 3: Extract the first JSON array using regex
            const match = cleanResponse.match(/\[[\s\S]*\]/);
            if (match) {
                const extracted = JSON.parse(match[0]);
                if (!Array.isArray(extracted)) throw new Error('Extracted JSON is not an array');
                return normalizeCompetitorArray(extracted);
            }
        }

        throw new Error('No valid JSON array found');
    } catch (err) {
        console.error('Failed to parse LLM JSON response:', err);
        return [];
    }
}

function normalizeCompetitorArray(raw: any[]): ReturnType<typeof parseCompetitorData> {
    return raw.map(comp => ({
        name: comp.name?.toString().trim() || '',
        website_url: comp.website_url?.toString().trim() || '',
        industry: comp.industry?.toString().trim() || '',
        region: comp.region?.toString().trim() || '',
        target_audience: comp.target_audience?.toString().trim() || '',
        primary_offering: comp.primary_offering?.toString().trim() || '',
        usp: comp.usp?.toString().trim() || ''
    }));
}

