import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import * as microdata from 'microdata-node';
import * as $rdf from 'rdflib';

interface Schema {
  '@context'?: string;
  '@type'?: string;
  [key: string]: any;
}

interface ValidationResult {
  // schema: Schema | null;
  type: string | null;
  format: string;
  isValid: boolean;
  error?: string;
}

interface GroupedResults {
  [key: string]: ValidationResult[];
}

export interface SchemaOutput {
  url: string;
  message: string;
  schemas: {
    summary: ValidationResult[];
    details: GroupedResults;
  };
}

// ✅ Transform Microdata into JSON-LD-style object
function transformMicrodataToJsonLd(item: any): Schema {
  const type = item.type && item.type[0]?.split('/').pop();
  const properties = item.properties || {};
  const transformed: Schema = {
    '@context': 'https://schema.org',
    '@type': type
  };
  for (const [key, value] of Object.entries(properties)) {
    transformed[key] = Array.isArray(value) && value.length === 1 ? value[0] : value;
  }
  return transformed;
}

// ✅ Ensure @context is set
function ensureContext(schema: Schema): Schema {
  return schema['@context'] ? schema : { ...schema, '@context': 'https://schema.org' };
}

// ✅ Basic schema validation (customize per type if needed)
function validateSchema(schema: Schema): { isValid: boolean; error?: string } {
  if (!schema['@type']) {
    return { isValid: false, error: "Missing '@type'" };
  }

  const type = schema['@type'];

  // Basic required field checks for some common types
  const requiredFieldsMap: Record<string, string[]> = {
    Article: ['headline'],
    Product: ['name', 'offers'],
    Event: ['name', 'startDate'],
    Person: ['name'],
  };

  const requiredFields = requiredFieldsMap[type];
  if (requiredFields) {
    for (const field of requiredFields) {
      if (!schema[field]) {
        return { isValid: false, error: `${type} is missing required field '${field}'` };
      }
    }
  }

  return { isValid: true };
}

// ✅ Main function
export async function validateComprehensiveSchema(url: string): Promise<SchemaOutput> {
  try {
    const response: AxiosResponse = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SchemaValidator/1.0)' },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const results: ValidationResult[] = [];

    // JSON-LD
    $('script[type="application/ld+json"]').each((_, elem) => {
      const content = $(elem).html();
      if (!content) return;

      try {
        const jsonLd = JSON.parse(content);
        const jsonItems = jsonLd['@graph'] ? jsonLd['@graph'] : [jsonLd];

        jsonItems.forEach((item: Schema) => {
          const schema = ensureContext(item);
          const { isValid, error } = validateSchema(schema);
          results.push({ type: schema['@type'] ?? null, format: 'JSON-LD', isValid, error });
        });
      } catch {
        // Skip invalid JSON
      }
    });

    // Microdata
    const microData = microdata.toJson(html, { base: url });
    if (microData?.items?.length) {
      microData.items.forEach((item: any) => {
        const schema = transformMicrodataToJsonLd(item);
        const { isValid, error } = validateSchema(schema);
        results.push({ type: schema['@type'] ?? null, format: 'Microdata', isValid, error });
      });
    }

    // RDFa
    const store = $rdf.graph();
    $rdf.parse(html, store, url, 'text/html');
    const types = store.each(null, $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'));
    types.forEach((typeQuad: any) => {
      const typeValue = typeQuad.object.value.split('/').pop();
      const schema = { '@context': 'https://schema.org', '@type': typeValue };
      const { isValid, error } = validateSchema(schema);
      results.push({ type: typeValue, format: 'RDFa', isValid, error });
    });

    // Group results by type
    const groupedResults: GroupedResults = {};
    results.forEach((result) => {
      const type = result.type || 'Unknown';
      if (!groupedResults[type]) groupedResults[type] = [];
      groupedResults[type].push(result);
    });

    const message = results.length > 0 ? 'Structured data detected' : 'No structured data detected';

     const summary = results.map(({ type, format, isValid, error }) => ({
      type: type ?? 'Unknown',
      format,
      isValid,
      ...(isValid ? {} : { error })
    }));

    return {
      url,
      message,
      schemas: {
        summary,
        details: groupedResults
      }
    };

  } catch (error) {
    return {
      url,
      message: 'Error occurred during schema detection',
      schemas: {
        summary: [],
        details: {}
      }
    };
  }
}
