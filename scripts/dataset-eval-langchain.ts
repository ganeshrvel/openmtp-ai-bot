#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { OpenMTPLangChainRAG } from "@/lib/langchain-rag";
import { Langfuse } from "langfuse";

dotenv.config();

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_BASEURL!,
});

const EVAL_QUESTIONS: string[] = [
  "The app goes blank while trying to connect a Samsung device",
  "How to enable the List mode in the app",
  "How many MTP kernels are being used in the OpenMTP app",
  "How to toggle between these two MTP kernel modes?",
  "How to select multiple files in OpenMTP?",
  "Can we use mouse to drag to multi select files in OpenMTP?",
  "How to use OpenMTP on older MacOs",
  "Do you support Samsung phones?",
  "OpenMTP is showing blank screen when opening",
  "My phone isnt connecting",
  "Why does OpenMTP have trouble with Pixel devices?",
  "Does the Garmin Edge 1050 work with OpenMTP?"
];

const CORRECT_ANSWERS: string[] = [
  "1. Uninstall Samsung SmartSwitch, if installed. 2. Restart OpenMTP. 3. Follow the basic connection steps: unlock your device, unplug and reconnect, select File Transfer mode, and it should connect automatically.",
  "You may find the List mode option in settings -> 'File Manager' tab -> Toggle off 'View as Grid' option.",
  "Two. 1) Kalam Mode, the newer version with wider device compatibility, 2) the older Legacy Mode, a CLI-based kernel with lower speed and less device compatibility.",
  "Click on the 'MTP Mode' option on the right hand side pane and then select the MTP Kernel of your choice",
  "In the Grid/List view using the Command Key and Press the Navigation arrow for the selection. You may also press the select key and use navigation keys to select the files. In the list view there is also an option for the checkbox which users can use for selection",
  "No, this feature is currently not available",
  "Download v3.1.15 of the app from Github releases page of OpenMTP, Dont open the app yet, Turn off internet(important), Open the app, Goto settings, Update tab, turn off auto update, Turn internet on",
  "Yes, we do have support for the Samsung phones.",
  "Quit apps that hog MTP connection such as Photos, Preview, or iMovies. This usually resolves connection issues. You can follow the steps mentioned in this thread to see if doing them fixes your connectivity issue? https://github.com/ganeshrvel/openmtp/issues/276",
  "Quit apps that hog MTP connection such as Photos, Preview, or iMovies. This usually resolves connection issues. You can follow the steps mentioned in this thread to see if doing them fixes your connectivity issue? https://github.com/ganeshrvel/openmtp/issues/276",
  "Pixel's internal MTP server is unstable, slow, and throws inconsistent errors.",
  "Compatibility depends on firmware version. Garmin employee suggested firmware updates will resolve MTP connection issues."
];

interface EvalResult {
  sl: number;
  query: string;
  response: string;
  correct_answer: string;
  trace_url: string;
}

async function openmtpbot(question: string, rag: OpenMTPLangChainRAG, trace: any): Promise<string> {
  const response = await rag.generateResponse(
    question,
    'eval-user',
    `eval-session`,
    trace
  );
  return response.answer;
}

function getTraceUrl(trace: any): string {
  return trace.getTraceUrl();
}

