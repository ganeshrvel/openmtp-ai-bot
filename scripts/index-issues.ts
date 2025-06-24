// #!/usr/bin/env tsx
//
// import { readFileSync, readdirSync } from 'fs';
// import { join } from 'path';
// import { Mastra } from '@mastra/core';
// import { FastEmbedEmbedding } from '@mastra/fastembed';
//
// interface GitHubIssue {
//   issue_number: number;
//   title: string;
//   question: {
//     author: string;
//     body: string;
//     created_at: string;
//     updated_at: string;
//   };
//   replies: Array<{
//     author: string;
//     body: string;
//     created_at: string;
//     updated_at: string;
//   }>;
//   answers: Array<{
//     author: string;
//     body: string;
//     created_at: string;
//     updated_at: string;
//   }>;
//   status: string;
//   labels: string[];
//   created_at: string;
//   updated_at: string;
//   closed_at: string | null;
//   url: string;
// }
//
// interface ProcessedDocument {
//   id: string;
//   content: string;
//   metadata: {
//     issue_number: number;
//     title: string;
//     status: string;
//     labels: string[];
//     url: string;
//     created_at: string;
//     has_answers: boolean;
//     document_type: 'github_issue';
//   };
// }
//
// // Initialize Mastra with embeddings
// const embeddings = new FastEmbedEmbedding({
//   model: 'BAAI/bge-small-en-v1.5',
// });
//
// const mastra = new Mastra({
//   embeddings,
//   vectors: {
//     provider: 'LANCE',
//     dirPath: './vector-db',
//   },
// });
//
// async function loadIssues(): Promise<GitHubIssue[]> {
//   const issuesDir = './openmtp-gh-issues';
//   const files = readdirSync(issuesDir).filter(file => file.endsWith('.json'));
//
//   console.log(`Found ${files.length} issue files to process`);
//
//   return files.map(file => {
//     const filePath = join(issuesDir, file);
//     const content = readFileSync(filePath, 'utf-8');
//     return JSON.parse(content) as GitHubIssue;
//   });
// }
//
// function processIssueForEmbedding(issue: GitHubIssue): ProcessedDocument {
//   // Create a comprehensive text representation of the issue
//   let content = `Title: ${issue.title}\n\n`;
//   content += `Question:\n${issue.question.body}\n\n`;
//
//   // Add replies from other users
//   if (issue.replies.length > 0) {
//     content += 'User Replies:\n';
//     issue.replies.forEach((reply, index) => {
//       content += `${index + 1}. ${reply.author}: ${reply.body}\n\n`;
//     });
//   }
//
//   // Add answers from ganeshrvel
//   if (issue.answers.length > 0) {
//     content += 'Developer Answers:\n';
//     issue.answers.forEach((answer, index) => {
//       content += `${index + 1}. ${answer.author}: ${answer.body}\n\n`;
//     });
//   }
//
//   // Add labels context
//   if (issue.labels.length > 0) {
//     content += `Labels: ${issue.labels.join(', ')}\n`;
//   }
//
//   return {
//     id: `issue-${issue.issue_number}`,
//     content: content.trim(),
//     metadata: {
//       issue_number: issue.issue_number,
//       title: issue.title,
//       status: issue.status,
//       labels: issue.labels,
//       url: issue.url,
//       created_at: issue.created_at,
//       has_answers: issue.answers.length > 0,
//       document_type: 'github_issue',
//     },
//   };
// }
//
// async function indexIssues() {
//   try {
//     console.log('Loading GitHub issues...');
//     const issues = await loadIssues();
//
//     console.log('Processing issues for embedding...');
//     const documents = issues.map(processIssueForEmbedding);
//
//     console.log(`Indexing ${documents.length} documents...`);
//
//     // Create embeddings and store in vector database
//     for (const doc of documents) {
//       console.log(`Indexing issue #${doc.metadata.issue_number}: ${doc.metadata.title}`);
//
//       await mastra.vectorStore.upsert([{
//         id: doc.id,
//         values: await embeddings.embed(doc.content),
//         metadata: {
//           ...doc.metadata,
//           content: doc.content,
//         },
//       }]);
//     }
//
//     console.log('✅ Successfully indexed all issues!');
//     console.log(`📊 Total documents indexed: ${documents.length}`);
//
//     // Print some statistics
//     const withAnswers = documents.filter(d => d.metadata.has_answers).length;
//     const openIssues = documents.filter(d => d.metadata.status === 'open').length;
//     const closedIssues = documents.filter(d => d.metadata.status === 'closed').length;
//
//     console.log(`📈 Statistics:`);
//     console.log(`  - Issues with answers: ${withAnswers}`);
//     console.log(`  - Open issues: ${openIssues}`);
//     console.log(`  - Closed issues: ${closedIssues}`);
//
//   } catch (error) {
//     console.error('❌ Error indexing issues:', error);
//     process.exit(1);
//   }
// }
//
// // Run the indexing
// if (require.main === module) {
//   indexIssues();
// }
