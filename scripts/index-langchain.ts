#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import {LangChainGitHubIndexer} from "@/lib/langchain-indexer";

// Load environment variables
dotenv.config();

async function main() {
  const indexer = new LangChainGitHubIndexer();

  try {
    console.log('🚀 Starting LangChain GitHub issues indexing...');
    
    // Initialize the indexer
    await indexer.initialize();
    
    // Clear existing index
    await indexer.clearIndex();
    
    // Index GitHub issues
    await indexer.indexGitHubIssues();
    
    // Test the indexing
    await indexer.testIndexing();
    
    console.log('🎉 LangChain indexing process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ LangChain indexing failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
