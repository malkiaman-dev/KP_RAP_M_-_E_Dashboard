import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The data files (Surveys/, Error_log/) live at the repo root, one level
  // above this Next.js project. Trace from the repo root and explicitly
  // include those folders so the API routes can read them in production
  // (e.g. on Vercel), where only traced files are bundled into the functions.
  outputFileTracingRoot: path.join(__dirname, ".."),
  outputFileTracingIncludes: {
    "/api/tracking": ["../Surveys/**/*"],
    "/api/metrics": ["../Surveys/**/*"],
    "/api/errors": ["../Error_log/**/*"],
  },
};

export default nextConfig;
