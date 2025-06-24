import { GitHubIssuesIndexer } from "@/lib/index-github-issues";
import { OpenMTPVectorStore } from "@/lib/vector-store";
import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";
import {openmtpAgent, pgVector} from "@/mastra/agents/openmtp-agent";
import { LangfuseExporter } from "langfuse-vercel";

import {
  OpenInferenceOTLPTraceExporter,
  isOpenInferenceSpan,
} from "@arizeai/openinference-mastra";

// Check if we should run indexing mode
if (process.env.INDEX_MODE === 'true') {
  console.log("🔧 Running in INDEX_MODE...");
  
  async function runIndexing() {
    try {
      // Delete existing index
      try {
        await pgVector.deleteIndex({ indexName: 'openmtp_embeddings' });
        console.log("🗑️ Deleted existing index");
      } catch (error) {
        console.log("ℹ️ No existing index to delete");
      }
      
      // Initialize vectorStore after deletion
      const vectorStore = new OpenMTPVectorStore(pgVector);
      await vectorStore.initialize();
      
      const indexer = new GitHubIssuesIndexer(vectorStore);
      await indexer.indexIssues();
      
      console.log("✅ Indexing completed successfully!");
      process.exit(0);
    } catch (error) {
      console.error("❌ Indexing failed:", error);
      process.exit(1);
    }
  }
  
  await runIndexing();
  process.exit(0);
}

// Normal mode - initialize vectorStore for API
const vectorStore = new OpenMTPVectorStore(pgVector);
await vectorStore.initialize();

export const mastra = new Mastra({
  agents: {openmtpAgent},
  vectors: { pgVector },
  logger: new PinoLogger({
    name: "OpenMTP-AI",
    level: "debug",
  }),
  telemetry: {
    serviceName: "ai",
    enabled: true,
    export: {
      type: "custom",
      exporter: new LangfuseExporter({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_BASEURL,
      }),
    },
  },
});

// export const mastra = new Mastra({
//   agents: {openmtpAgent},
//   vectors: { pgVector },
//   logger: new PinoLogger({
//     name: "OpenMTP-AI",
//     level: "debug",
//   }),
//   telemetry: {
//     serviceName: "openmtp-ai-bot",
//     enabled: true,
//     // export: {
//     //   type: "custom",
//     //   exporter: new OpenInferenceOTLPTraceExporter({
//     //   url: process.env.PHOENIX_COLLECTOR_ENDPOINT!,
//     //     headers: {
//     //       Authorization: `Bearer ${process.env.PHOENIX_API_KEY}`,
//     //     },
//     //     spanFilter: isOpenInferenceSpan,
//     //   }),
//     // },
//   },
// });

console.log("💬 Starting OpenMTP conversation interface...");


// import { GitHubIssuesIndexer } from "@/lib/index-github-issues";
// import { OpenMTPVectorStore } from "@/lib/vector-store";
// import { Mastra } from "@mastra/core";
// import { PinoLogger } from "@mastra/loggers";
// import {openmtpAgent, pgVector} from "@/mastra/agents/openmtp-agent";
//
// import { LangfuseExporter } from "langfuse-vercel";
//
// const vectorStore = new OpenMTPVectorStore(pgVector);
// await vectorStore.initialize();
//
//
// export const mastra = new Mastra({
//   agents: {openmtpAgent},
//   vectors: { pgVector },
//   // workflows: { openmtpWorkflow },
//   logger: new PinoLogger({
//     name: "OpenMTP-AI",
//     level: "debug",
//   }),
//   telemetry: {
//     serviceName: "ai", // this must be set to "ai" so that the LangfuseExporter thinks it's an AI SDK trace
//     enabled: true,
//     export: {
//       type: "custom",
//       exporter: new LangfuseExporter({
//         publicKey: process.env.LANGFUSE_PUBLIC_KEY,
//         secretKey: process.env.LANGFUSE_SECRET_KEY,
//         baseUrl: process.env.LANGFUSE_BASEURL,
//       }),
//     },
//   },
// });
//
// // Check if we should run indexing mode
// if (process.env.INDEX_MODE === 'true') {
//   console.log("🔧 Running in INDEX_MODE...");
//
//   async function runIndexing() {
//     try {
//       // Delete existing index
//       try {
//         await pgVector.deleteIndex({ indexName: 'openmtp_embeddings' });
//         console.log("🗑️ Deleted existing index");
//       } catch (error) {
//         console.log("ℹ️ No existing index to delete");
//       }
//
//       const indexer = new GitHubIssuesIndexer(vectorStore);
//       await indexer.initialize();
//       await indexer.indexIssues();
//
//       console.log("✅ Indexing completed successfully!");
//       process.exit(0);
//     } catch (error) {
//       console.error("❌ Indexing failed:", error);
//       process.exit(1);
//     }
//   }
//
//   await runIndexing();
//
//   process.exit(0);
// }
//
// console.log("💬 Starting OpenMTP conversation interface...");
// await startChatInterface('ganesh');

