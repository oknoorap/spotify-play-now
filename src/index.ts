#!/usr/bin/env node

import { existsSync } from "fs";
import { argv } from "yargs";
import fastify from "fastify";

import Spotify from "./lib/class-spotify";
import Refetcher from "./lib/class-refetcher";
import { error, info } from "./utils/logger";

const { id: clientId, secret: clientSecret, out, port } = argv;

if (!clientId && !clientSecret) {
  error("No client ID or client secret.", true);
}

if (!out && !existsSync(out)) {
  error("Please set output file.", true);
}

const PORT = port || 8787;

const REDIRECT_URI = `https://hardcore-bose-4e8012.netlify.com/?localport=${PORT}`;

const CREDENTIALS = {
  clientId,
  clientSecret,
  redirectUri: REDIRECT_URI
};

const spotify = new Spotify(CREDENTIALS);

const server = fastify();

const refetcher = new Refetcher();

server.get("/", async (request, reply) => {
  const { code } = request.query;

  if (code) {
    spotify.setAuthorizeCode(code);

    // Set rule when we refetch again.
    refetcher.setRefetchPolicy((now: number) => {
      const { time, duration } = refetcher.info;
      const endTime = time + duration;
      const remaining = Math.ceil((endTime - now) / 1000);
      const isEnded = remaining === -2;

      // info({ isEnded, remaining });
      return isEnded;
    });

    // Refetch when song finish.
    // Or check every 60 seconds / 1 minute.
    refetcher.run(async () => {
      const cachedInfo = { ...refetcher.info };

      const playbackInfo = await spotify.getPlaybackInfo();
      refetcher.setInfo(playbackInfo);

      const { song, album, singer, playing } = refetcher.info;
      if (!playing) {
        // Write file
      }

      if (playing && cachedInfo.song !== song && cachedInfo.album !== album) {
        info(`${song} - ${album} by ${singer}`);
      }
    }, 60 * 1000);
  }

  reply.type("text/html");

  return `<html><head><meta charset="utf-8" /><title>Spotify Currently Play</title></head><body style="padding:0;margin:0;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-family:sans-serif">You're now can close this page.</body></html>`;
});

const startServer = async () => {
  try {
    await server.listen(PORT);
    info("Listening to your spotify playback.");

    // And request authorization.
    spotify.open();
  } catch (err) {
    error(err.message, true);
  }
};

// Start server
startServer();
