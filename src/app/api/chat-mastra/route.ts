import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/mastra';

// export async function POST(request: NextRequest) {
//   try {
//     const { question } = await request.json();
//
//     console.log(`🚀 [API] Processing question:
//   "${question}"`);
//
//     // Use workflow instead of direct agent
//     const workflow =
//       mastra.getWorkflow('openmtpWorkflow');
//     const run = workflow.createRun();
//
//     const result = await run.start({
//       inputData: { query: question, topK: 5 }
//     });
//
//     console.log(`📊 [API] Workflow completed. Retrieved: ${result.retrieved_count} docs`);
//
//     return NextResponse.json({
//       answer: result.answer,
//       logs: {
//         question: question,
//         retrieved_count: result.retrieved_count,
//         sources: result.sources,
//         timestamp: new Date().toISOString(),
//       }
//     });
//
//   } catch (error) {
//     console.error('❌ [API ERROR]', error);
//     return NextResponse.json({ error: 'Failed to process question' }, { status: 500 });
//     }
//   }


export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question?.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Get the OpenMTP agent
    const agent = mastra.getAgent('openmtpAgent');

    if (!agent) {
      return NextResponse.json(
        { error: 'OpenMTP agent not found' },
        { status: 500 }
      );
    }

    // Generate response with telemetry enabled
    const result = await agent.generate(question, {
      threadId: 'default-thread',
      resourceId: 'poc-user',
    });
    
    // Extract retrieved context from tool results
    let retrieved_context = [];
    if (result.toolResults?.length > 0) {
      const vectorResult = result.toolResults.find(
        toolResult => toolResult.toolName === 'vectorQueryTool'
      );
      


      if (vectorResult?.result) {
        try {
          const contextData = JSON.parse(vectorResult.result);
          retrieved_context = contextData.relevantContext || [];
        } catch (e) {
          console.warn('Could not parse tool result:', e);
        }
      }
    }

    // Return structured response with telemetry data
    return NextResponse.json({
      answer: result.text,
      logs: {
        question: question,
        retrieved_context: retrieved_context,
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('❌ Chat API error:', error);
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
    status: 'OpenMTP AI API with Auto-Tracing',
    endpoints: { POST: '/api/chat' }
  });
}
