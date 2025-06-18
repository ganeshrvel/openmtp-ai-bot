import { Mastra } from "@mastra/core/mastra";
import { weatherAgent } from "./agents/weather-agent";
import {githubAgent} from "@/mastra/agents/github";
import { z } from "zod";
import {appAgent} from "@/mastra/agents/app-agent";
import {weatherWorkflow} from "@/mastra/workflows/app-workflow";
import {openai} from "@ai-sdk/openai";
import {embed, embedMany} from "ai";
import { MDocument } from "@mastra/rag";
import {LanceVectorStore} from "@mastra/lance";
import { LibSQLVector } from "@mastra/libsql";

import { PgVector } from "@mastra/pg";

export const mastra = new Mastra({
  
  workflows: {   "weather-analysis": weatherWorkflow  },
  agents: { weatherAgent , githubAgent, appAgent}
});


// const response = await weatherAgent.generate([
//   { role: "user", content: "Hello, how can you assist me today?" },
// ]);
// console.log("Agent:", response.text);


// const stream = await weatherAgent.stream([
//   { role: "user", content: "Tell me a story." },
// ]);
//
// console.log("Agent:");
//
// for await (const chunk of stream.textStream) {
//   process.stdout.write(chunk);
// }


// Define the Zod schema
const schema = z.object({
  summary: z.string(),
  keywords: z.array(z.string()),
});




const responses = await appAgent.generate(
  [
    {
      role: "user",
      content:
        "Please provide a summary and keywords for the following text: Whats openmtp",
    },
  ],
  {
    output: schema,
    maxSteps: 5,
    
   // onStepFinish: ({ text, toolCalls, toolResults }) => {
     // console.log("Step completed:", { text, toolCalls, toolResults });
   // },
  },
);

// await appAgent.stream("Remember my favorite color is blue.", {
//   resourceId: "test_mem",
//   threadId: "preferences_thread",
// });
//
// const run = mastra.getWorkflow("weather-analysis").createRun();
//
// const result = await run.stream({
//   inputData: { city: "Paris" }
// });
//
// for await (const chunk of result.stream) {
//   console.log("Progress:", chunk);
//   // Shows each step as it completes
// }

// const mem_response = await appAgent.stream("What's my favorite color?", {
//   resourceId: "test_mem",
//   threadId: "preferences_thread",
// });

// const mem = await mem_response.text
//
// console.log("Structured Output:", responses.object);
// console.log("m/y Output:", mem);


// const documentText = `
//     Mastra is a TypeScript framework for building AI applications.
//     It provides tools for RAG, agents, and workflows.
//     LanceDB is a local vector database perfect for development.
//     Vector embeddings help find similar content based on meaning.
//   `;
// const doc = MDocument.fromText(documentText);
//
// // 2. Create chunks
// const chunks = await doc.chunk({
//   strategy: "recursive",
//   size: 512,
//   overlap: 50,
// });
//
// // 3. Generate embeddings; we need to pass the text of each chunk
// const { embeddings } = await embedMany({
//   values: chunks.map((chunk) => chunk.text),
//   model: openai.embedding("text-embedding-3-small"),
// });
//
//
//
// await lanceVector.upsert({
//   indexName: "embeddings",
//   vectors: embeddings,
//   metadata: chunks.map(chunk => ({ text: chunk.text })),
// });
//
// // 5. Query similar chunks
// const query = "What is Mastra?";
// const { embedding: queryVector } = await embed({
//   value: query,
//   model: openai.embedding("text-embedding-3-small"),
// });
//
// const results = await lanceVector.query({
//   indexName: "embeddings",
//   queryVector: queryVector,
//   topK: 3,
// });
//
// console.log("Query:", query);
// console.log("Similar chunks:", results);
//

