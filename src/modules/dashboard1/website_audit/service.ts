import axios from "axios";
import { PrismaClient } from "@prisma/client";
import lighthouse from "lighthouse";
import chromeLauncher from "chrome-launcher";

const prisma = new PrismaClient();
const API_KEY = process.env.PAGESPEED_API_KEY || "YOUR_KEY";
const API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
import puppeteer from "puppeteer";
async function getWebsiteUrlById(user_id: string, website_id: string): Promise<string> {
  // console.log(`Fetching URL for user_id: ${user_id}, website_id: ${website_id}`);
  const website = await prisma.user_websites.findUnique({

    where: {
      user_id_website_id: {
        user_id,
        website_id,
      },
    },
    select: {
      website_url: true,
    },
  });

  if (!website?.website_url) {
    throw new Error(`No URL found for user_id: ${user_id} and website_id: ${website_id}`);
  }

  return website.website_url;
}

const mobileFriendlyAudits = [
  "viewport",
  "font-size",
  "tap-targets",
  "mobile-friendly",
];



// export async function getPageSpeedData(user_id: string, website_id: string) {
//   const url = await getWebsiteUrlById(user_id, website_id);
//   console.log("url fetch",url)
//   const params = new URLSearchParams({
//     url,
//     key: API_KEY,
//     strategy: "desktop",
//     cacheBust: Date.now().toString(),
    
//   });

//   ["performance", "seo", "accessibility", "best-practices", "pwa"].forEach((c) =>
//     params.append("category", c)
//   );

//   try {
//     const response = await axios.get(`${API_URL}?${params}`);
//     const data = response.data;
//     const lighthouse = data?.lighthouseResult;

//     if (!lighthouse?.categories || !lighthouse.audits) {
//       throw new Error("Missing Lighthouse categories or audits in response");
//     }

//     const getScore = (cat: string) =>
//       lighthouse.categories[cat]?.score != null
//         ? Math.round(lighthouse.categories[cat].score * 100)
//         : null;

//     const getAudit = (id: string) => {
//       const audit = lighthouse.audits[id];
//       return audit
//         ? {
//             id,
//             title: audit.title || "Unnamed audit",
//             description: audit.description ?? null,
//             display_value: audit.displayValue ?? null,
//             score: audit.score ?? null,
//             details: audit.details ?? null,
//             scoreDisplayMode: audit.scoreDisplayMode ?? null,
//           }
//         : {
//             id,
//             title: "Unnamed audit",
//             description: null,
//             display_value: null,
//             score: null,
//             details: null,
//             scoreDisplayMode: null,
//           };
//     };

//     const allAuditIds = Object.keys(lighthouse.audits);
//     const detailedAuditResults = allAuditIds.map(getAudit);

//     const accessibilityAuditIds =
//       lighthouse.categories["accessibility"]?.auditRefs?.map((ref: any) => ref.id) ?? [];

//     const accessibilityAudits = detailedAuditResults.filter((audit) =>
//       accessibilityAuditIds.includes(audit.id)
//     );

//     const mobileFriendliness = mobileFriendlyAudits.map(getAudit);


//     // --- Friendly accessibility mappings and types ---
//     type AccessibilityGroupKey =
//       | "critical"
//       | "enhancements"
//       | "passed"
//       | "notApplicable";

//     type AccessibilityStatus =
//       | "critical"
//       | "recommended"
//       | "passed"
//       | "notApplicable";




// const customAccessibilityContent: Record<
//   string,
//   { title: string; description: string }
// > = {
//   "color-contrast": {
//     title: "Text has sufficient color contrast",
//     description:
//       "Text should have enough contrast against its background to be easily readable by everyone, including users with visual impairments.",
//   },
//   "image-alt": {
//     title: "Images have meaningful alt text",
//     description:
//       "Images should include descriptive alt text to support screen readers and make content accessible to all users.",
//   },
//   "image-redundant-alt": {
//     title: "Alt text is not redundant",
//     description:
//       "Avoid repeating nearby text in image alt attributes. Redundant descriptions can confuse screen reader users by duplicating information.",
//   },
//   "link-name": {
//     title: "Links use descriptive text",
//     description:
//       "Links should clearly describe their destination or purpose so that all users, including those using assistive technology, can understand them.",
//   },
//   "label": {
//     title: "Form inputs have associated labels",
//     description:
//       "Each form input should have a clear, descriptive label to help users understand the purpose of the field.",
//   },
//   "document-title": {
//     title: "Page includes a descriptive title",
//     description:
//       "A descriptive page title improves screen reader navigation and helps users understand the purpose of the page.",
//   },
//   "meta-description": {
//     title: "Page includes a meta description",
//     description:
//       "Meta descriptions summarize the page content for search engines and users, improving clarity and SEO.",
//   },
//   "html-has-lang": {
//     title: "Page has a language attribute set",
//     description:
//       "Defining a language helps screen readers pronounce the content correctly, improving accessibility for multilingual users.",
//   },
//   "viewport": {
//     title: "Zoom is not restricted by the viewport tag",
//     description:
//       "Allowing users to zoom improves accessibility for those with visual impairments or who prefer larger text.",
//   },
//   "aria-valid-attr": {
//     title: "ARIA attributes are valid",
//     description:
//       "Ensure all ARIA attributes are spelled correctly and used properly to maintain accessibility semantics.",
//   },
//   "aria-valid-attr-value": {
//     title: "ARIA attributes use valid values",
//     description:
//       "ARIA attributes must contain valid values so that assistive technologies can interpret them correctly.",
//   },
//   "aria-roles": {
//     title: "ARIA roles are valid",
//     description:
//       "Ensure ARIA roles are used appropriately and contain valid values to help assistive technologies interact with elements effectively.",
//   },
//   "heading-order": {
//     title: "Headings follow a logical order",
//     description:
//       "Headings are used in descending, sequential order without skipping levels, which helps screen reader users understand the page structure.",
//   },
  
