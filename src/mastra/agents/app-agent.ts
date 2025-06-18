import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import {Memory} from "@mastra/memory";
import {LibSQLStore} from "@mastra/libsql";
import { fastembed } from "@mastra/fastembed";
import {appInfo} from "@/mastra/tools/app-tools";

import { z } from "zod";


// const memory = new Memory({
//   embedder: fastembed,
//   storage: new LibSQLStore({
//     url: "file:/../../memory.db",
//   }),
// });


export const appAgent = new Agent({
  name: 'App agent',
  instructions: `You are a helpful app agent with memory`,
  model: openai('gpt-4o-mini'),
  tools: { /*appInfo*/ },
  // memory
});