async function workingLanceRAG() {
  console.log("🚀 Ingesting documents...");
  
  // Multiple sources
  const sources = [
    {
      name: "mastra-doc",
      text: `
        Mastra is a TypeScript framework for building AI applications.
        It provides tools for RAG, agents, and workflows.
      `,
    },
    {
      name: "lancedb-doc",
      text: `
        LanceDB is a local vector database perfect for development.
        It allows storing and querying high-dimensional vectors.
      `,
    },
    {
      name: "embedding-doc",
      text: `
        Vector embeddings help find similar content based on meaning.
        They are numerical representations of text.
      `,
    },
    {
      name: "agents-doc",
      text: `
        Mastra agents can orchestrate multi-step reasoning and workflows.
        They are useful for task automation and memory chaining.
      `,
    },
  ];
  
  const allChunks: { text: string; source: string }[] = [];
  
  for (const src of sources) {
    const doc = MDocument.fromText(src.text);
    const chunks = await doc.chunk({ strategy: "recursive", size: 512, overlap: 50 });
    chunks.forEach(chunk => {
      allChunks.push({ text: chunk.text, source: src.name });
    });
  }
  
  const { embeddings } = await embedMany({
    values: allChunks.map(c => c.text),
    model: openai.embedding("text-embedding-3-small"),
  });
  
  const vectorStore = await LanceVectorStore.create("./data/lancedb");
  const tableName = "documents";
  
  // Create flat records
  const records = embeddings.map((vector, i) => ({
    id: `chunk-${i}`,
    vector,
    metadata: {
      text: allChunks[i].text,
      source: allChunks[i].source,
      chunk_index: i,
    },
  }));
  
  await vectorStore.createTable(tableName, records, { existOk: true });
  
  // 🔍 Sample test queries
  const queries = [
    "What is Mastra?",
    "How do vector embeddings work?",
    "Where can I store high-dimensional vectors?",
    "What is an AI agent workflow?",
  ];
  
  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"`);
    
    const { embedding: queryVec } = await embed({
      value: query,
      model: openai.embedding("text-embedding-3-small"),
    });
    
    const results = await vectorStore.query({
      tableName,
      queryVector: queryVec,
      topK: 4,
      includeAllColumns: true,
      indexName: "vector",
    });
    
    results.forEach((res, i) => {
      const { source, text } = res.metadata || {};
      console.log(`  ${i + 1}. Score: ${res.score?.toFixed(3)}`);
      console.log(`     Source: ${source}`);
      console.log(`     Text: ${text?.substring(0, 100)}...\n`);
    });
  }
  
  console.log("\n✅ Multi-source RAG complete.");
}

workingLanceRAG().catch(console.error);


// async function pgVectorRAG() {
//   console.log("🚀 Starting PgVector RAG...");
//
//   try {
//     // Sample document
//     const documentText = `
//       Mastra is a TypeScript framework for building AI applications.
//       It provides tools for RAG, agents, and workflows.
//       PostgreSQL with pgvector is excellent for production vector storage.
//       Vector embeddings help find similar content based on meaning.
//       Retrieval-Augmented Generation enhances LLM responses with relevant context.
//       You can use PgVector for both development and production deployments.
//     `;
//
//     // 1. Initialize document
//     console.log("📄 Processing document...");
//     const doc = MDocument.fromText(documentText);
//
//     // 2. Create chunks
//     const chunks = await doc.chunk({
//       strategy: "recursive",
//       size: 512,
//       overlap: 50,
//     });
//     console.log(`✂️ Created ${chunks.length} chunks`);
//
//     // 3. Generate embeddings; we need to pass the text of each chunk
//     const { embeddings } = await embedMany({
//       values: chunks.map((chunk) => chunk.text),
//       model: openai.embedding("text-embedding-3-small"),
//     });
//     console.log(`✨ Generated ${embeddings.length} embeddings`);
//
//     // 4. ✅ Store in PostgreSQL vector database (exactly like Mastra docs)
//     const pgVector = new PgVector({
//       connectionString: process.env.POSTGRES_CONNECTION_STRING!,
//     });
//
//     await pgVector.createIndex({
//       indexName: "embeddings",
//       dimension: 1536,
//     });
//
//     await pgVector.upsert({
//       indexName: "embeddings",
//       vectors: embeddings,
//       metadata: chunks.map(chunk => ({ text: chunk.text })),
//     });
//
//     console.log("✅ Data stored in PostgreSQL!");
//
//     // 5. Query similar chunks (exactly like the docs)
//     console.log("\n🔍 Testing queries...");
//     const queries = [
//       "What is Mastra?",
//       "Tell me about PostgreSQL and pgvector",
//       "How do vector embeddings work?",
//       "What is RAG?"
//     ];
//
//     for (const query of queries) {
//       console.log(`\n📝 Query: "${query}"`);
//
//       const { embedding: queryVector } = await embed({
//         value: query,
//         model: openai.embedding("text-embedding-3-small"),
//       });
//
//       const results = await pgVector.query({
//         indexName: "embeddings",
//         queryVector: queryVector,
//         topK: 3,
//       });
//
//       console.log(`📊 Found ${results.length} results:`);
//       results.forEach((result, index) => {
//         console.log(`  ${index + 1}. Score: ${result.score?.toFixed(3)}`);
//         console.log(`     Text: ${result.metadata?.text?.substring(0, 100)}...`);
//       });
//     }
//
//     console.log("\n🎉 PgVector RAG completed successfully!");
//
//   } catch (error) {
//     console.error("❌ Error:", error);
//   }
// }
//
// pgVectorRAG().catch(console.error);