//   "aria-hidden-focus": {
//     title: "Hidden elements do not contain focusable items",
//     description:
//       "Elements marked as hidden from assistive tech do not include interactive or focusable elements, which would otherwise be inaccessible.",
//   },
//   "html-lang-valid": {
//     title: "Page uses a valid language attribute",
//     description:
//       "The page's language attribute is set using a valid language code, helping screen readers pronounce content accurately.",
//   },
//   "aria-deprecated-role": {
//     title: "No deprecated ARIA roles are used",
//     description:
//       "Deprecated ARIA roles are avoided to ensure compatibility with assistive technologies.",
//   },
//   "aria-required-parent": {
//     title: "ARIA roles have required parent elements",
//     description:
//       "ARIA child roles are correctly nested within their required parent roles to ensure proper behavior with assistive technologies.",
//   },
//   "aria-toggle-field-name": {
//     title: "ARIA toggle fields have accessible names",
//     description:
//       "Toggle controls include descriptive names so screen reader users understand their purpose and state.",
//   },
//   "aria-allowed-attr": {
//     title: "ARIA attributes are valid for their roles",
//     description:
//       "ARIA attributes are correctly matched with roles that support them, ensuring valid and accessible implementation.",
//   },
// "tabindex": {
//     title: "No element uses a tabindex greater than 0",
//     description:
//       "Using a tabindex above 0 can interfere with expected keyboard navigation and should be avoided to improve accessibility.",
//   },
//   "aria-prohibited-attr": {
//     title: "ARIA attributes are used only where permitted",
//     description:
//       "ARIA attributes are not applied to elements where they are disallowed, ensuring screen readers can interpret the page properly.",
//   },
//   "valid-lang": {
//     title: "Language attributes use valid values",
//     description:
//       "Language codes are correctly formatted to help screen readers pronounce content accurately.",
//   },

//   "identical-links-same-purpose": {
//     title: "Identical links have consistent purpose",
//     description:
//       "Links with the same text lead to the same destination, ensuring clarity for all users, especially those using screen readers.",
//   },
//   "listitem": {
//     title: "List items are inside valid list containers",
//     description:
//       "List items are properly nested within `<ul>`, `<ol>`, or `<menu>` elements so that assistive technologies interpret them correctly.",
//   },
//   "aria-hidden-body": {
//     title: "Body element is not hidden from assistive technologies",
//     description:
//       "The document body is visible to screen readers, ensuring accessibility tools can interpret the page correctly.",
//   },
//   "aria-conditional-attr": {
//     title: "ARIA attributes are used only when allowed",
//     description:
//       "ARIA attributes appear only when appropriate for the element’s role and context, ensuring valid behavior.",
//   },
//   "target-size": {
//     title: "Touch targets have adequate size and spacing",
//     description:
//       "Interactive elements are large enough and spaced out properly to help users interact comfortably, especially on mobile.",
//   },
//   "aria-allowed-role": {
//     title: "ARIA roles are used only with compatible elements",
//     description:
//       "ARIA roles are assigned only to valid HTML elements, maintaining proper semantic meaning and accessibility.",
//   },
//   "aria-required-attr": {
//     title: "Required ARIA attributes are present",
//     description:
//       "Elements with ARIA roles include all required ARIA attributes to ensure their purpose and state are conveyed correctly.",
//   },
//   "aria-required-children": {
//     title: "ARIA parent roles include required child roles",
//     description:
//       "Elements with ARIA parent roles have the correct child elements to preserve their intended accessibility function.",
//   },
//    "label-content-name-mismatch": {
//     title: "Accessible name does not match visible label",
//     description:
//       "Screen readers rely on accessible names to describe elements. If the visible label differs from the accessible name, it can confuse users. Make sure the visible text is included in the accessible name.",
//   },
  
//   "dlitem": {
//     title: "Definition list items must be inside a definition list",
//     description:
//       "Each term and its description should be placed inside a definition list to ensure screen readers can interpret them correctly.",
//   },

//   "definition-list": {
//     title: "Definition list contains invalid children",
//     description:
//       "Only term and description pairs should be direct children of a definition list. Remove or restructure nested elements so that each group follows the expected `<dt>` and `<dd>` format.",
//   },
//   "meta-viewport": {
//     title: "Zooming is disabled for users on mobile",
//     description:
//       "Restricting zoom with `maximum-scale` or `user-scalable=no` prevents users with low vision from enlarging content. Allow zooming by removing these restrictions from the viewport meta tag.",
//   },
// "skip-link": {
//     title: "Skip links are available and focusable",
//     description:
//       "Skip links help keyboard and screen reader users jump directly to the main content. They are helpful for navigation, especially on pages with repeated structures.",
//   },
//   "aria-treeitem-name": {
//     title: "ARIA tree items have accessible names",
//     description:
//       "If tree items don’t have clear labels, screen readers may not announce them meaningfully. Use labels so users understand what each tree item represents.",
//   },
//   "frame-title": {
//     title: "Frames are labeled clearly",
//     description:
//       "Titles on frames and iframes help screen reader users understand the purpose of the embedded content. If no frames are used, this doesn't apply.",
//   },
//   "td-has-header": {
//     title: "Table cells in large tables have headers",
//     description:
//       "In larger tables, it's important that data cells reference headers so screen reader users can understand the context. If no such tables exist, this rule doesn't apply.",
//   },
//   "aria-meter-name": {
//     title: "ARIA meter elements are labeled",
//     description:
//       "Meters must have a label so users know what the value represents. This ensures that screen readers can properly describe the element.",
//   },
//   "aria-command-name": {
//     title: "Command elements are labeled",
//     description:
//       "Buttons, links, and menu items should have accessible names so assistive technologies can tell users what action will be taken.",
//   },
//   "input-image-alt": {
//     title: "Image inputs include alternative text",
//     description:
//       "Image buttons must include descriptive alt text so users who rely on screen readers can understand their purpose.",
//   },

//   "html-xml-lang-mismatch": {
//     title: "HTML language attributes are redundant",
//     description:
//       "Both `lang` and `xml:lang` are set to the same language. While not harmful, this duplication is unnecessary unless supporting specific XML processors.",
//   },
//   "td-headers-attr": {
//     title: "Table cell headers must reference cells within the same table",
//     description:
//       "Screen readers use the `headers` attribute in `<td>` elements to associate data with table headers. These references must point to cells within the same table to work correctly.",
//   },
//   "duplicate-id-aria": {
//     title: "ARIA IDs must be unique",
//     description:
//       "When ARIA IDs are duplicated, assistive technologies may skip or misread elements. Ensure each ARIA ID is used only once per page to maintain accessibility.",
//   },
 
