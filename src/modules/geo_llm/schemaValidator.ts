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
  schema: Schema | null;
  type: string | null;
  format: string;
}

interface GroupedResults {
  [key: string]: ValidationResult[];
}

export interface SchemaOutput {
  url: string;
  message: string;
  schemas: GroupedResults;
}

// Transform Microdata into JSON-LD-style object
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

// Ensure @context is set
function ensureContext(schema: Schema): Schema {
  return schema['@context'] ? schema : { ...schema, '@context': 'https://schema.org' };
}

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
        if (jsonLd['@graph']) {
          jsonLd['@graph'].forEach((item: Schema) => {
            const schema = ensureContext(item);
            results.push({ schema, type: schema['@type'] ?? null, format: 'JSON-LD' });
          });
        } else {
          const schema = ensureContext(jsonLd);
          results.push({ schema, type: schema['@type'] ?? null, format: 'JSON-LD' });
        }
      } catch (err) {
        // Skip broken JSON
      }
    });

    // Microdata
    const microData = microdata.toJson(html, { base: url });
    if (microData?.items?.length) {
      microData.items.forEach((item: any) => {
        const schema = transformMicrodataToJsonLd(item);
        results.push({ schema, type: schema['@type'] ?? null, format: 'Microdata' });
      });
    }

    // RDFa
    const store = $rdf.graph();
    $rdf.parse(html, store, url, 'text/html');
    const types = store.each(null, $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'));
    types.forEach((typeQuad: any) => {
      const typeValue = typeQuad.object.value.split('/').pop();
      const schema = { '@context': 'https://schema.org', '@type': typeValue };
      results.push({ schema, type: typeValue, format: 'RDFa' });
    });

    const groupedResults: GroupedResults = {};
    results.forEach((result) => {
      const type = result.type || 'Unknown';
      if (!groupedResults[type]) groupedResults[type] = [];
      groupedResults[type].push(result);
    });

    const message = results.length > 0 ? 'Structured data detected' : 'No structured data detected';

    return {
      url,
      message,
      schemas: groupedResults
    };

  } catch (error) {
    return {
      url,
      message: 'Error occurred during schema detection',
      schemas: {}
    };
  }
}
