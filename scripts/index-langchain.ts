#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import {LangChainIndexer} from "@/lib/langchain-indexer";

// Load environment variables
dotenv.config();

async function main() {
  const indexer = new LangChainIndexer();

  try {
    console.log('🚀 Starting LangChain indexing (GitHub issues + FAQs)...');
    
    // Initialize the indexer
    await indexer.initialize();
    
    // Index all data sources (GitHub issues + FAQs)
    await indexer.indexAll();
    
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