//   "link-in-text-block": {
//     title: "Links must be distinguishable without relying on color",
//     description:
//       "If links are only identified by color, they may be invisible to users with low vision or color blindness. Use additional styling like underlines or bold text to clearly separate links from surrounding content.",
//   },
//   "input-button-name": {
//     title: "Input buttons must have clear and accessible text",
//     description:
//       "Screen reader users rely on discernible text to understand what a button does. Ensure each `<input type=\"button\">` element has an accessible name or value.",
//   },
//   "meta-refresh": {
//     title: "Avoid using automatic page refresh",
//     description:
//       "Pages that auto-refresh using `<meta http-equiv=\"refresh\">` can disrupt user experience, especially for screen reader users. Avoid auto-refresh unless absolutely necessary.",
//   },
//   "th-has-data-cells": {
//     title: "Table headers must reference data cells",
//     description:
//       "`<th>` elements or those with `[role=\"columnheader\"]` or `[role=\"rowheader\"]` should describe at least one data cell to be useful for screen readers navigating tables.",
//   },
//   "aria-dialog-name": {
//     title: "Dialogs must have accessible names",
//     description:
//       "Elements with `role=\"dialog\"` or `role=\"alertdialog\"` should include an accessible name so screen reader users understand the purpose of the dialog.",
//   },
//   "accesskeys": {
//     title: "Accesskey values must be unique",
//     description:
//       "When multiple elements share the same `[accesskey]` value, keyboard users may encounter unpredictable behavior. Ensure each value is unique for reliable access.",
//   },
//   "landmark-one-main": {
//     title: "Document should contain a single main landmark",
//     description:
//       "A clearly defined `<main>` landmark helps assistive technology users find the primary content of a page quickly and efficiently.",
//   },

//   "list": {
//     title: "Lists must contain only `<li>` and related elements",
//     description:
//       "Proper list structure helps screen readers announce content clearly. Avoid placing non-`<li>` elements directly inside `<ul>` or `<ol>` elements.",
//   },
//   "table-duplicate-name": {
//     title: "Tables must use different text for `summary` and `<caption>`",
//     description:
//       "The `summary` attribute should describe structure and purpose, while the `<caption>` presents an onscreen label. Distinct values ensure clarity for assistive tech users.",
//   },
//   "select-name": {
//     title: "`<select>` elements must be labeled",
//     description:
//       "Every `<select>` element should have an associated label to clearly explain its purpose to screen reader users.",
//   },
//   "button-name": {
//     title: "Buttons must have accessible names",
//     description:
//       "Without a label, screen readers can't convey a button's function. Ensure each `<button>` element has meaningful text or an accessible name.",
//   },
//   "video-caption": {
//     title: "Videos should include captions",
//     description:
//       "Captions allow deaf or hard-of-hearing users to access video content. Add `<track kind=\"captions\">` to your videos for better accessibility.",
//   },
//   "form-field-multiple-labels": {
//     title: "Form fields should not have multiple labels",
//     description:
//       "Having more than one label on a form field can confuse screen reader users. Use one clear, descriptive label per input.",
//   },
//   "table-fake-caption": {
//     title: "Use the `<caption>` tag to label tables",
//     description:
//       "Instead of using a cell with `[colspan]`, use the semantic `<caption>` tag to describe a table. This improves navigation for assistive technologies.",
//   },
//   "object-alt": {
//     title: "`<object>` elements must have alternate text",
//     description:
//       "Add fallback content inside `<object>` elements to convey the intended message for screen reader users.",
//   },
//   "empty-heading": {
//     title: "Headings must not be empty",
//     description:
//       "Screen readers rely on headings to understand page structure. Avoid empty `<h1>`–`<h6>` tags or inaccessible heading content.",
//   },
//   "aria-tooltip-name": {
//     title: "ARIA tooltips must have accessible names",
//     description:
//       "Tooltip elements without accessible names will be unreadable by screen readers. Use `aria-label` or visible text to describe the tooltip.",
//   },
//   "aria-input-field-name": {
//     title: "ARIA input fields must have accessible names",
//     description:
//       "When input fields are missing accessible names, screen readers cannot announce their purpose. Use `aria-label` or associated `<label>` elements to improve clarity.",
//   },
//   "aria-text": {
//     title: "`role=\"text\"` elements must not contain focusable children",
//     description:
//       "Focusable elements inside containers with `role=\"text\"` are not announced properly by VoiceOver. Avoid placing links, buttons, or inputs inside these containers.",
//   },
//   "bypass": {
//     title: "Page should contain a heading, skip link, or landmark region",
//     description:
//       "Adding skip links or landmark roles lets keyboard and screen reader users quickly jump to the main content.",
//   },
//   "aria-progressbar-name": {
//     title: "ARIA progress bars must have accessible names",
//     description:
//       "`progressbar` elements without accessible names are unreadable by screen readers. Add `aria-label` or associate them with visible text.",
//   },
//   "visual-order-follows-dom": {
//     title: "Visual order should match DOM order",
//     description:
//       "Ensure the visual arrangement of elements on the page aligns with the DOM structure. Mismatched orders can confuse keyboard and screen reader users.",
//   },
//   "custom-controls-labels": {
//     title: "Custom controls must have labels",
//     description:
//       "If you build custom buttons, inputs, or sliders, label them with `aria-label` or `aria-labelledby` so users understand their purpose.",
//   },
//   "custom-controls-roles": {
//     title: "Custom controls must include ARIA roles",
//     description:
//       "Interactive elements should declare a role that describes their behavior (e.g. `button`, `switch`). This makes them accessible to assistive technology.",
//   },
//   "managed-focus": {
//     title: "New content should receive focus",
//     description:
//       "When modals, alerts, or dynamic panels appear, direct focus to them so keyboard and screen reader users are aware of the change.",
//   },
//   "interactive-element-affordance": {
//     title: "Interactive elements must indicate purpose and state",
//     description:
//       "Links and buttons should look clickable and convey their current state, like active or disabled, to assistive technologies.",
//   },
//   "focus-traps": {
//     title: "Users should not be trapped in focusable regions",
//     description:
//       "Ensure that users can always tab out of any interactive element or modal. Focus traps frustrate keyboard navigation.",
//   },
//   "logical-tab-order": {
//     title: "Tab order must be logical and follow visual layout",
//     description:
//       "Set a natural tab sequence that mirrors how elements appear visually. Unexpected tab jumps confuse keyboard users.",
//   },
//    "offscreen-content-hidden": {
//     title: "Offscreen content must be hidden from assistive technology",
//     description:
//       "Screen readers can access elements that are offscreen unless they're explicitly hidden. To avoid confusing users, hide non-relevant content using `display: none` or `aria-hidden=\"true\"`. For example: `<div aria-hidden=\"true\">Hidden panel</div>`.",
//   },
//   "focusable-controls": {
//     title: "Custom controls must be keyboard focusable",
//     description:
//       "All interactive elements must be operable with a keyboard and show a visible focus indicator. This ensures users who rely on keyboard navigation can interact effectively. For example: `<div tabindex=\"0\" role=\"button\">Click me</div>`.",
//   },
//    "use-landmarks": {
//     title: "Use HTML5 landmark elements for better accessibility",
//     description:
//       "Landmark elements like `<main>`, `<nav>`, `<header>`, and `<footer>` help screen reader users navigate content more efficiently. For example: `<nav aria-label=\"Main navigation\">...</nav>`.",
//   },
// };

