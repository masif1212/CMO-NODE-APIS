import { parse } from 'tldts'; // For root domain extraction
// export const getDomainRoot = (url: string): string => {
//   const parsed = parse(url);
//   return parsed.domain || '';
// };


export const getDomainRoot = (url: string): string => {
  try {
    const parsed = parse(url);
    return parsed.domain || '';
  } catch {
    return '';
  }
};
