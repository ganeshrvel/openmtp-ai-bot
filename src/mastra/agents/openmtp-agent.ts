import { Agent } from '@mastra/core';
import { createTool } from '@mastra/core/tools';
import { openai } from '@ai-sdk/openai';
import { createVectorQueryTool } from '@mastra/rag';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { embed } from 'ai';
import { z } from 'zod';


export const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});

const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: 'pgVector',
  indexName: 'openmtp_embeddings',
  model: openai.embedding('text-embedding-3-small'),
});

// Custom tool to retrieve and mark context for better observability

const retrieveContextTool = createTool({
  id: 'retrieve_context',
  description: 'Log retrieved documents from vectorQueryTool results',
  inputSchema: z.object({
    relevantContext: z.any(),
    sources: z.array(z.object({
      id: z.string(),
      metadata: z.any(),
      vector: z.array(z.number()).optional(),
      score: z.number(),
      document: z.string().optional(),
    })),
  }),
  execute: async ({ context: { relevantContext, sources } }) => {
  //   console.log(`📋 [RETRIEVED DOCUMENTS] Found ${sources.length} documents:`);
  //   sources.forEach((doc, index) => {
  //     console.log(`   ${index + 1}. ${doc.metadata?.issue_ref} (Score:
  // ${doc.score.toFixed(4)})`);
  //     console.log(`      Title: ${doc.metadata?.title}`);
  //     console.log(`      Preview: ${doc.document?.substring(0, 100) ||
  //     doc.metadata?.text?.substring(0, 100)}...`);
  //     console.log('---');
  //   });
    
    return {
      success: true,
      logged_count: sources.length,
    };
  },
});




// const retrieveContextTool = createTool({
//   id: 'retrieve_context',
//   description: 'Retrieve and mark relevant documents from the knowledge base for tracing',
//   inputSchema: z.object({
//     query: z.string().describe('The search query to find relevant documents'),
//     topK: z.number().optional().default(5).describe('Number of documents to retrieve'),
//   }),
//   execute: async ({ context: { query, topK } }) => {
//     try {
//       // console.log(`🔍 [CONTEXT RETRIEVAL] Searching for: "${query}"`);
//
//       // Generate query embedding
//       // const { embedding: queryVector } = await embed({
//       //   value: query,
//       //   model: openai.embedding('text-embedding-3-small'),
//       // });
//       //
//       // // Search in PgVector
//       // const results = await pgVector.query({
//       //   indexName: 'openmtp_embeddings',
//       //   queryVector,
//       //   topK,
//       // });
//       //
//   //     // Log retrieved documents
//   //     console.log(`📋 [RETRIEVED DOCUMENTS] Found ${results.length}
//   // documents:`);
//   //     results.forEach((doc, index) => {
//   //       console.log(`   ${index + 1}. ${doc.metadata?.issue_ref} (Score:
//   // ${doc.score?.toFixed(4)})`);
//   //       console.log(`      Title: ${doc.metadata?.title}`);
//   //       console.log(`      Preview: ${doc.metadata?.text?.substring(0,
//   //         100)}...`);
//   //       console.log('---');
//   //     });
//
//       const retrievedDocs = results.map((result, index) => ({
//         id: `doc-${index + 1}`,
//         score: result.score,
//         issue_ref: result.metadata?.issue_ref || `Unknown Issue`,
//         title: result.metadata?.title || 'No title',
//         text_preview: result.document || '',
//         url: result.metadata?.url || 'No URL',
//       }));
//
//   //     console.log(`✅ [RETRIEVAL SUMMARY] Found ${retrievedDocs.length}
//   // relevant documents`);
//
//       return {
//         success: true,
//         message: `Successfully retrieved ${retrievedDocs.length} relevant
//   documents for query: "${query}"`,
//         query,
//         topK,
//         documents: retrievedDocs,
//         count: retrievedDocs.length,
//       };
//
//     } catch (error) {
//       // console.error('❌ [CONTEXT RETRIEVAL ERROR]', error);
//       return {
//         success: false,
//         message: `Failed to retrieve context: ${error}`,
//         query,
//         topK,
//         documents: [],
//         count: 0,
//       };
//     }
//   },
// })
// const retrieveContextTool = createTool({
//   id: 'retrieve_context',
//   description: 'Retrieve and mark relevant documents from the knowledge base for tracing',
//   inputSchema: z.object({
//     query: z.string().describe('The search query to find relevant documents'),
//     topK: z.number().optional().default(5).describe('Number of documents to retrieve'),
//   }),
//   execute: async ({ context: { query, topK } }) => {
//     console.log(`🔍 [CONTEXT RETRIEVAL] Searching for: "${query}"`);
//     return { message: "Tool executed successfully", query, topK };
//   },
// });

