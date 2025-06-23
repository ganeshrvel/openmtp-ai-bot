import { PgVector } from "@mastra/pg";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { MDocument } from "@mastra/rag";

export class OpenMTPVectorStore {
  private indexName = "openmtp_embeddings";
  
  constructor(private readonly pgVector: PgVector) {
    this.pgVector = pgVector!;
  }
  
  async initialize() {
    console.log("🚀 Initializing OpenMTP PgVector Store...");
  
    // Create index
    await this.pgVector.createIndex({
      indexName: this.indexName,
      dimension: 1536,
    });
    
    console.log("✅ PgVector store initialized");
  }
  
  async indexIssues(issuesData: Array<{
    issue_number: number;
    title: string;
    status: string;
    labels: string[];
    has_answers: boolean;
    answer_count: number;
    url: string;
    text: string;
  }>) {
    if (!this.pgVector) {
      throw new Error("PgVector not initialized. Call initialize() first.");
    }
    
    console.log(`📊 Processing ${issuesData.length} issues...`);
    
    // Process documents and create chunks with rich metadata
    const allChunks: Array<{
      text: string;
      metadata: {
        issue_ref: string;
        title: string;
        status: string;
        labels: string[];
        has_answers: boolean;
        answer_count: number;
        url: string;
        chunk_index: number;
      };
    }> = [];
    
    for (const issue of issuesData) {
      const doc = MDocument.fromText(issue.text);
      const chunks = await doc.chunk({
        strategy: "recursive",
        size: 600,
        overlap: 50
      });
      
      chunks.forEach((chunk, index) => {
        allChunks.push({
          text: chunk.text,
          metadata: {
            issue_ref:
              `#${issue.issue_number}-${issue.title.substring(0, 50)}`,
            title: issue.title,
            status: issue.status,
            labels: issue.labels,
            has_answers: issue.has_answers,
            answer_count: issue.answer_count,
            url: issue.url,
            chunk_index: index,
          }
        });
      });
    }
    
    console.log(`📊 Generated ${allChunks.length} chunks`);
    
    // Generate embeddings
    const { embeddings } = await embedMany({
      values: allChunks.map(c => c.text),
      model: openai.embedding("text-embedding-3-small"),
    });
    
    // Store in PgVector with rich metadata
    await this.pgVector.upsert({
      indexName: this.indexName,
      vectors: embeddings,
      metadata: allChunks.map(chunk => ({ ...chunk.metadata, text: chunk.text })),
    });
    
    console.log(`✅ Successfully indexed ${allChunks.length} chunks into PostgreSQL!`);
  }
  
  getPgVector() {
    if (!this.pgVector) {
      throw new Error("PgVector not initialized. Call initialize() first.");
    }
    return this.pgVector;
  }
  
  getIndexName() {
    return this.indexName;
  }
}
