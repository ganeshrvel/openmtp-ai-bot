// import { createInterface } from 'readline';
// import { OpenMTPConversation } from './conversation';
//
// export async function startChatInterface(userId?: string) {
//   const conversation = new OpenMTPConversation(userId);
//   const rl = createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });
//
//   console.log('🚀 OpenMTP AI Assistant Started');
//   console.log('💬 Ask me anything about OpenMTP issues!');
//   console.log('📝 Type "quit" to exit, "new" for new conversation, "history" to see chat history\n');
//
//   const { threadId, resourceId } = conversation.getIds();
//   console.log(`🆔 Thread: ${threadId.slice(0, 8)}... | User:
//   ${resourceId.slice(0, 8)}...\n`);
//
//   while (true) {
//     const userInput = await new Promise<string>((resolve) => {
//       rl.question('💬 You: ', resolve);
//     });
//
//     if (userInput.toLowerCase() === 'quit') {
//       console.log('👋 Goodbye!');
//       break;
//     }
//
//     if (userInput.toLowerCase() === 'new') {
//       await conversation.startNewThread();
//       continue;
//     }
//
//     if (userInput.toLowerCase() === 'history') {
//       const history = await conversation.getConversationHistory();
//       console.log('\n📚 Conversation History:');
//       history.forEach((msg, i) => {
//         console.log(`${i + 1}. [${msg.role}]: ${msg.content}`);
//       });
//       console.log('');
//       continue;
//     }
//
//     if (userInput.trim()) {
//       try {
//         await conversation.askQuestion(userInput);
//       } catch (error) {
//         console.error('❌ Error:', error);
//       }
//     }
//   }
//
//   rl.close();
// }
