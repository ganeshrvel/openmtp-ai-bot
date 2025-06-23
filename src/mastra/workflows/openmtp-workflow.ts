// import { createWorkflow, createStep } from
//     '@mastra/core/workflows';
// import { z } from 'zod';
// import { pgVector } from '../agents/openmtp-agent';
// import { embed } from 'ai';
// import { openai } from '@ai-sdk/openai';
//
// const searchStep = createStep({
//   id: 'search-documents',
//   description: 'Search OpenMTP documents and log results',
//   inputSchema: z.object({
//     query: z.string(),
//     topK: z.number().optional().default(5),
//   }),
//   outputSchema: z.object({
//     query: z.string(),
//     documents: z.array(z.object({
//       id: z.string(),
//       score: z.number(),
//       issue_ref: z.string(),
//       title: z.string(),
//       text: z.string(),
//     })),
//     count: z.number(),
//   }),
//   execute: async ({ inputData }) => {
//     const { query, topK } = inputData;
//
//     console.log(`🔍 [SEARCH STEP] Query: "${query}", TopK:
//    ${topK}`);
//
//     // Generate embedding
//     const { embedding: queryVector } = await embed({
//       value: query,
//       model: openai.embedding('text-embedding-3-small'),
//     });
//
//     // Search vector store
//     const results = await pgVector.query({
//       indexName: 'openmtp_embeddings',
//       queryVector,
//       topK,
//     });
//
//     // Log retrieved documents
//     console.log(`📋 [RETRIEVED DOCUMENTS] Found
//   ${results.length} documents:`);
//     results.forEach((doc, index) => {
//       console.log(`   ${index + 1}.
//   ${doc.metadata?.issue_ref} (Score:
//   ${doc.score?.toFixed(4)})`);
//       console.log(`      Title: ${doc.metadata?.title}`);
//       console.log(`      Preview:
//   ${doc.metadata?.text?.substring(0, 100)}...`);
//     });
//
//     const documents = results.map((result, index) => ({
//       id: `doc-${index + 1}`,
//       score: result.score || 0,
//       issue_ref: result.metadata?.issue_ref || 'Unknown',
//       title: result.metadata?.title || 'No title',
//       text: result.metadata?.text || '',
//     }));
//
//     return {
//       query,
//       documents,
//       count: documents.length,
//     };
//   },
// });
//
// const generateStep = createStep({
//   id: 'generate-response',
//   description: 'Generate response using retrieved  documents',
//   inputSchema: z.object({
//     query: z.string(),
//     documents: z.array(z.object({
//       issue_ref: z.string(),
//       title: z.string(),
//       text: z.string(),
//       score: z.number(),
//     })),
//   }),
//   outputSchema: z.object({
//     answer: z.string(),
//     sources: z.array(z.string()),
//   }),
//   execute: async ({ inputData }) => {
//     const { query, documents } = inputData;
//
//     console.log(`🤖 [GENERATE STEP] Processing query with
//   ${documents.length} documents`);
//
//     // Format context
//     const context = documents
//       .map((doc, i) => `[${i + 1}] ${doc.issue_ref}:
//   ${doc.title}\n${doc.text}`)
//       .join('\n\n');
//
//     // Simple response generation (you can replace with agent call)
//     const answer = `Based on ${documents.length} OpenMTP
//   issues, here's the answer to "${query}":
//   \n\n${context.substring(0, 500)}...`;
//
//     const sources = documents.map(doc => doc.issue_ref);
//
//     console.log(`✅ [RESPONSE GENERATED] Answer length:
//   ${answer.length}, Sources: ${sources.join(', ')}`);
//
//     return { answer, sources };
//   },
// });
//
// export const openmtpWorkflow = createWorkflow({
//   id: 'openmtp-support',
//   description: 'OpenMTP support workflow with document retrieval logging',
//   inputSchema: z.object({
//     query: z.string(),
//     topK: z.number().optional().default(5),
//   }),
//   outputSchema: z.object({
//     answer: z.string(),
//     sources: z.array(z.string()),
//     retrieved_count: z.number(),
//   }),
// })
//   .then(searchStep)
//   .then(generateStep)
//   .map(({ stepResults }) => ({
//     answer: stepResults['generate-response'].answer,
//     sources: stepResults['generate-response'].sources,
//     retrieved_count:
//     stepResults['search-documents'].count,
//   }))
//   .commit();
