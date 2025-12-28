import { defineConfig } from "@trigger.dev/sdk/v3";
// import { ffmpeg } from "@trigger.dev/build/extensions/core"; // Temporarily disabled - causing build timeout

export default defineConfig({
  project: "proj_svvzmeckyarzlgvgnpoc",
  runtime: "node",
  logLevel: "log",
  maxDuration: 300, // 5 minutes for video processing
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["."],
  // build: {
  //   extensions: [
  //     ffmpeg(),
  //   ],
  // },
});
