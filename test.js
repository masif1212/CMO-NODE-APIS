// index.js
require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.YOUTUBE_API_KEY;

async function getChannelIdFromUrl(url) {
  const parsed = new URL(url);
  const path = parsed.pathname.split("/").filter(Boolean);

  if (path.length === 0) {
    throw new Error("Invalid YouTube URL format.");
  }

  const [type, identifier] = path;

  if (type === "channel") {
    return identifier;
  }

  if (type === "user") {
    const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${identifier}&key=${API_KEY}`;
    const res = await axios.get(apiUrl);
    if (res.data.items.length === 0) throw new Error("User not found.");
    return res.data.items[0].id;
  }

  if (type === "c") {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${identifier}&key=${API_KEY}`;
    const res = await axios.get(searchUrl);
    if (res.data.items.length === 0) throw new Error("Custom channel not found.");
    return res.data.items[0].snippet.channelId;
  }

  throw new Error("Unsupported or unknown URL format.");
}

// Change the URL below to test different formats
const testUrl = "https://www.youtube.com/c/Veritasium";

getChannelIdFromUrl(testUrl)
  .then(channelId => {
    console.log("  Channel ID:", channelId);
  })
  .catch(err => {
    console.error("❌ Error:", err.message);
  });
