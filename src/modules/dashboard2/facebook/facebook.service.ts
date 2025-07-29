import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const requiredEnvVars = [
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'FACEBOOK_REDIRECT_URI',
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI!;

export class FacebookService {
  static getAuthUrl() {
    const scope = 'email,public_profile';
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${scope}&response_type=code`;
  }

  static async getAccessToken(code: string) {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
      )}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`
    );
    if (!res.ok) {
      throw new Error(`Facebook API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  static async getProfile(accessToken: string) {
    const res = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
    );
    if (!res.ok) {
      throw new Error(`Facebook API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }
}