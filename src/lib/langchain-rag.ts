import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { Langfuse } from 'langfuse';

// Initialize Langfuse for tracing
const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_BASEURL!,
});

export class OpenMTPLangChainRAG {
  private vectorStore: PGVectorStore;
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private ragChain: RunnableSequence;

  constructor() {
    // Initialize embeddings
    this.embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY!,
    });

    // Initialize LLM
    this.llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0,
      openAIApiKey: process.env.OPENAI_API_KEY!,
    });
  }

  async initialize() {
    // Create PGVectorStore connection using connection string
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

    // Create RAG prompt template
    const ragPrompt = PromptTemplate.fromTemplate(`
      You are an OpenMTP specialist assistant with enhanced context tracing.
      
      IMPORTANT CONTEXT UNDERSTANDING:
      - Issues contain questions (from users) and answers[] (from app owner/developers)
      - Prioritize answers[] from the app owner as authoritative solutions
      - Some replies may also contain valuable answers
      - Questions are usually in the title, sometimes with additional body text
      - Always distinguish between user questions vs official developer answers
      
      RESPONSE GUIDELINES:
      - Prioritize official answers from the app owner in your responses
      - Reference specific GitHub issue numbers and URLs when available
      - Distinguish between official solutions vs user discussions
      - If official answers exist, present them as the primary solution
      - If no official answers exist, provide helpful suggestions based on similar issues and common troubleshooting steps
      - Include user questions for context but emphasize practical solutions
      - Never state "no official responses" - instead offer actionable recommendations
      
      Context from OpenMTP repository:
      {context}
      
      User question: {question}
      
      Provide a helpful response based on the context above. If you reference any issues, include their numbers and URLs.`);

    // Create retrieval chain
    const retriever = this.vectorStore.asRetriever({
      k: 5,
      searchType: 'similarity',
    });

    // Create the RAG chain
    this.ragChain = RunnableSequence.from([
      {
        context: retriever.pipe(this.formatDocuments),
        question: new RunnablePassthrough(),
      },
      ragPrompt,
      this.llm,
      new StringOutputParser(),
    ]);

    console.log('✅ LangChain RAG initialized successfully');
  }

  private formatDocuments = (docs: Document[]) => {
    return docs.map((doc, index) => {
      const metadata = doc.metadata;
      let formattedDoc = `${index + 1}. ${metadata?.issue_ref || 'Issue'}\n`;
      formattedDoc += `   Title: ${metadata?.title}\n`;
      formattedDoc += `   Status: ${metadata?.status}\n`;
      formattedDoc += `   URL: ${metadata?.url}\n`;
      formattedDoc += `   Labels: ${metadata?.labels?.join(', ') || 'None'}\n`;
      formattedDoc += `   Answers Count: ${metadata?.answers_count || 0}\n`;
      formattedDoc += `   Replies Count: ${metadata?.replies_count || 0}\n`;
      formattedDoc += `   Chunk Index: ${metadata?.chunk_index || 0}\n`;
      formattedDoc += `   Chunk Size: ${metadata?.chunk_size || 0} chars\n`;
      formattedDoc += `   Full Content: ${doc.pageContent}\n\n`;
      return formattedDoc;
    }).join('');
  };

  async searchSimilarDocuments(query: string, topK: number = 5) {
    const results = await this.vectorStore.similaritySearchWithScore(query, topK);
    
    console.log(`🔍 [LANGCHAIN RETRIEVAL] Found ${results.length} documents for: "${query}"`);
    return results.map(([doc, score]) => ({
      document: doc.pageContent,
      metadata: {
        issue_number: doc.metadata?.issue_number,
        title: doc.metadata?.title,
        status: doc.metadata?.status,
        url: doc.metadata?.url,
        labels: doc.metadata?.labels,
        issue_ref: doc.metadata?.issue_ref,
        source: doc.metadata?.source,
        answers_count: doc.metadata?.answers_count,
        replies_count: doc.metadata?.replies_count,
        chunk_index: doc.metadata?.chunk_index,
        chunk_size: doc.metadata?.chunk_size,
        original_doc_length: doc.metadata?.original_doc_length,
      },
      score,
    }));
  }

  async generateResponse(question: string, userId?: string, sessionId?: string) {
    // Create a Langfuse trace
    const trace = langfuse.trace({
      name: 'openmtp-langchain-rag',
      userId,
      sessionId,
      input: { question },
      tags: ['rag', 'openmtp', 'langchain'],
    });

    try {
      // Create a span for retrieval
      const retrievalSpan = trace.span({
        name: 'vector-retrieval',
        input: { query: question },
      });

      // Search for similar documents
      const similarDocs = await this.searchSimilarDocuments(question);

      retrievalSpan.update({
        output: {
          retrieved_count: similarDocs.length,
          documents: similarDocs.map(doc => ({
            issue_ref: doc.metadata?.issue_ref,
            score: doc.score,
            preview: doc.document?.substring(0, 100),
          })),
        },
      });
      retrievalSpan.end();

      // Create a span for LLM generation
      const generationSpan = trace.span({
        name: 'llm-generation',
        input: { question, context_docs: similarDocs.length },
      });

      // Generate response using RAG chain
      const response = await this.ragChain.invoke(question);

      generationSpan.update({
        output: { response },
      });
      generationSpan.end();

      // Update trace with final output
      trace.update({
        output: {
          answer: response,
          retrieved_count: similarDocs.length,
          sources: similarDocs.map(doc => ({
            issue_ref: doc.metadata?.issue_ref,
            url: doc.metadata?.url,
            score: doc.score,
          })),
        },
      });

      await langfuse.flushAsync();

      return {
        answer: response,
        logs: {
          question,
          retrieved_count: similarDocs.length,
          retrieved_chunks: similarDocs.map(doc => ({
            content: doc.document,
            metadata: doc.metadata,
            score: doc.score,
          })),
        },
      };
    } catch (error) {
      trace.update({
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      await langfuse.flushAsync();
      throw error;
    }
  }

  async addDocuments(documents: Document[]) {
    await this.vectorStore.addDocuments(documents);
    console.log(`✅ Added ${documents.length} documents to LangChain vector store`);
  }
}
