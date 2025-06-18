import {z} from "zod";
import {createStep, createWorkflow} from "@mastra/core/workflows";

const step1 = createStep({
  id: "fetch-weather",
  inputSchema: z.object({
    city: z.string()
  }),
  outputSchema: z.object({
    temperature: z.number(),
    description: z.string()
  }),
  handler: async ({ inputs }) => {
    return {
      temperature:0,
      description: 'desc'
    };
  }
  
});
const step2 = createStep({
  id: "generate-recommendation",
  inputSchema: z.object({
    city: z.string(),
    temperature: z.number(),
    description: z.string()
  }),
  outputSchema: z.object({
    recommendation: z.string()
  }),
  handler: async ({ inputs }) => {
    return {
      recommendation: `In ${inputs.city}, it's ${inputs.description} at ${inputs.temperature}°C. Perfect weather for outdoor activities!`
    };
  }
});

export const weatherWorkflow = createWorkflow({
  id: "weather-analysis",
  description: 'Analyze weather and suggest activities',
  inputSchema: z.object({
    city: z.string()
  }),
  outputSchema: z.object({
    recommendation: z.string()
  })
})
  .then(step1)
  .then(step2)
  .commit();
