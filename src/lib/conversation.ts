import {randomUUID} from 'crypto';
import {openmtpAgent} from '@/mastra/agents/openmtp-agent';

export class OpenMTPConversation {
  private threadId: string;
  private readonly resourceId: string;
  
  constructor(userId?: string) {
    this.threadId = randomUUID();
    this.resourceId = userId || `user_${randomUUID()}`;
  }
  
  async askQuestion(question: string) {
    console.log(`\n🔮 User [${this.resourceId}]: ${question}`);
    
    // Stream response with memory context
    const response = await openmtpAgent.stream(question, {
      threadId: this.threadId,
      resourceId: this.resourceId,
      memoryOptions: {
        lastMessages: 8,           // Override default if needed
        semanticRecall: {
          topK: 5,                 // Get more context for complex  issues
          messageRange: 2,
        }
      }
    });
    
    console.log(`🤖 OpenMTP Agent: `);
    
    // Stream the response
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
    }
    
    console.log('\n');
    return response;
  }
  
  async getConversationHistory() {
    const memory = openmtpAgent.getMemory();
    
    if (memory) {
      const thread = await memory.getThreadById({ threadId:
        this.threadId });
      return thread?.messages || [];
    }
    
    return [];
  }
  
  async startNewThread() {
    this.threadId = randomUUID();
    console.log(`🆕 Started new conversation thread:
  ${this.threadId}`);
    return this.threadId;
  }
  
  getIds() {
    return {
      threadId: this.threadId,
      resourceId: this.resourceId
    };
  }
}
