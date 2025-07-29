// import express from 'express';
import { FacebookService } from './facebook.service';
import { Router } from "express";
import express, { Request, Response } from 'express';






export const getfacebookdata = async (req: Request, res: Response) => {
  const { website_id } = req.body;
const code = req.query.code as string;

  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenData = await FacebookService.getAccessToken(code);
    if (tokenData.error) throw tokenData.error;

    const profile = await FacebookService.getProfile(tokenData.access_token);
    res.json({ token: tokenData.access_token, profile });
  } catch (error: any) {
    console.error("Error analyzing YouTube data:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

