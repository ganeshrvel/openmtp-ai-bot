import { NextRequest, NextResponse } from 'next/server';
import { OpenMTPLangChainRAG } from '@/lib/langchain-rag';

// Initialize the LangChain RAG system
let ragSystem: OpenMTPLangChainRAG | null = null;

async function getRagSystem() {
  if (!ragSystem) {
    ragSystem = new OpenMTPLangChainRAG();
    await ragSystem.initialize();
  }
  return ragSystem;
}

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    console.log(`🚀 [LANGCHAIN API] Processing question: "${question}"`);

    // Get the RAG system
    const rag = await getRagSystem();

    // Generate response with Langfuse tracing
    const result = await rag.generateResponse(
      question,
      'poc-user', // userId
      'default-session' // sessionId
    );

    console.log(`📊 [LANGCHAIN API] Response generated. Retrieved: ${result.logs.retrieved_count} docs`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ LangChain Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process question',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'OpenMTP AI API with LangChain + Langfuse Tracing',
    endpoints: { POST: '/api/chat-langchain' },
    features: [
      'LangChain RAG pipeline',
      'PgVector similarity search',
      'Langfuse tracing',
      'OpenAI GPT-4o-mini',
      'GitHub issues knowledge base'
    ]
  });
}