//     const classifyAccessibilityAudit = (
//       audit: any
//     ): {
//       group: AccessibilityGroupKey;
//       friendlyTitle: string;
//       friendlyDescription: string;
//       status: AccessibilityStatus;
//     } => {
//       const content = customAccessibilityContent[audit.id];
//       const friendlyTitle = content?.title || audit.title || "Unnamed Audit";
//       const friendlyDescription =
//         content?.description || audit.description || null;

//       let group: AccessibilityGroupKey;
//       let status: AccessibilityStatus;

//       if (audit.scoreDisplayMode === "notApplicable") {
//         group = "notApplicable";
//         status = "notApplicable";
//       } else if (audit.score === 1) {
//         group = "passed";
//         status = "passed";
//       } else if (audit.score === 0) {
//         group = "critical";
//         status = "critical";
//       } else {
//         group = "enhancements";
//         status = "recommended";
//       }

//       return {
//         group,
//         friendlyTitle,
//         friendlyDescription,
//         status,
//       };
//     };

//     const user_access_readiness: Record<AccessibilityGroupKey, any[]> = {
//       critical: [],
//       enhancements: [],
//       passed: [],
//       notApplicable: [],
//     };

//     for (const audit of accessibilityAudits) {
//       const { group, friendlyTitle, friendlyDescription, status } =
//         classifyAccessibilityAudit(audit);

//       user_access_readiness[group].push({
//         ...audit,
//         title: friendlyTitle,
//         description: friendlyDescription,
//         status,
//       });
//     }

//     // SEO audits
//     const seoAuditIds = lighthouse.categories["seo"]?.auditRefs?.map((ref: any) => ref.id) ?? [];
//     const seoAudits = seoAuditIds.map(getAudit);

//     // Best practices
//     const TRUST_AND_SAFETY_IDS = [
//       "is-on-https",
//       "uses-http2",
//       "x-content-type-options",
//       "x-frame-options",
//       "xss-protection",
//       "bypass",
//     ];

//     const bestPracticeAuditIds =
//       lighthouse.categories?.["best-practices"]?.auditRefs?.map((ref: any) => ref.id) ?? [];

//     const bestPracticeAudits = detailedAuditResults.filter((audit) =>
//       bestPracticeAuditIds.includes(audit.id)
//     );

//     const bestPracticeGroups = {
//       trustAndSafety: [] as any[],
//       general: [] as any[],
//       passed: [] as any[],
//       notApplicable: [] as any[],
//     };

//     for (const audit of bestPracticeAudits) {
//       if (TRUST_AND_SAFETY_IDS.includes(audit.id)) {
//         bestPracticeGroups.trustAndSafety.push(audit);
//       } else if (audit.id === "js-libraries") {
//         bestPracticeGroups.general.push(audit);
//       } else if (audit.scoreDisplayMode === "notApplicable") {
//         bestPracticeGroups.notApplicable.push(audit);
//       } else if (audit.score === 1) {
//         bestPracticeGroups.passed.push(audit);
//       } else if (audit.score === 0) {
//         bestPracticeGroups.general.push(audit);
//       }
//     }

//     // Revenue loss estimation
//     const LCP = lighthouse?.audits["largest-contentful-paint"]?.numericValue;
//     const TBT = lighthouse?.audits["total-blocking-time"]?.numericValue;
//     const CLS = lighthouse?.audits["cumulative-layout-shift"]?.numericValue;

//     const lcpSeconds = LCP / 1000;
//     const rawRevenueLoss =
//       (lcpSeconds - 2.5) * 7 + ((TBT - 200) / 100) * 3 + (CLS * 10);
//     const revenueLossPercent = Number(rawRevenueLoss.toFixed(2));
//     const fullExpression = `((${lcpSeconds} - 2.5) * 7) + (((${TBT} - 200) / 100) * 3) + (${CLS} * 10) = ${revenueLossPercent}`;

//     console.log("Revenue Loss Formula:", fullExpression);

//     console.log("performance: getScore(performance)",getScore("performance"),)
    
//     return {
      
//       audits: {
//         speed_index: getAudit("speed-index"),
//         first_contentful_paint: getAudit("first-contentful-paint"),
//         total_blocking_time: getAudit("total-blocking-time"),
//         interactive: getAudit("interactive"),
//         largest_contentful_paint: getAudit("largest-contentful-paint"),
//         cumulative_layout_shift: getAudit("cumulative-layout-shift"),
//       },
//       audit_details: {
//         allAudits: detailedAuditResults,
//         optimization_opportunities: bestPracticeGroups,
//         user_access_readiness,
//         seoAudits,
//         categoryScores:
//         {
//         performance: getScore("performance"),
//         seo: getScore("seo"),
//         accessibility: getScore("accessibility"),
//         best_practices: getScore("best-practices"),
//         mobileFriendliness:mobileFriendliness
//         // pwa: getScore("pwa"),
//       },
//       audits: {
//         speed_index: getAudit("speed-index"),
//         first_contentful_paint: getAudit("first-contentful-paint"),
//         total_blocking_time: getAudit("total-blocking-time"),
//         interactive: getAudit("interactive"),
//         largest_contentful_paint: getAudit("largest-contentful-paint"),
//         cumulative_layout_shift: getAudit("cumulative-layout-shift"),
//       },
//       },
//       revenueLossPercent,
//     };
//   } catch (err: any) {
//     console.error(`PageSpeed fetch failed for ${url}:`, err.message);
//     return null;
//   }
// }



