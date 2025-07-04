import fs from 'fs';
import path from 'path';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';

export class LangChainIndexer {
  private embeddings: OpenAIEmbeddings;
  private vectorStore: PGVectorStore;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY!,
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 600,
      chunkOverlap: 50,
      separators: ['\n\n', '\n', ' ', ''],
    });
  }

  async initialize() {
    console.log('🔧 Initializing LangChain PgVector store...');
    
    // Use connection string directly to avoid authentication issues
    this.vectorStore = await PGVectorStore.initialize(this.embeddings, {
      postgresConnectionOptions: {
        connectionString: process.env.POSTGRES_CONNECTION_STRING!,
      },
      tableName: 'langchain_pg_embedding',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'embedding',
        contentColumnName: 'document',
        metadataColumnName: 'metadata',
      },
    });

    console.log('✅ LangChain PgVector store initialized');
  }

  async indexGitHubIssues() {
    console.log('🚀 Starting GitHub issues indexing with LangChain...');

    // Read from openmtp-gh-issues directory
    const issuesDir = path.join(process.cwd(),  'openmtp-gh-issues');
    const documents: Document[] = [];

    try {
      const files = fs.readdirSync(issuesDir).filter((file: string) => file.endsWith('.json'));
      console.log(`📁 Found ${files.length} issue files`);

      for (const file of files) {
        const filePath = path.join(issuesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const issue = JSON.parse(content);

        // Create searchable text from issue
        let text = `Issue #${issue.issue_number}: ${issue.title}\n\n`;
        text += `Question: ${issue.question.body}\n\n`;

        if (issue.answers && issue.answers.length > 0) {
          text += 'Developer Answers:\n';
          issue.answers.forEach((answer: any, index: number) => {
            text += `${index + 1}. ${answer.body}\n\n`;
          });
        }

        if (issue.replies && issue.replies.length > 0) {
          text += 'User Replies:\n';
          issue.replies.forEach((reply: any, index: number) => {
            text += `${index + 1}. ${reply.author}: ${reply.body}\n\n`;
          });
        }

        if (issue.labels && issue.labels.length > 0) {
          text += `Labels: ${issue.labels.join(', ')}\n`;
        }

        text += `Status: ${issue.status}\nURL: ${issue.url}`;

        // Create metadata
        const metadata = {
          issue_number: issue.issue_number,
          title: issue.title,
          status: issue.status,
          url: issue.url,
          labels: issue.labels || [],
          issue_ref: `Issue #${issue.issue_number}`,
          document_source: 'github-issues',
          source: 'github-issues',
          answers_count: issue.answers?.length || 0,
          replies_count: issue.replies?.length || 0,
        };

        // Create document
        documents.push(new Document({
          pageContent: text,
          metadata,
        }));
      }

      console.log(`📄 Created ${documents.length} documents from GitHub issues`);

      // Split documents into chunks and enhance metadata with chunk content
      const allChunks: Document[] = [];
      for (const doc of documents) {
        const chunks = await this.textSplitter.splitDocuments([doc]);
        
        
        // Enhance each chunk's metadata with the actual chunk content
        const enhancedChunks = chunks.map((chunk, index) => {
          return new Document({
            pageContent: chunk.pageContent,
            metadata: {
              ...chunk.metadata,
             
              chunk_index: index,
              chunk_size: chunk.pageContent.length,
              original_doc_length: doc.pageContent.length,
            }
          });
        });
        
        allChunks.push(...enhancedChunks);
      }
      
      console.log(`✂️ Split into ${allChunks.length} chunks`);

      // Add documents to vector store in batches
      const batchSize = 100;
      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        await this.vectorStore.addDocuments(batch);
        console.log(`✅ Indexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allChunks.length / batchSize)}`);
      }

      console.log(`🎉 Successfully indexed ${allChunks.length} chunks from ${documents.length} GitHub issues!`);

    } catch (error) {
      console.error('❌ Error reading GitHub issues:', error);
      console.error(`❌ GitHub issues directory not found at: ${issuesDir}`);
      console.error('❌ Please ensure the openmtp-gh-issues directory exists and contains JSON files');
      throw error;
    }
  }

  async indexFAQs() {
    console.log('🚀 Starting FAQ indexing with LangChain...');

    // Read from faqs directory
    const faqsDir = path.join(process.cwd(), 'faqs');
    const documents: Document[] = [];

    try {
      const files = fs.readdirSync(faqsDir).filter((file: string) => file.endsWith('.json'));
      console.log(`📁 Found ${files.length} FAQ files`);

      for (const file of files) {
        const filePath = path.join(faqsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const faqData = JSON.parse(content);

        if (faqData.faqs && Array.isArray(faqData.faqs)) {
          for (const faq of faqData.faqs) {
            // Create searchable text from FAQ
            let text = `FAQ: ${faq.question}\n\n`;
            text += `Answer: ${faq.answer}\n\n`;
            text += `Category: ${faq.category}`;

            // Create metadata
            const metadata = {
              faq_id: faq.id,
              question: faq.question,
              category: faq.category,
              document_source: 'faq',
              source: 'faq',
              faq_ref: `FAQ #${faq.id}`,
            };

            // Create document
            documents.push(new Document({
              pageContent: text,
              metadata,
            }));
          }
        }
      }

      console.log(`📄 Created ${documents.length} documents from FAQs`);

      // Split documents into chunks and enhance metadata with chunk content
      const allChunks: Document[] = [];
      for (const doc of documents) {
        const chunks = await this.textSplitter.splitDocuments([doc]);
        
        // Enhance each chunk's metadata with the actual chunk content
        const enhancedChunks = chunks.map((chunk, index) => {
          return new Document({
            pageContent: chunk.pageContent,
            metadata: {
              ...chunk.metadata,
              chunk_index: index,
              chunk_size: chunk.pageContent.length,
              original_doc_length: doc.pageContent.length,
            }
          });
        });
        
        allChunks.push(...enhancedChunks);
      }
      
      console.log(`✂️ Split into ${allChunks.length} chunks`);

      // Add documents to vector store in batches
      const batchSize = 100;
      for (let i = 0; i < allChunks.length; i += batchSize) {
        const batch = allChunks.slice(i, i + batchSize);
        await this.vectorStore.addDocuments(batch);
        console.log(`✅ Indexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allChunks.length / batchSize)}`);
      }

      console.log(`🎉 Successfully indexed ${allChunks.length} chunks from ${documents.length} FAQs!`);

    } catch (error) {
      console.error('❌ Error reading FAQs:', error);
      console.error(`❌ FAQs directory not found at: ${faqsDir}`);
      console.error('❌ Please ensure the faqs directory exists and contains JSON files');
      throw error;
    }
  }

  async indexAll() {
    console.log('🚀 Starting complete indexing process...');
    
    await this.clearIndex();
    await this.indexGitHubIssues();
    await this.indexFAQs();
    
    console.log('🎉 Complete indexing process finished!');
  }

  async testIndexing() {
    console.log('🧪 Testing indexed data...');

    const testQueries = [
      'Android device not detected',
      'How to enable Kalam mode',
      'Transfer speed is slow',
      'What is OpenMTP',
      'USB debugging',
      'Samsung device connection issues',
      'Google Drive interfering',
      'Allow access to device data',
      'Refresh button stuck',
      'Operation not permitted error',
    ];

    for (const query of testQueries) {
      console.log(`\n🔍 Testing query: "${query}"`);
      const results = await this.vectorStore.similaritySearchWithScore(query, 3);
      
      console.log(`   Found ${results.length} similar documents:`);
      results.forEach(([doc, score], index) => {
        const source = doc.metadata?.document_source;
        const ref = doc.metadata?.issue_ref || doc.metadata?.faq_ref;
        
        console.log(`   ${index + 1}. ${ref} [${source?.toUpperCase()}] (Score: ${score.toFixed(4)})`);
        console.log(`      Source: ${source}`);
        
        if (source === 'github-issues') {
          console.log(`      Title: ${doc.metadata?.title}`);
          console.log(`      URL: ${doc.metadata?.url}`);
          console.log(`      Status: ${doc.metadata?.status}`);
          console.log(`      Labels: ${doc.metadata?.labels?.join(', ')}`);
        } else if (source === 'faq') {
          console.log(`      Question: ${doc.metadata?.question}`);
          console.log(`      Category: ${doc.metadata?.category}`);
        }
        
        console.log(`      Chunk Index: ${doc.metadata?.chunk_index}`);
        console.log(`      Chunk Size: ${doc.metadata?.chunk_size} chars`);
        console.log(`      Full Chunk Content:`);
        console.log(`      ${doc.pageContent}`);
        console.log('─'.repeat(120));
      });
    }

    console.log('\n✅ Indexing test completed');
  }

  async clearIndex() {
    console.log('🗑️ Clearing existing index...');
    try {
      // Delete all existing data from the table
      const client = await this.vectorStore.pool.connect();
      const result = await client.query('DELETE FROM langchain_pg_embedding');
      client.release();
      console.log(`✅ Index cleared successfully - deleted ${result.rowCount} rows`);
    } catch (error) {
      console.log('❌ Error clearing index:', error);
      throw error;
    }
  }
}
