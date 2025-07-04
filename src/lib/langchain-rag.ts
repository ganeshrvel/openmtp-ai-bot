import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Document } from '@langchain/core/documents';
import { Langfuse } from 'langfuse';
import * as dotenv from "dotenv";

dotenv.config();


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
    // const ragPrompt = PromptTemplate.fromTemplate(`
    //   You are an OpenMTP specialist assistant with enhanced context tracing.
    //
    //   DOCUMENT SOURCES:
    //   The context contains information from two sources:
    //   1. GitHub Issues: Real user problems and official developer responses
    //   2. FAQ: Curated frequently asked questions with verified solutions
    //
    //   CONTEXT UNDERSTANDING FOR GITHUB ISSUES:
    //   - Issues contain questions (from users) and answers[] (from app owner/developers)
    //   - Prioritize answers[] from the app owner as authoritative solutions
    //   - Only consider replies inside answers[] array. Disregard surrounding user discussions unless clearly marked as developer replies
    //   - Developer answers usually include confirmations, detailed steps, or GitHub links. Prefer these
    //   - Questions are usually in the title, sometimes with additional body text
    //   - Always distinguish between user questions vs official developer answers
    //
    //   CONTEXT UNDERSTANDING FOR FAQ:
    //   - FAQ entries are curated, verified solutions to common problems
    //   - FAQ answers are authoritative and should be trusted as official guidance
    //   - FAQ entries are categorized and provide step-by-step solutions
    //
    //   RESPONSE GUIDELINES:
    //   - Prioritize FAQ entries for common issues, then GitHub issue answers from app owner
    //   - Emphasize factual and actionable solutions from both sources
    //   - Do not assume features, settings, or modes unless explicitly confirmed in developer replies or FAQ
    //   - Never invent or hallucinate GitHub issue numbers, modes, or UI components
    //   - If official developer answers mention a feature but not its full usage, clearly state the limitation without guessing
    //   - Use only GitHub issue numbers/URLs found in the context; never fabricate them
    //   - When referencing FAQ entries, mention they are from the official FAQ
    //   - Avoid repetition or vague responses. Be concise and specific
    //   - Combine insights from both GitHub issues and FAQ when relevant
    //
    //   Context from OpenMTP repository (GitHub Issues + FAQ):
    //   {context}
    //
    //   Provide a helpful response based on the context above. If you reference any issues, include their numbers and URLs.
    //   `);
    
    //    const ragPrompt = PromptTemplate.fromTemplate(`
    //       You are an OpenMTP specialist assistant with enhanced context tracing.
    //
    //       DOCUMENT SOURCES:
    //       The context contains information from two sources:
    //       1. FAQ: Curated frequently asked questions with verified solutions
    //       2. GitHub Issues: Real user problems and official developer responses
    //
    //
    //       CONTEXT UNDERSTANDING FOR FAQ:
    //       - FAQ entries are curated, verified solutions to common problems
    //       - FAQ answers are authoritative and should be trusted as official guidance
    //       - FAQ entries are categorized and provide step-by-step solutions
    //
    //       CONTEXT UNDERSTANDING FOR GITHUB ISSUES:
    //       - Issues contain questions (from users) and answers[] (from app owner/developers)
    //       - Prioritize answers[] from the app owner as authoritative solutions
    //       - Sometimes apart from the owner other user replies will contain confirmation, detailed steps or even answer.
    //       - Developer answers usually include confirmations, detailed steps, or GitHub links.
    //       - users ask Questions about openmtp in the github issues and these questions are usually asked in the title, sometimes with additional body text
    //       - Check for any confirmation or affirmative answer from both replies as well as the answers[]
    //       - In case there question does not have any answers[] or replies[] then skip that question since they are clearly not useful to us
    //
    //
    //       RESPONSE GUIDELINES:
    //       - Prioritize FAQ entries for common issues over github issues. But include detailed to the point answer from Github confirmation replies or answers[] as relavant.
    //       - Do not assume features, settings, or modes unless explicitly confirmed in the FAQ
    //       - Never invent or hallucinate GitHub issue numbers, modes, or UI components
    //       - When referencing FAQ entries, dont mention they are from the official FAQ
    //       - Avoid repetition or vague responses. Be concise and specific
    //
    //       Provide a helpful response based on the context above.
    //
    //      The output needs to be a proper answer, it doesnt need anything else. . dont be lazy.  if the answers are inside the faq check if the same answer is also inside the github repo then see if you can correlate and build a proper answer, else pick up the answer from whatever is the correct affirmative response.
    //
    //      correlate things from various faqs and github issues and make sure you output a well documents, properly stuctures, step by step answer in detail only if applicable.
    //
    //      no need to mention any urls or suggestions. Dont be suggestive for example, dont ask the user to check the faq or logs or community or raise a github issue.
    //       `);
    
    const ragPrompt = PromptTemplate.fromTemplate(`
      You are an OpenMTP specialist assistant with enhanced context tracing.
      
      DOCUMENT SOURCES:
      The context contains information from two sources:
      1. FAQ: Curated frequently asked questions with verified solutions
      2. GitHub Issues: Real user problems and official developer responses
      
      
      CONTEXT UNDERSTANDING FOR FAQ:
      - FAQ entries are curated, verified solutions to common problems
      - FAQ answers are authoritative and should be trusted as official guidance
      - FAQ entries are categorized and provide step-by-step solutions
      
      CONTEXT UNDERSTANDING FOR GITHUB ISSUES:
      - Issues contain questions (from users) and answers[] (from app owner/developers)
      - Prioritize answers[] from the app owner as authoritative solutions
      - Sometimes apart from the owner other user replies will contain confirmation, detailed steps or even answer.
      - Developer answers usually include confirmations, detailed steps, or GitHub links.
      - users ask Questions about openmtp in the github issues and these questions are usually asked in the title, sometimes with additional body text
      - Check for any confirmation or affirmative answer from both replies as well as the answers[]
      - In case there question does not have any answers[] or replies[] then skip that question since they are clearly not useful to us
 

      RESPONSE GUIDELINES:
      - Prioritize FAQ entries for common issues over github issues. Answer step by step for relavant trouble shooting answers.
        dont be lazy.  if the answers are inside the faq check if the same answer is also inside the github repo then see if you can correlate and build a proper answer, else pick up the answer from whatever is the correct affirmative response.
     no need to mention any urls or suggestions. Dont be suggestive for example, dont ask the user to check the faq or logs or community or raise a github issue.
     Understand that not all queries are issues or trouble. Differentiate between the normal questions vs troubles. If they have a question give them straight away answer.
     
     When fetching the closest vector document from the vectordb, even though the terms might match, it doesnt mean that they are part of the solution. eg: mtp mode or operating system name or app version name etc are part of the logs and users add them to the github issue while creating a new issue, so just because you match the text doesnt mean the answer is present in that dataset. Make sure to read through the query properly and find an answer. If no document is found relevant for a proper answer then tell the user: "Sorry no answer found"
     
       Context from OpenMTP repository (GitHub Issues + FAQ):
       {context}
       
       Provide a helpful response based on the context above.
      `);

    //The answer should be a detailed explaination of the steps and how to fix the issue

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
      const source = metadata?.document_source;
      
      let formattedDoc = `${index + 1}. [${source?.toUpperCase()}] ${metadata?.issue_ref || metadata?.faq_ref}\n`;
      
      if (source === 'github-issues') {
        formattedDoc += `   Title: ${metadata?.title}\n`;
        formattedDoc += `   Status: ${metadata?.status}\n`;
        formattedDoc += `   URL: ${metadata?.url}\n`;
        formattedDoc += `   Labels: ${metadata?.labels?.join(', ')}\n`;
        formattedDoc += `   Answers Count: ${metadata?.answers_count}\n`;
        formattedDoc += `   Replies Count: ${metadata?.replies_count}\n`;
      } else if (source === 'faq') {
        formattedDoc += `   Question: ${metadata?.question}\n`;
        formattedDoc += `   Category: ${metadata?.category}\n`;
      }
      
      formattedDoc += `   Source: ${source}\n`;
      formattedDoc += `   Chunk Index: ${metadata?.chunk_index}\n`;
      formattedDoc += `   Chunk Size: ${metadata?.chunk_size} chars\n`;
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
        // Common fields
        document_source: doc.metadata?.document_source,
        source: doc.metadata?.source,
        chunk_index: doc.metadata?.chunk_index,
        chunk_size: doc.metadata?.chunk_size,
        original_doc_length: doc.metadata?.original_doc_length,
        
        // GitHub issue fields
        issue_number: doc.metadata?.issue_number,
        title: doc.metadata?.title,
        status: doc.metadata?.status,
        url: doc.metadata?.url,
        labels: doc.metadata?.labels,
        issue_ref: doc.metadata?.issue_ref,
        answers_count: doc.metadata?.answers_count,
        replies_count: doc.metadata?.replies_count,
        
        // FAQ fields
        faq_id: doc.metadata?.faq_id,
        question: doc.metadata?.question,
        category: doc.metadata?.category,
        faq_ref: doc.metadata?.faq_ref,
      },
      score,
    }));
  }

  async generateResponse(question: string, userId?: string, sessionId?: string, parentTrace?: any) {
    // Use passed trace or create new one
    const trace = parentTrace || langfuse.trace({
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
            ref: doc.metadata?.issue_ref || doc.metadata?.faq_ref,
            source: doc.metadata?.document_source,
            score: doc.score,
            document: doc.document,
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
            ref: doc.metadata?.issue_ref || doc.metadata?.faq_ref,
            source: doc.metadata?.document_source,
            url: doc.metadata?.url,
            score: doc.score,
          })),
          retrieved_chunks: similarDocs.map(doc => ({
            content: doc.document,
            metadata: doc.metadata,
            score: doc.score,
          })),
        },
      });

      await langfuse.flushAsync();

      return {
        answer: response,
        traceId: trace.id,
        traceUrl: trace.getTraceUrl?.(),
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