export async function getPageSpeedData(user_id: string, website_id: string) {
  const url = await getWebsiteUrlById(user_id, website_id);
  console.log("url fetch", url);
  const API_KEY = process.env.PAGESPEED_API_KEY || '';
  const API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

  const params = new URLSearchParams({
    url,
    key: API_KEY,
    strategy: "desktop",
    cacheBust: Date.now().toString(),
  });

  ["performance", "seo", "accessibility", "best-practices", "pwa"].forEach((c) =>
    params.append("category", c)
  );

  // Helper function to process Lighthouse results
  const processLighthouseResult = (lighthouse: any) => {
    if (!lighthouse?.categories || !lighthouse.audits) {
      throw new Error("Missing Lighthouse categories or audits in response");
    }

    const getScore = (cat: string) =>
      lighthouse.categories[cat]?.score != null
        ? Math.round(lighthouse.categories[cat].score * 100)
        : null;

    const getAudit = (id: string) => {
      const audit = lighthouse.audits[id];
      return audit
        ? {
            id,
            title: audit.title || "Unnamed audit",
            description: audit.description ?? null,
            display_value: audit.displayValue ?? null,
            score: audit.score ?? null,
            details: audit.details ?? null,
            scoreDisplayMode: audit.scoreDisplayMode ?? null,
          }
        : {
            id,
            title: "Unnamed audit",
            description: null,
            display_value: null,
            score: null,
            details: null,
            scoreDisplayMode: null,
          };
    };

    const allAuditIds = Object.keys(lighthouse.audits);
    const detailedAuditResults = allAuditIds.map(getAudit);

    const accessibilityAuditIds =
      lighthouse.categories["accessibility"]?.auditRefs?.map((ref: any) => ref.id) ?? [];

    const accessibilityAudits = detailedAuditResults.filter((audit) =>
      accessibilityAuditIds.includes(audit.id)
    );

    const mobileFriendliness = mobileFriendlyAudits.map(getAudit);

    // --- Friendly accessibility mappings and types ---
    type AccessibilityGroupKey =
      | "critical"
      | "enhancements"
      | "passed"
      | "notApplicable";

    type AccessibilityStatus =
      | "critical"
      | "recommended"
      | "passed"
      | "notApplicable";

const customAccessibilityContent: Record<
  string,
  { title: string; description: string }
> = {
  "color-contrast": {
    title: "Text has sufficient color contrast",
    description:
      "Text should have enough contrast against its background to be easily readable by everyone, including users with visual impairments.",
  },
  "image-alt": {
    title: "Images have meaningful alt text",
    description:
      "Images should include descriptive alt text to support screen readers and make content accessible to all users.",
  },
  "image-redundant-alt": {
    title: "Alt text is not redundant",
    description:
      "Avoid repeating nearby text in image alt attributes. Redundant descriptions can confuse screen reader users by duplicating information.",
  },
  "link-name": {
    title: "Links use descriptive text",
    description:
      "Links should clearly describe their destination or purpose so that all users, including those using assistive technology, can understand them.",
  },
  "label": {
    title: "Form inputs have associated labels",
    description:
      "Each form input should have a clear, descriptive label to help users understand the purpose of the field.",
  },
  "document-title": {
    title: "Page includes a descriptive title",
    description:
      "A descriptive page title improves screen reader navigation and helps users understand the purpose of the page.",
  },
  "meta-description": {
    title: "Page includes a meta description",
    description:
      "Meta descriptions summarize the page content for search engines and users, improving clarity and SEO.",
  },
  "html-has-lang": {
    title: "Page has a language attribute set",
    description:
      "Defining a language helps screen readers pronounce the content correctly, improving accessibility for multilingual users.",
  },
  "viewport": {
    title: "Zoom is not restricted by the viewport tag",
    description:
      "Allowing users to zoom improves accessibility for those with visual impairments or who prefer larger text.",
  },
  "aria-valid-attr": {
    title: "ARIA attributes are valid",
    description:
      "Ensure all ARIA attributes are spelled correctly and used properly to maintain accessibility semantics.",
  },
  "aria-valid-attr-value": {
    title: "ARIA attributes use valid values",
    description:
      "ARIA attributes must contain valid values so that assistive technologies can interpret them correctly.",
  },
  "aria-roles": {
    title: "ARIA roles are valid",
    description:
      "Ensure ARIA roles are used appropriately and contain valid values to help assistive technologies interact with elements effectively.",
  },
  "heading-order": {
    title: "Headings follow a logical order",
    description:
      "Headings are used in descending, sequential order without skipping levels, which helps screen reader users understand the page structure.",
  },
  
  "aria-hidden-focus": {
    title: "Hidden elements do not contain focusable items",
    description:
      "Elements marked as hidden from assistive tech do not include interactive or focusable elements, which would otherwise be inaccessible.",
  },
  "html-lang-valid": {
    title: "Page uses a valid language attribute",
    description:
      "The page's language attribute is set using a valid language code, helping screen readers pronounce content accurately.",
  },
  "aria-deprecated-role": {
    title: "No deprecated ARIA roles are used",
    description:
      "Deprecated ARIA roles are avoided to ensure compatibility with assistive technologies.",
  },
  "aria-required-parent": {
    title: "ARIA roles have required parent elements",
    description:
      "ARIA child roles are correctly nested within their required parent roles to ensure proper behavior with assistive technologies.",
  },
  "aria-toggle-field-name": {
    title: "ARIA toggle fields have accessible names",
    description:
      "Toggle controls include descriptive names so screen reader users understand their purpose and state.",
  },
  "aria-allowed-attr": {
    title: "ARIA attributes are valid for their roles",
    description:
      "ARIA attributes are correctly matched with roles that support them, ensuring valid and accessible implementation.",
  },
"tabindex": {
    title: "No element uses a tabindex greater than 0",
    description:
      "Using a tabindex above 0 can interfere with expected keyboard navigation and should be avoided to improve accessibility.",
  },
  "aria-prohibited-attr": {
    title: "ARIA attributes are used only where permitted",
    description:
      "ARIA attributes are not applied to elements where they are disallowed, ensuring screen readers can interpret the page properly.",
  },
  "valid-lang": {
    title: "Language attributes use valid values",
    description:
      "Language codes are correctly formatted to help screen readers pronounce content accurately.",
  },

  "identical-links-same-purpose": {
    title: "Identical links have consistent purpose",
    description:
      "Links with the same text lead to the same destination, ensuring clarity for all users, especially those using screen readers.",
  },
  "listitem": {
    title: "List items are inside valid list containers",
    description:
      "List items are properly nested within `<ul>`, `<ol>`, or `<menu>` elements so that assistive technologies interpret them correctly.",
  },
  "aria-hidden-body": {
    title: "Body element is not hidden from assistive technologies",
    description:
      "The document body is visible to screen readers, ensuring accessibility tools can interpret the page correctly.",
  },
  "aria-conditional-attr": {
    title: "ARIA attributes are used only when allowed",
    description:
      "ARIA attributes appear only when appropriate for the element’s role and context, ensuring valid behavior.",
  },
  "target-size": {
    title: "Touch targets have adequate size and spacing",
    description:
      "Interactive elements are large enough and spaced out properly to help users interact comfortably, especially on mobile.",
  },
  "aria-allowed-role": {
    title: "ARIA roles are used only with compatible elements",
    description:
      "ARIA roles are assigned only to valid HTML elements, maintaining proper semantic meaning and accessibility.",
  },
  "aria-required-attr": {
    title: "Required ARIA attributes are present",
    description:
      "Elements with ARIA roles include all required ARIA attributes to ensure their purpose and state are conveyed correctly.",
  },
  "aria-required-children": {
    title: "ARIA parent roles include required child roles",
    description:
      "Elements with ARIA parent roles have the correct child elements to preserve their intended accessibility function.",
  },
   "label-content-name-mismatch": {
    title: "Accessible name does not match visible label",
    description:
      "Screen readers rely on accessible names to describe elements. If the visible label differs from the accessible name, it can confuse users. Make sure the visible text is included in the accessible name.",
  },
  
  "dlitem": {
    title: "Definition list items must be inside a definition list",
    description:
      "Each term and its description should be placed inside a definition list to ensure screen readers can interpret them correctly.",
  },

  "definition-list": {
    title: "Definition list contains invalid children",
    description:
      "Only term and description pairs should be direct children of a definition list. Remove or restructure nested elements so that each group follows the expected `<dt>` and `<dd>` format.",
  },
  "meta-viewport": {
    title: "Zooming is disabled for users on mobile",
    description:
      "Restricting zoom with `maximum-scale` or `user-scalable=no` prevents users with low vision from enlarging content. Allow zooming by removing these restrictions from the viewport meta tag.",
  },
"skip-link": {
    title: "Skip links are available and focusable",
    description:
      "Skip links help keyboard and screen reader users jump directly to the main content. They are helpful for navigation, especially on pages with repeated structures.",
  },
  "aria-treeitem-name": {
    title: "ARIA tree items have accessible names",
    description:
      "If tree items don’t have clear labels, screen readers may not announce them meaningfully. Use labels so users understand what each tree item represents.",
  },
  "frame-title": {
    title: "Frames are labeled clearly",
    description:
      "Titles on frames and iframes help screen reader users understand the purpose of the embedded content. If no frames are used, this doesn't apply.",
  },
  "td-has-header": {
    title: "Table cells in large tables have headers",
    description:
      "In larger tables, it's important that data cells reference headers so screen reader users can understand the context. If no such tables exist, this rule doesn't apply.",
  },
  "aria-meter-name": {
    title: "ARIA meter elements are labeled",
    description:
      "Meters must have a label so users know what the value represents. This ensures that screen readers can properly describe the element.",
  },
  "aria-command-name": {
    title: "Command elements are labeled",
    description:
      "Buttons, links, and menu items should have accessible names so assistive technologies can tell users what action will be taken.",
  },
  "input-image-alt": {
    title: "Image inputs include alternative text",
    description:
      "Image buttons must include descriptive alt text so users who rely on screen readers can understand their purpose.",
  },

  "html-xml-lang-mismatch": {
    title: "HTML language attributes are redundant",
    description:
      "Both `lang` and `xml:lang` are set to the same language. While not harmful, this duplication is unnecessary unless supporting specific XML processors.",
  },
  "td-headers-attr": {
    title: "Table cell headers must reference cells within the same table",
    description:
      "Screen readers use the `headers` attribute in `<td>` elements to associate data with table headers. These references must point to cells within the same table to work correctly.",
  },
  "duplicate-id-aria": {
    title: "ARIA IDs must be unique",
    description:
      "When ARIA IDs are duplicated, assistive technologies may skip or misread elements. Ensure each ARIA ID is used only once per page to maintain accessibility.",
  },
 
  "link-in-text-block": {
    title: "Links must be distinguishable without relying on color",
    description:
      "If links are only identified by color, they may be invisible to users with low vision or color blindness. Use additional styling like underlines or bold text to clearly separate links from surrounding content.",
  },
  "input-button-name": {
    title: "Input buttons must have clear and accessible text",
    description:
      "Screen reader users rely on discernible text to understand what a button does. Ensure each `<input type=\"button\">` element has an accessible name or value.",
  },
  "meta-refresh": {
    title: "Avoid using automatic page refresh",
    description:
      "Pages that auto-refresh using `<meta http-equiv=\"refresh\">` can disrupt user experience, especially for screen reader users. Avoid auto-refresh unless absolutely necessary.",
  },
  "th-has-data-cells": {
    title: "Table headers must reference data cells",
    description:
      "`<th>` elements or those with `[role=\"columnheader\"]` or `[role=\"rowheader\"]` should describe at least one data cell to be useful for screen readers navigating tables.",
  },
  "aria-dialog-name": {
    title: "Dialogs must have accessible names",
    description:
      "Elements with `role=\"dialog\"` or `role=\"alertdialog\"` should include an accessible name so screen reader users understand the purpose of the dialog.",
  },
  "accesskeys": {
    title: "Accesskey values must be unique",
    description:
      "When multiple elements share the same `[accesskey]` value, keyboard users may encounter unpredictable behavior. Ensure each value is unique for reliable access.",
  },
  "landmark-one-main": {
    title: "Document should contain a single main landmark",
    description:
      "A clearly defined `<main>` landmark helps assistive technology users find the primary content of a page quickly and efficiently.",
  },

  "list": {
    title: "Lists must contain only `<li>` and related elements",
    description:
      "Proper list structure helps screen readers announce content clearly. Avoid placing non-`<li>` elements directly inside `<ul>` or `<ol>` elements.",
  },
  "table-duplicate-name": {
    title: "Tables must use different text for `summary` and `<caption>`",
    description:
      "The `summary` attribute should describe structure and purpose, while the `<caption>` presents an onscreen label. Distinct values ensure clarity for assistive tech users.",
  },
  "select-name": {
    title: "`<select>` elements must be labeled",
    description:
      "Every `<select>` element should have an associated label to clearly explain its purpose to screen reader users.",
  },
  "button-name": {
    title: "Buttons must have accessible names",
    description:
      "Without a label, screen readers can't convey a button's function. Ensure each `<button>` element has meaningful text or an accessible name.",
  },
  "video-caption": {
    title: "Videos should include captions",
    description:
      "Captions allow deaf or hard-of-hearing users to access video content. Add `<track kind=\"captions\">` to your videos for better accessibility.",
  },
  "form-field-multiple-labels": {
    title: "Form fields should not have multiple labels",
    description:
      "Having more than one label on a form field can confuse screen reader users. Use one clear, descriptive label per input.",
  },
  "table-fake-caption": {
    title: "Use the `<caption>` tag to label tables",
    description:
      "Instead of using a cell with `[colspan]`, use the semantic `<caption>` tag to describe a table. This improves navigation for assistive technologies.",
  },
  "object-alt": {
    title: "`<object>` elements must have alternate text",
    description:
      "Add fallback content inside `<object>` elements to convey the intended message for screen reader users.",
  },
  "empty-heading": {
    title: "Headings must not be empty",
    description:
      "Screen readers rely on headings to understand page structure. Avoid empty `<h1>`–`<h6>` tags or inaccessible heading content.",
  },
  "aria-tooltip-name": {
    title: "ARIA tooltips must have accessible names",
    description:
      "Tooltip elements without accessible names will be unreadable by screen readers. Use `aria-label` or visible text to describe the tooltip.",
  },
  "aria-input-field-name": {
    title: "ARIA input fields must have accessible names",
    description:
      "When input fields are missing accessible names, screen readers cannot announce their purpose. Use `aria-label` or associated `<label>` elements to improve clarity.",
  },
  "aria-text": {
    title: "`role=\"text\"` elements must not contain focusable children",
    description:
      "Focusable elements inside containers with `role=\"text\"` are not announced properly by VoiceOver. Avoid placing links, buttons, or inputs inside these containers.",
  },
  "bypass": {
    title: "Page should contain a heading, skip link, or landmark region",
    description:
      "Adding skip links or landmark roles lets keyboard and screen reader users quickly jump to the main content.",
  },
  "aria-progressbar-name": {
    title: "ARIA progress bars must have accessible names",
    description:
      "`progressbar` elements without accessible names are unreadable by screen readers. Add `aria-label` or associate them with visible text.",
  },
  "visual-order-follows-dom": {
    title: "Visual order should match DOM order",
    description:
      "Ensure the visual arrangement of elements on the page aligns with the DOM structure. Mismatched orders can confuse keyboard and screen reader users.",
  },
  "custom-controls-labels": {
    title: "Custom controls must have labels",
    description:
      "If you build custom buttons, inputs, or sliders, label them with `aria-label` or `aria-labelledby` so users understand their purpose.",
  },
  "custom-controls-roles": {
    title: "Custom controls must include ARIA roles",
    description:
      "Interactive elements should declare a role that describes their behavior (e.g. `button`, `switch`). This makes them accessible to assistive technology.",
  },
  "managed-focus": {
    title: "New content should receive focus",
    description:
      "When modals, alerts, or dynamic panels appear, direct focus to them so keyboard and screen reader users are aware of the change.",
  },
  "interactive-element-affordance": {
    title: "Interactive elements must indicate purpose and state",
    description:
      "Links and buttons should look clickable and convey their current state, like active or disabled, to assistive technologies.",
  },
  "focus-traps": {
    title: "Users should not be trapped in focusable regions",
    description:
      "Ensure that users can always tab out of any interactive element or modal. Focus traps frustrate keyboard navigation.",
  },
  "logical-tab-order": {
    title: "Tab order must be logical and follow visual layout",
    description:
      "Set a natural tab sequence that mirrors how elements appear visually. Unexpected tab jumps confuse keyboard users.",
  },
   "offscreen-content-hidden": {
    title: "Offscreen content must be hidden from assistive technology",
    description:
      "Screen readers can access elements that are offscreen unless they're explicitly hidden. To avoid confusing users, hide non-relevant content using `display: none` or `aria-hidden=\"true\"`. For example: `<div aria-hidden=\"true\">Hidden panel</div>`.",
  },
  "focusable-controls": {
    title: "Custom controls must be keyboard focusable",
    description:
      "All interactive elements must be operable with a keyboard and show a visible focus indicator. This ensures users who rely on keyboard navigation can interact effectively. For example: `<div tabindex=\"0\" role=\"button\">Click me</div>`.",
  },
   "use-landmarks": {
    title: "Use HTML5 landmark elements for better accessibility",
    description:
      "Landmark elements like `<main>`, `<nav>`, `<header>`, and `<footer>` help screen reader users navigate content more efficiently. For example: `<nav aria-label=\"Main navigation\">...</nav>`.",
  },
};
    


const classifyAccessibilityAudit = (
      audit: any
    ): {
      group: AccessibilityGroupKey;
      friendlyTitle: string;
      friendlyDescription: string;
      status: AccessibilityStatus;
    } => {
      const content = customAccessibilityContent[audit.id];
      const friendlyTitle = content?.title || audit.title || "Unnamed Audit";
      const friendlyDescription =
        content?.description || audit.description || null;

      let group: AccessibilityGroupKey;
      let status: AccessibilityStatus;

      if (audit.scoreDisplayMode === "notApplicable") {
        group = "notApplicable";
        status = "notApplicable";
      } else if (audit.score === 1) {
        group = "passed";
        status = "passed";
      } else if (audit.score === 0) {
        group = "critical";
        status = "critical";
      } else {
        group = "enhancements";
        status = "recommended";
      }

      return {
        group,
        friendlyTitle,
        friendlyDescription,
        status,
      };
    };

    const user_access_readiness: Record<AccessibilityGroupKey, any[]> = {
      critical: [],
      enhancements: [],
      passed: [],
      notApplicable: [],
    };

    for (const audit of accessibilityAudits) {
      const { group, friendlyTitle, friendlyDescription, status } =
        classifyAccessibilityAudit(audit);

      user_access_readiness[group].push({
        ...audit,
        title: friendlyTitle,
        description: friendlyDescription,
        status,
      });
    }

    // SEO audits
    const seoAuditIds = lighthouse.categories["seo"]?.auditRefs?.map((ref: any) => ref.id) ?? [];
    const seoAudits = seoAuditIds.map(getAudit);

    // Best practices
    const TRUST_AND_SAFETY_IDS = [
      "is-on-https",
      "uses-http2",
      "x-content-type-options",
      "x-frame-options",
      "xss-protection",
      "bypass",
    ];

    const bestPracticeAuditIds =
      lighthouse.categories?.["best-practices"]?.auditRefs?.map((ref: any) => ref.id) ?? [];

    const bestPracticeAudits = detailedAuditResults.filter((audit) =>
      bestPracticeAuditIds.includes(audit.id)
    );

    const bestPracticeGroups = {
      trustAndSafety: [] as any[],
      general: [] as any[],
      passed: [] as any[],
      notApplicable: [] as any[],
    };

    for (const audit of bestPracticeAudits) {
      if (TRUST_AND_SAFETY_IDS.includes(audit.id)) {
        bestPracticeGroups.trustAndSafety.push(audit);
      } else if (audit.id === "js-libraries") {
        bestPracticeGroups.general.push(audit);
      } else if (audit.scoreDisplayMode === "notApplicable") {
        bestPracticeGroups.notApplicable.push(audit);
      } else if (audit.score === 1) {
        bestPracticeGroups.passed.push(audit);
      } else if (audit.score === 0) {
        bestPracticeGroups.general.push(audit);
      }
    }

    // Revenue loss estimation
    const LCP = lighthouse?.audits["largest-contentful-paint"]?.numericValue;
    const TBT = lighthouse?.audits["total-blocking-time"]?.numericValue;
    const CLS = lighthouse?.audits["cumulative-layout-shift"]?.numericValue;

    const lcpSeconds = LCP / 1000;
    const rawRevenueLoss =
      (lcpSeconds - 2.5) * 7 + ((TBT - 200) / 100) * 3 + (CLS * 10);
    const revenueLossPercent = Number(rawRevenueLoss.toFixed(2));
    const fullExpression = `((${lcpSeconds} - 2.5) * 7) + (((${TBT} - 200) / 100) * 3) + (${CLS} * 10) = ${revenueLossPercent}`;

    console.log("Revenue Loss Formula:", fullExpression);

    return {
      audits: {
        speed_index: getAudit("speed-index"),
        first_contentful_paint: getAudit("first-contentful-paint"),
        total_blocking_time: getAudit("total-blocking-time"),
        interactive: getAudit("interactive"),
        largest_contentful_paint: getAudit("largest-contentful-paint"),
        cumulative_layout_shift: getAudit("cumulative-layout-shift"),
      },
      audit_details: {
        allAudits: detailedAuditResults,
        optimization_opportunities: bestPracticeGroups,
        user_access_readiness,
        seoAudits,
        categoryScores: {
          performance: getScore("performance"),
          seo: getScore("seo"),
          accessibility: getScore("accessibility"),
          best_practices: getScore("best-practices"),
          mobileFriendliness: mobileFriendliness
        },
      },
      revenueLossPercent,
    };
  };

  // Try PageSpeed API first
  try {
    const response = await axios.get(`${API_URL}?${params}`);
    const data = response.data;
    const lighthouseResult = data?.lighthouseResult;

    return processLighthouseResult(lighthouseResult);
  } catch (err: any) {
    console.error(`PageSpeed fetch failed for ${url}:`, err.message);
    const mode = process.env.MODE;

    // Fallback to direct Lighthouse run
    try {
       let browser;

    if (mode === "production") {
      const launchOptions = {
      executablePath: "/usr/bin/google-chrome-stable",
      headless: "new" as any,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    };

      console.log("[brandprofile] Launching Puppeteer with full browser for Cloud Run...");
      browser = await puppeteer.launch(launchOptions);
    } else if (mode === "development") {
      const localLaunchOptions = {
        headless: "new" as any,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      };

      console.log("[brandprofile] Launching Puppeteer in headless mode for local environment...");
      browser = await puppeteer.launch(localLaunchOptions);
    } else {
      console.error(`[brandprofile] ERROR: Invalid MODE '${mode}'. Expected 'production' or 'development'.`);
      throw new Error(`Invalid MODE: ${mode}. Expected 'cloud' or 'development'.`);
    }

    console.log("[brandprofile] Puppeteer browser launched successfully.");

      const lighthouseConfig = {
        extends: 'lighthouse:default',
        settings: {
          onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices', 'pwa'],
        },
      };

      const result = await lighthouse(url, {
        port: parseInt((new URL(browser.wsEndpoint())).port), // Convert string to number
        output: 'json',
        logLevel: 'info',
      }, lighthouseConfig);

      if (!result?.lhr) {
        throw new Error("Lighthouse run did not return valid results");
      }

      await browser.close();
      return processLighthouseResult(result.lhr);
    } catch (lighthouseErr: any) {
      console.error(`Lighthouse fallback failed for ${url}:`, lighthouseErr.message);
      return null;
    }
  }
}