// const response = await openmtpAgent.generate("How to fix device not recognized?");
// console.log(response.text);


// import { Mastra } from "@mastra/core/mastra";
// import { weatherAgent } from "./agents/weather-agent";
// import {githubAgent} from "@/mastra/agents/github";
// import { z } from "zod";
// import {appAgent} from "@/mastra/agents/app-agent";
// import {weatherWorkflow} from "@/mastra/workflows/app-workflow";
// import {openai} from "@ai-sdk/openai";
// import {embed, embedMany} from "ai";
// import { MDocument } from "@mastra/rag";
// import {LanceVectorStore} from "@mastra/lance";
// import { LibSQLVector } from "@mastra/libsql";
//
// import { PgVector } from "@mastra/pg";
//
// export const mastra = new Mastra({
//
//   workflows: {   "weather-analysis": weatherWorkflow  },
//   agents: { weatherAgent , githubAgent, appAgent}
// });
//
//
// // const response = await weatherAgent.generate([
// //   { role: "user", content: "Hello, how can you assist me today?" },
// // ]);
// // console.log("Agent:", response.text);
//
//
// // const stream = await weatherAgent.stream([
// //   { role: "user", content: "Tell me a story." },
// // ]);
// //
// // console.log("Agent:");
// //
// // for await (const chunk of stream.textStream) {
// //   process.stdout.write(chunk);
// // }
//
//
// // Define the Zod schema
// const schema = z.object({
//   summary: z.string(),
//   keywords: z.array(z.string()),
// });
//
//
//
//
// const responses = await appAgent.generate(
//   [
//     {
//       role: "user",
//       content:
//         "Please provide a summary and keywords for the following text: Whats openmtp",
//     },
//   ],
//   {
//     output: schema,
//     maxSteps: 5,
//
//    // onStepFinish: ({ text, toolCalls, toolResults }) => {
//      // console.log("Step completed:", { text, toolCalls, toolResults });
//    // },
//   },
// );
//
// // await appAgent.stream("Remember my favorite color is blue.", {
// //   resourceId: "test_mem",
// //   threadId: "preferences_thread",
// // });
// //
// // const run = mastra.getWorkflow("weather-analysis").createRun();
// //
// // const result = await run.stream({
// //   inputData: { city: "Paris" }
// // });
// //
// // for await (const chunk of result.stream) {
// //   console.log("Progress:", chunk);
// //   // Shows each step as it completes
// // }
//
// // const mem_response = await appAgent.stream("What's my favorite color?", {
// //   resourceId: "test_mem",
// //   threadId: "preferences_thread",
// // });
//
// // const mem = await mem_response.text
// //
// // console.log("Structured Output:", responses.object);
// // console.log("m/y Output:", mem);
//
//
// // const documentText = `
// //     Mastra is a TypeScript framework for building AI applications.
// //     It provides tools for RAG, agents, and workflows.
// //     LanceDB is a local vector database perfect for development.
// //     Vector embeddings help find similar content based on meaning.
// //   `;
// // const doc = MDocument.fromText(documentText);
// //
// // // 2. Create chunks
// // const chunks = await doc.chunk({
// //   strategy: "recursive",
// //   size: 512,
// //   overlap: 50,
// // });
// //
// // // 3. Generate embeddings; we need to pass the text of each chunk
// // const { embeddings } = await embedMany({
// //   values: chunks.map((chunk) => chunk.text),
// //   model: openai.embedding("text-embedding-3-small"),
// // });
// //
// //
// //
// // await lanceVector.upsert({
// //   indexName: "embeddings",
// //   vectors: embeddings,
// //   metadata: chunks.map(chunk => ({ text: chunk.text })),
// // });
// //
// // // 5. Query similar chunks
// // const query = "What is Mastra?";
// // const { embedding: queryVector } = await embed({
// //   value: query,
// //   model: openai.embedding("text-embedding-3-small"),
// // });
// //
// // const results = await lanceVector.query({
// //   indexName: "embeddings",
// //   queryVector: queryVector,
// //   topK: 3,
// // });
// //
// // console.log("Query:", query);
// // console.log("Similar chunks:", results);
// //
//
// async function workingLanceRAG() {
//   console.log("🚀 Ingesting OpenMTP GitHub issues...");
//
//   // Read from openmtp-gh-issues directory
//   const fs = require('fs');
//   const path = require('path');
//
//   const issuesDir = '../../openmtp-gh-issues';
//   const sources: { name: string; text: string }[] = [];
//
//   try {
//     const files = fs.readdirSync(issuesDir).filter((file: string) => file.endsWith('.json'));
//     console.log(`Found ${files.length} issue files`);
//
//     // Process first 20 issues for minimal setup
//     files.slice(0, 20).forEach((file: string) => {
//       const filePath = path.join(issuesDir, file);
//       const content = fs.readFileSync(filePath, 'utf-8');
//       const issue = JSON.parse(content);
//
//       // Create searchable text from issue
//       let text = `Issue #${issue.issue_number}: ${issue.title}\n\n`;
//       text += `Question: ${issue.question.body}\n\n`;
//
//       if (issue.answers && issue.answers.length > 0) {
//         text += 'Developer Answers:\n';
//         issue.answers.forEach((answer: any, index: number) => {
//           text += `${index + 1}. ${answer.body}\n\n`;
//         });
//       }
//
//       if (issue.replies && issue.replies.length > 0) {
//         text += 'User Replies:\n';
//         issue.replies.forEach((reply: any, index: number) => {
//           text += `${index + 1}. ${reply.author}: ${reply.body}\n\n`;
//         });
//       }
//
//       if (issue.labels && issue.labels.length > 0) {
//         text += `Labels: ${issue.labels.join(', ')}\n`;
//       }
//
//       text += `Status: ${issue.status}\nURL: ${issue.url}`;
//
//       sources.push({
//         name: `issue-${issue.issue_number}`,
//         text: text
//       });
//     });
//   } catch (error) {
//     console.error('Error reading issues:', error);
//     // Fallback to demo data
//     sources.push({
//       name: "openmtp-demo",
//       text: `
//         OpenMTP is a macOS app for Android file transfer via MTP protocol.
//         It supports Kalam mode for faster transfers and list view for file browsing.
//         Common issues include device recognition problems and transfer speed optimization.
//       `,
//     });
//   }
//
//   const allChunks: { text: string; source: string }[] = [];
//
//   for (const src of sources) {
//     const doc = MDocument.fromText(src.text);
//     const chunks = await doc.chunk({ strategy: "recursive", size: 512, overlap: 50 });
//     chunks.forEach(chunk => {
//       allChunks.push({ text: chunk.text, source: src.name });
//     });
//   }
//
//   const { embeddings } = await embedMany({
//     values: allChunks.map(c => c.text),
//     model: openai.embedding("text-embedding-3-small"),
//   });
//
//   const vectorStore = await LanceVectorStore.create("./data/lancedb");
//   const tableName = "documents";
//
//   // Create flat records
//   const records = embeddings.map((vector, i) => ({
//     id: `chunk-${i}`,
//     vector,
//     metadata: {
//       text: allChunks[i].text,
//       source: allChunks[i].source,
//       chunk_index: i,
//     },
//   }));
//
//   await vectorStore.createTable(tableName, records, { existOk: true });
//
//   // 🔍 OpenMTP test queries
//   const queries = [
//     "What is OpenMTP?",
//     "How to enable the List mode in the app?",
//     "How to toggle between these two MTP kernel modes?",
//     "Device not recognized error",
//     "Transfer speed is slow",
//   ];
//
//   for (const query of queries) {
//     console.log(`\n📝 Query: "${query}"`);
//
//     const { embedding: queryVec } = await embed({
//       value: query,
//       model: openai.embedding("text-embedding-3-small"),
//     });
//
//     const results = await vectorStore.query({
//       tableName,
//       queryVector: queryVec,
//       topK: 4,
//       includeAllColumns: true,
//       indexName: "vector",
//     });
//
//     results.forEach((res, i) => {
//       const { source, text } = res.metadata || {};
//       console.log(`  ${i + 1}. Score: ${res.score?.toFixed(3)}`);
//       console.log(`     Source: ${source}`);
//       console.log(`     Text: ${text?.substring(0, 100)}...\n`);
//     });
//   }
//
//   console.log("\n✅ Multi-source RAG complete.");
// }
//
// workingLanceRAG().catch(console.error);
//
//
// // async function pgVectorRAG() {
// //   console.log("🚀 Starting PgVector RAG...");
// //
// //   try {
// //     // Sample document
// //     const documentText = `
// //       Mastra is a TypeScript framework for building AI applications.
// //       It provides tools for RAG, agents, and workflows.
// //       PostgreSQL with pgvector is excellent for production vector storage.
// //       Vector embeddings help find similar content based on meaning.
// //       Retrieval-Augmented Generation enhances LLM responses with relevant context.
// //       You can use PgVector for both development and production deployments.
// //     `;
// //
// //     // 1. Initialize document
// //     console.log("📄 Processing document...");
// //     const doc = MDocument.fromText(documentText);
// //
// //     // 2. Create chunks
// //     const chunks = await doc.chunk({
// //       strategy: "recursive",
// //       size: 512,
// //       overlap: 50,
// //     });
// //     console.log(`✂️ Created ${chunks.length} chunks`);
// //
// //     // 3. Generate embeddings; we need to pass the text of each chunk
// //     const { embeddings } = await embedMany({
// //       values: chunks.map((chunk) => chunk.text),
// //       model: openai.embedding("text-embedding-3-small"),
// //     });
// //     console.log(`✨ Generated ${embeddings.length} embeddings`);
// //
// //     // 4. ✅ Store in PostgreSQL vector database (exactly like Mastra docs)
// //     const pgVector = new PgVector({
// //       connectionString: process.env.POSTGRES_CONNECTION_STRING!,
// //     });
// //
// //     await pgVector.createIndex({
// //       indexName: "embeddings",
// //       dimension: 1536,
// //     });
// //
// //     await pgVector.upsert({
// //       indexName: "embeddings",
// //       vectors: embeddings,
// //       metadata: chunks.map(chunk => ({ text: chunk.text })),
// //     });
// //
// //     console.log("✅ Data stored in PostgreSQL!");
// //
// //     // 5. Query similar chunks (exactly like the docs)
// //     console.log("\n🔍 Testing queries...");
// //     const queries = [
// //       "What is Mastra?",
// //       "Tell me about PostgreSQL and pgvector",
// //       "How do vector embeddings work?",
// //       "What is RAG?"
// //     ];
// //
// //     for (const query of queries) {
// //       console.log(`\n📝 Query: "${query}"`);
// //
// //       const { embedding: queryVector } = await embed({
// //         value: query,
// //         model: openai.embedding("text-embedding-3-small"),
// //       });
// //
// //       const results = await pgVector.query({
// //         indexName: "embeddings",
// //         queryVector: queryVector,
// //         topK: 3,
// //       });
// //
// //       console.log(`📊 Found ${results.length} results:`);
// //       results.forEach((result, index) => {
// //         console.log(`  ${index + 1}. Score: ${result.score?.toFixed(3)}`);
// //         console.log(`     Text: ${result.metadata?.text?.substring(0, 100)}...`);
// //       });
// //     }
// //
// //     console.log("\n🎉 PgVector RAG completed successfully!");
// //
// //   } catch (error) {
// //     console.error("❌ Error:", error);
// //   }
// // }
// //
// // pgVectorRAG().catch(console.error);
//
//
// // async function libsqlRAG() {
// //   console.log("🚀 Starting LibSQL RAG...");
// //
// //   try {
// //     // Sample document
// //     const documentText = `
// //       Mastra is a TypeScript framework for building AI applications.
// //       It provides tools for RAG, agents, and workflows.
// //       LibSQL is a SQLite-compatible database perfect for local development.
// //       Vector embeddings help find similar content based on meaning.
// //       Retrieval-Augmented Generation enhances LLM responses with relevant context.
// //     `;
// //
// //     // 1. Initialize document
// //     console.log("📄 Processing document...");
// //     const doc = MDocument.fromText(documentText);
// //
// //     // 2. Create chunks
// //     const chunks = await doc.chunk({
// //       strategy: "recursive",
// //       size: 512,
// //       overlap: 50,
// //     });
// //     console.log(`✂️ Created ${chunks.length} chunks`);
// //
// //     // 3. Generate embeddings; we need to pass the text of each chunk
// //     const { embeddings } = await embedMany({
// //       values: chunks.map((chunk) => chunk.text),
// //       model: openai.embedding("text-embedding-3-small"),
// //     });
// //     console.log(`✨ Generated ${embeddings.length} embeddings`);
// //
// //     // 4. ✅ Store in LibSQL vector database (following Mastra docs)
// //     const libsqlVector = new LibSQLVector({
// //       connectionUrl: "file:./data/vector.db",  // Local SQLite file
// //     });
// //
// //     await libsqlVector.createIndex({
// //       indexName: "embeddings",
// //       dimension: 1536,
// //     });
// //
// //     await libsqlVector.upsert({
// //       indexName: "embeddings",
// //       vectors: embeddings,
// //       metadata: chunks.map(chunk => ({ text: chunk.text })), // ✅ This should work
// //     });
// //
// //     console.log("✅ Data stored in LibSQL!");
// //
// //     // 5. Query similar chunks (exactly like the docs)
// //     console.log("\n🔍 Testing queries...");
// //     const queries = [
// //       "What is Mastra?",
// //       "Tell me about LibSQL",
// //       "How do vector embeddings work?",
// //       "What is RAG?"
// //     ];
// //
// //     for (const query of queries) {
// //       console.log(`\n📝 Query: "${query}"`);
// //
// //       const { embedding: queryVector } = await embed({
// //         value: query,
// //         model: openai.embedding("text-embedding-3-small"),
// //       });
// //
// //       const results = await libsqlVector.query({
// //         indexName: "embeddings",
// //         queryVector: queryVector,
// //         topK: 3,
// //       });
// //
// //       console.log(`📊 Found ${results.length} results:`);
// //       results.forEach((result, index) => {
// //         console.log(`  ${index + 1}. Score: ${result.score?.toFixed(3)}`);
// //         console.log(`     Text: ${result.metadata?.text?.substring(0, 100)}...`);
// //       });
// //     }
// //
// //     console.log("\n🎉 LibSQL RAG completed successfully!");
// //
// //   } catch (error) {
// //     console.error("❌ Error:", error);
// //   }
// // }
// //
// // libsqlRAG().catch(console.error);
