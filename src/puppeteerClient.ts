// // src/utils/puppeteerClient.ts
// import puppeteer, { Browser } from "puppeteer";

// let browserInstance: Browser | null = null;

// export async function getBrowser(): Promise<Browser> {
//   if (browserInstance) {
//     return browserInstance; // reuse the same instance
//   }

//   const mode = process.env.MODE;
//   console.log(`[brandprofile] Puppeteer launch MODE: ${mode}`);

//   let launchOptions: any;

//   if (mode === "production") {
//     launchOptions = {
//       executablePath: "/usr/bin/google-chrome-stable",
//       headless: "new" as any,
//       args: [
//         "--no-sandbox",
//         "--disable-setuid-sandbox",
//         "--disable-dev-shm-usage",
//         "--disable-gpu",
//       ],
//     };
//     console.log("[brandprofile] Launching Puppeteer with full browser for Cloud Run...");
//   } else if (mode === "development") {
//     launchOptions = {
//       headless: "new" as any,
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     };
//     console.log("[brandprofile] Launching Puppeteer in headless mode for local environment...");
//   } else {
//     const errorMsg = `[brandprofile] ERROR: Invalid MODE '${mode}'. Expected 'production' or 'development'.`;
//     console.error(errorMsg);
//     throw new Error(errorMsg);
//   }

//   browserInstance = await puppeteer.launch(launchOptions);
//   console.log("[brandprofile] Puppeteer browser launched successfully.");
//   return browserInstance;
// }

// // Optional: graceful shutdown
// export async function closeBrowser() {
//   if (browserInstance) {
//     await browserInstance.close();
//     browserInstance = null;
//     console.log("[brandprofile] Puppeteer browser closed.");
//   }
// }