export async function savePageSpeedAnalysis(user_id: string, website_id: string, mainPageSpeedData: any) {

  // console.log("mainPageSpeedData.categories,", mainPageSpeedData.audit_details.categoryScores);
  const audits = mainPageSpeedData.audits || {};

  const getAuditValue = (id: string) => {
    const audit = audits[id];
    return audit?.display_value || null;
  };

  return await prisma.brand_website_analysis.create({
    data: {

      // Score categories (already percentage from getPageSpeedData)
      performance_score: mainPageSpeedData.audit_details.categoryScores?.performance ?? null,
      // pwa_score: mainPageSpeedData.audit_details.categoryScores?.pwa ?? null,
      seo_score: mainPageSpeedData.audit_details.categoryScores?.seo ?? null,
      accessibility_score: mainPageSpeedData.audit_details.categoryScores?.accessibility ?? null,
      best_practices_score: mainPageSpeedData.audit_details.categoryScores?.["best-practices"] ?? null,

      // Timing metrics
      first_contentful_paint: getAuditValue("first-contentful-paint"),
      largest_contentful_paint: getAuditValue("largest-contentful-paint"),
      total_blocking_time: getAuditValue("total-blocking-time"),
      speed_index: getAuditValue("speed-index"),
      cumulative_layout_shift: getAuditValue("cumulative-layout-shift"),
      time_to_interactive: getAuditValue("interactive"),

      revenue_loss_percent: mainPageSpeedData.revenueLossPercent,

      // Audit groups
      audit_details: {
        allAudits: mainPageSpeedData.audit_details.allAudits,
        categoryScores: mainPageSpeedData.audit_details.categoryScores,
        optimization_opportunities: mainPageSpeedData.audit_details.optimization_opportunities,
        user_access_readiness: mainPageSpeedData.audit_details.user_access_readiness,
        seoAudits: mainPageSpeedData.audit_details.seoAudits,
        audits: mainPageSpeedData.audit_details.audits,
      },

      created_at: new Date(),
      updated_at: new Date(),
    },
    select: {
      website_analysis_id: true,
      revenue_loss_percent: true,
      best_practices_score: true,
    },
  });
}