// async function libsqlRAG() {
//   console.log("🚀 Starting LibSQL RAG...");
//
//   try {
//     // Sample document
//     const documentText = `
//       Mastra is a TypeScript framework for building AI applications.
//       It provides tools for RAG, agents, and workflows.
//       LibSQL is a SQLite-compatible database perfect for local development.
//       Vector embeddings help find similar content based on meaning.
//       Retrieval-Augmented Generation enhances LLM responses with relevant context.
//     `;
//
//     // 1. Initialize document
//     console.log("📄 Processing document...");
//     const doc = MDocument.fromText(documentText);
//
//     // 2. Create chunks
//     const chunks = await doc.chunk({
//       strategy: "recursive",
//       size: 512,
//       overlap: 50,
//     });
//     console.log(`✂️ Created ${chunks.length} chunks`);
//
//     // 3. Generate embeddings; we need to pass the text of each chunk
//     const { embeddings } = await embedMany({
//       values: chunks.map((chunk) => chunk.text),
//       model: openai.embedding("text-embedding-3-small"),
//     });
//     console.log(`✨ Generated ${embeddings.length} embeddings`);
//
//     // 4. ✅ Store in LibSQL vector database (following Mastra docs)
//     const libsqlVector = new LibSQLVector({
//       connectionUrl: "file:./data/vector.db",  // Local SQLite file
//     });
//
//     await libsqlVector.createIndex({
//       indexName: "embeddings",
//       dimension: 1536,
//     });
//
//     await libsqlVector.upsert({
//       indexName: "embeddings",
//       vectors: embeddings,
//       metadata: chunks.map(chunk => ({ text: chunk.text })), // ✅ This should work
//     });
//
//     console.log("✅ Data stored in LibSQL!");
//
//     // 5. Query similar chunks (exactly like the docs)
//     console.log("\n🔍 Testing queries...");
//     const queries = [
//       "What is Mastra?",
//       "Tell me about LibSQL",
//       "How do vector embeddings work?",
//       "What is RAG?"
//     ];
//
//     for (const query of queries) {
//       console.log(`\n📝 Query: "${query}"`);
//
//       const { embedding: queryVector } = await embed({
//         value: query,
//         model: openai.embedding("text-embedding-3-small"),
//       });
//
//       const results = await libsqlVector.query({
//         indexName: "embeddings",
//         queryVector: queryVector,
//         topK: 3,
//       });
//
//       console.log(`📊 Found ${results.length} results:`);
//       results.forEach((result, index) => {
//         console.log(`  ${index + 1}. Score: ${result.score?.toFixed(3)}`);
//         console.log(`     Text: ${result.metadata?.text?.substring(0, 100)}...`);
//       });
//     }
//
//     console.log("\n🎉 LibSQL RAG completed successfully!");
//
//   } catch (error) {
//     console.error("❌ Error:", error);
//   }
// }
//
// libsqlRAG().catch(console.error);
