function processSeoAudits(auditData: any[]): { passedAudits: { title: string; description: string }[]; failedAudits: { title: string; description: string }[] } {
  const passedAudits: { title: string; description: string }[] = [];
  const failedAudits: { title: string; description: string }[] = [];

  if (!Array.isArray(auditData)) {
    return { passedAudits: [], failedAudits: [] };
  }

  for (const audit of auditData) {
    // Skip the structured-data audit
    if (audit?.id === 'structured-data') {
      continue;
    }

    // Define user-friendly titles and descriptions based on audit ID
    let userFriendlyTitle: string;
    let passedDescription: string;
    let failedDescription: string;

    switch (audit?.id) {
      case 'is-crawlable':
        userFriendlyTitle = 'Search Engines Can Find This Page';
        passedDescription = 'Page allows search engines to find and index it, making it visible in search results.';
        failedDescription = 'Page is blocked from search engines, which may prevent it from appearing in search results. Check for noindex tags or robots.txt restrictions.';
        break;
      case 'document-title':
        userFriendlyTitle = 'Page Has a Clear and Useful Title';
        passedDescription = 'Page has a title that helps users and search engines understand its content.';
        failedDescription = 'Page is missing a title or has an unclear one, which can confuse users and search engines. Add a descriptive title tag.';
        break;
      case 'meta-description':
        userFriendlyTitle = 'Page Has a Helpful Description';
        passedDescription = 'Page includes a short summary that appears in search results, helping users know what it’s about.';
        failedDescription = 'Page lacks a meta description, which may reduce click-through rates. Add a concise summary of the Page’s content.';
        break;
      case 'http-status-code':
        userFriendlyTitle = 'Page Loads Without Errors';
        passedDescription = 'Page returns a successful status code, ensuring search engines can access it properly.';
        failedDescription = 'Page returns an error status code, preventing search engines from accessing it. Fix server or redirect issues.';
        break;
      case 'link-text':
        userFriendlyTitle = 'Links Use Clear and Descriptive Text';
        passedDescription = 'links use descriptive text, making it easier for users and search engines to understand them.';
        failedDescription = 'Some links lack descriptive text , which can confuse users and search engines. Use meaningful link text.';
        break;
      case 'crawlable-anchors':
        userFriendlyTitle = 'Links Can Be Followed by Search Engines';
        passedDescription = 'Links are set up correctly, allowing search engines to explore  website effectively.';
        failedDescription = 'Some links are not crawlable due to improper setup (e.g., JavaScript-based links). Ensure links use proper HTML anchor tags.';
        break;
      case 'robots-txt':
        userFriendlyTitle = 'Robots.txt File Is Set Up Correctly';
        passedDescription = 'Robots.txt file is properly configured, guiding search engines on how to crawl  site.';
        failedDescription = 'Robots.txt file is missing or incorrectly configured, which may block search engines. Create or fix the robots.txt file.';
        break;
      case 'image-alt':
        userFriendlyTitle = 'Images Have Descriptive Alt Text';
        passedDescription = 'Images include alt text, helping search engines and screen readers understand them.';
        failedDescription = 'Some images lack alt text, making them less accessible and harder for search engines to understand. Add descriptive alt text to all images.';
        break;
      case 'hreflang':
        userFriendlyTitle = 'Page Shows the Right Language to the Right Users';
        passedDescription = 'Page correctly specifies its language, helping search engines show it to the right audience.';
        failedDescription = 'Page has missing or incorrect language settings, which may show it to the wrong audience. Add correct hreflang tags.';
        break;
      case 'canonical':
        userFriendlyTitle = 'Page Shows Its Preferred URL';
        passedDescription = 'Page uses a canonical link to tell search engines the preferred version, avoiding duplicate content issues.';
        failedDescription = 'Page lacks a canonical link, which may cause duplicate content issues. Add a canonical tag to specify the preferred URL.';
        break;
      default:
        userFriendlyTitle = audit?.title || 'Unknown Audit';
        passedDescription = audit?.description || 'No description available';
        failedDescription = audit?.description || 'This audit failed, but no specific guidance is available. Review the page configuration.';
    }

    // Create audit entry
    const auditEntry = {
      title: userFriendlyTitle,
      description: audit?.score === 1 ? passedDescription : failedDescription,
    };

    // Categorize based on score
    if (audit?.score === 1) {
      passedAudits.push(auditEntry);
    } else if (audit?.score === 0) {
      failedAudits.push(auditEntry);
    }
  }

  return { passedAudits, failedAudits };
}