// const debugTool = createTool({
//   id: 'debug_tool',
//   description: 'Debug tool to test tool execution',
//   inputSchema: z.object({
//     message: z.string().describe('Debug message to log'),
//   }),
//   execute: async ({ context: { message } }) => {
//     // console.log(`🔧 [DEBUG TOOL] ${message}`);
//     return { success: true, message: `Debug executed: ${message}` };
//   },
// });
//
// // Initialize memory with PostgreSQL storage
// const memory = new Memory({
//   storage: new PostgresStore({
//     connectionString: process.env.POSTGRES_CONNECTION_STRING!,
//   }),
//   embedder: openai.embedding('text-embedding-3-small'),
//   vector: pgVector,
//   options: {
//     lastMessages: 10,              // Keep last 10 messages in context
//     semanticRecall: {              // Vector-based semantic search
//       topK: 4,                     // Top 4 similar memories
//       messageRange: 3,             // Include 3 messages before/after each match
//     scope: 'thread',             // Search within current thread
//   },
//   workingMemory: {               // Persistent working memory
//     enabled: true,
//     template: `# OpenMTP Support Session
//
//   ## User Problem Context
//   - Current Issue:
//   - Device Info:
//   - OS Version:
//   - Transfer Type:
//
//   ## Solutions Attempted
//   - None yet
//
//   ## Knowledge Base References
//   - Relevant Issues:
//   - Documentation Links:
//
//   ## Session Status
//   - Started: ${new Date().toISOString()}
//   - Resolution Status: In Progress
//   `
//   }
// }
// });

export const openmtpAgent = new Agent({
  name: 'OpenMTP Agent',
  instructions: `You are an OpenMTP specialist assistant with enhanced context
  tracing.

    WORKFLOW:
    1. FIRST use the vectorQueryTool to search the knowledge base with queryText
  and topK
    2. THEN use the retrieveContextTool to log the results from vectorQueryTool
    3. Base your responses on the retrieved and marked GitHub issues

    IMPORTANT CONTEXT UNDERSTANDING:
    - Issues contain questions (from users) and answers[] (from app
  owner/developers)
    - Prioritize answers[] from the app owner as authoritative solutions
    - Some replies may also contain valuable answers
    - Questions are usually in the title, sometimes with additional body text
    - Always distinguish between user questions vs official developer answers

    The retrieveContextTool will:
    - Log detailed information about each retrieved document
    - Provide observability into what context is being used
    - Return marked context with scores and metadata

    RESPONSE GUIDELINES:
  - Prioritize official answers from the app owner in your responses
  - Reference specific GitHub issue numbers and URLs
  - Distinguish between official solutions vs user discussions
  - If official answers exist, present them as the primary solution
  - If no official answers exist, provide helpful suggestions based on similar
  issues and common troubleshooting steps
  - Include user questions for context but emphasize practical solutions
  - Never state "no official responses" - instead offer actionable
  recommendations

  Always search the knowledge base before answering questions about OpenMTP.\`,

  The agent should suggest solutions like:
  - Based on similar device detection issues from other GitHub issues`,
  model: openai('gpt-4o-mini'),
  tools: { vectorQueryTool, retrieveContextTool },
});



// export class OpenMTPAgent {
//   private vectorStore: OpenMTPVectorStore;
//   private agent: Agent;
//
//   constructor() {
//     this.
//
//     this.agent = n
//
//   async initialize() {
//     await this.vectorStore.initialize();
//   }
//
//   async searchSimilarIssues(query: string, limit: number = 5) {
//     const pgVector = this.vectorStore.getPgVector();
//     const indexName = this.vectorStore.getIndexName();
//
//     // Generate query embedding
//     const { embedding: queryVector } = await embed({
//       value: query,
//       model: openai.embedding('text-embedding-3-small'),
//     });
//
//     // Search in PgVector
//     return await pgVector.query({
//       indexName,
//       queryVector,
//       topK: limit,
//     });
//   }
//
//   async generateResponse(query: string) {
//     // Search for relevant issues
//     const similarIssues = await this.searchSimilarIssues(query, 5);
//
//     // Format context from search results
//     let context = '';
//     if (similarIssues.length > 0) {
//       context = 'Relevant issues from OpenMTP repository:\n\n';
//       similarIssues.forEach((result, index) => {
//         const metadata = result.metadata;
//         context += `${index + 1}. ${metadata?.issue_ref ||
//         'Issue'}\n`;
//         context += `   Status: ${metadata?.status}\n`;
//         context += `   URL: ${metadata?.url}\n`;
//         context += `   Content: ${metadata?.text?.substring(0,
//           300)}...\n\n`;
//       });
//     } else {
//       context = 'No directly relevant issues found in the knowledgebase.\n\n';
//     }
//
//     // Generate response using the agent
//     const response = await this.agent.generate([
//       {
//         role: 'user',
//         content: `Context from OpenMTP
//   repository:\n${context}\n\nUser question: ${query}\n\nProvide a
//   helpful response based on the context above. If you reference any
//   issues, include their numbers and URLs.`,
//       },
//     ]);
//
//     return {
//       response: response.text,
//       similarIssues: similarIssues.map(result => ({
//         issue_ref: result.metadata?.issue_ref,
//         title: result.metadata?.title,
//         status: result.metadata?.status,
//         url: result.metadata?.url,
//         similarity_score: result.score,
//       })),
//     };
//   }
// }