async function runEvaluation() {
  const rag = new OpenMTPLangChainRAG();
  await rag.initialize();
  
  const results: EvalResult[] = [];
  
  for (let i = 0; i < EVAL_QUESTIONS.length; i++) {
    const question = EVAL_QUESTIONS[i];
    const correctAnswer = CORRECT_ANSWERS[i];
    
    const trace = langfuse.trace({
      name: `Dataset Eval Q${i + 1}: ${question}`,
      userId: "eval-user",
      sessionId: `dataset-eval-q${i + 1}`,
      tags: ["dataset-evaluation", "openmtp"],
      input: { question },
      metadata: {
        question_id: i + 1,
        evaluation_type: "dataset_evaluation"
      }
    });
    
    try {
      const response = await openmtpbot(question, rag, trace);
      const traceUrl = getTraceUrl(trace);
      
      results.push({
        sl: i + 1,
        query: question,
        response: response,
        correct_answer: correctAnswer,
        trace_url: traceUrl
      });
      
    } catch (error) {
      results.push({
        sl: i + 1,
        query: question,
        response: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        correct_answer: correctAnswer,
        trace_url: "ERROR"
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Convert results to CSV
  const csvRows: string[] = [];
  csvRows.push('sl,query,response,correct_answer,trace_url');
  
  results.forEach(result => {
    const escapedQuery = `"${result.query.replace(/"/g, '""')}"`;
    const escapedResponse = `"${result.response.replace(/"/g, '""')}"`;
    const escapedCorrectAnswer = `"${result.correct_answer.replace(/"/g, '""')}"`;
    const escapedTraceUrl = `"${result.trace_url}"`;
    
    csvRows.push(`${result.sl},${escapedQuery},${escapedResponse},${escapedCorrectAnswer},${escapedTraceUrl}`);
  });
  
  const outputDir = './eval-results';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvFile = path.join(outputDir, `test_results_${timestamp}.csv`);
  
  fs.writeFileSync(csvFile, csvRows.join('\n'));
  
  console.log(`Results saved to: ${csvFile}`);
}

runEvaluation().catch(error => {
  console.error('Evaluation failed:', error);
  process.exit(1);
});




// const langfuse = new Langfuse({
//   publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
//   secretKey: process.env.LANGFUSE_SECRET_KEY!,
//   baseUrl: process.env.LANGFUSE_BASEURL!,
// });
//
// const EVAL_QUESTIONS: string[] = [
//   "How to enable the List mode in the app",
//   "How many MTP kernels are being used in the OpenMTP app",
//   "How to toggle between these two MTP kernel modes?",
//   "How to select multiple files in OpenMTP?",
//   "Can we use mouse to drag to multi select files in OpenMTP?",
//   "How to use OpenMTP on older MacOs",
//   "Do you support Samsung phones?",
//   "OpenMTP is showing blank screen when opening",
//   "My phone isnt connecting",
//   "How to support OpenMTP"
// ];
//
//
// async function evaluateQuestion(question: string, questionId: number, rag: OpenMTPLangChainRAG, trace: any) {
//   const response = await rag.generateResponse(
//     question,
//     'eval-user',
//     `dataset-eval-q${questionId}`,
//     trace
//   );
//
//   return {
//     answer: response.answer,
//     traceId: response.traceId,
//     traceUrl: response.traceUrl
//   };
// }
//
// async function runEvaluation() {
//   console.log('🚀 Starting OpenMTP LangChain Dataset Evaluation...');
//   console.log(`📝 Evaluating ${EVAL_QUESTIONS.length} questions with Langfuse tracing\n`);
//
//   // Initialize RAG system
//   const rag = new OpenMTPLangChainRAG();
//   await rag.initialize();
//
//   const csvRows: string[] = [];
//   csvRows.push('id,query,response,trace_url'); // CSV header with trace URL
//
//   for (let i = 0; i < EVAL_QUESTIONS.length; i++) {
//     const question = EVAL_QUESTIONS[i];
//     console.log(`\n📋 Question ${i + 1}/${EVAL_QUESTIONS.length}`);
//     console.log(`   Question: "${question}"`);
//
//     // Create trace for this question
//     const trace = langfuse.trace({
//       name: `Dataset Eval Q${i + 1}: ${question}`,
//       userId: "eval-user",
//       sessionId: `dataset-eval-q${i + 1}`,
//       tags: ["dataset-evaluation", "openmtp"],
//       input: { question },
//       metadata: {
//         question_id: i + 1,
//         evaluation_type: "dataset_evaluation"
//       }
//     });
//
//     try {
//       const result = await evaluateQuestion(question, i + 1, rag, trace);
//
//       console.log(`   💬 Answer preview: ${result.answer}`);
//       console.log(`   🔗 Trace: ${result.traceUrl}`);
//
//       // Escape quotes in CSV data
//       const escapedQuestion = `"${question.replace(/"/g, '""')}"`;
//       const escapedAnswer = `"${result.answer.replace(/"/g, '""')}"`;
//
//       // Add to CSV with trace URL
//       csvRows.push(`${i + 1},${escapedQuestion},${escapedAnswer},"${result.traceUrl}"`);
//
//     } catch (error) {
//       console.error(`   ❌ Error processing question: ${error}`);
//
//       const errorAnswer = `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
//       const escapedQuestion = `"${question.replace(/"/g, '""')}"`;
//       const escapedError = `"${errorAnswer.replace(/"/g, '""')}"`;
//
//       csvRows.push(`${i + 1},${escapedQuestion},${escapedError},"ERROR"`);
//     }
//
//     // Small delay between questions
//     await new Promise(resolve => setTimeout(resolve, 1000));
//   }
//
//   // Save CSV file
//   const outputDir = './eval-results';
//   if (!fs.existsSync(outputDir)) {
//     fs.mkdirSync(outputDir, { recursive: true });
//   }
//
//   const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
//   const csvFile = path.join(outputDir, `langchain-eval-traced-${timestamp}.csv`);
//
//   fs.writeFileSync(csvFile, csvRows.join('\n'));
//
//   console.log('\n' + '='.repeat(60));
//   console.log('🎉 EVALUATION COMPLETED');
//   console.log('='.repeat(60));
//   console.log(`📁 CSV results saved to: ${csvFile}`);
//   console.log(`📊 Total questions: ${EVAL_QUESTIONS.length}`);
//   console.log(`🔗 Each question has its own trace in Langfuse`);
//   console.log('\n✨ Evaluation complete!');
// }
//
// // Run evaluation
// runEvaluation().catch(error => {
//   console.error('❌ Evaluation failed:', error);
//   process.exit(1);
// });
