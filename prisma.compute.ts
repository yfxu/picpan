import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "fatu",
    framework: "nextjs",
    env: ".env",
  },
});
