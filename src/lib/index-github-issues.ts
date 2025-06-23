import { OpenMTPVectorStore } from './vector-store.js';
import fs from 'fs';
import path from 'path';

export class GitHubIssuesIndexer {
  private vectorStore: OpenMTPVectorStore;
  private issuesDir: string;
  
  constructor(vectorStore: OpenMTPVectorStore, issuesDir: string = '../../openmtp-gh-issues') {
    this.vectorStore = vectorStore;
    this.issuesDir = issuesDir;
  }
  
  async initialize() {}
  
  private processIssueFile(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const issue = JSON.parse(content);
    
    // Create searchable text
    let text = `Issue #${issue.issue_number}: ${issue.title}\n\n`;
    text += `Question: ${issue.question.body}\n\n`;
    
    if (issue.answers && issue.answers.length > 0) {
      text += 'Developer Answers:\n';
      issue.answers.forEach((answer: any, index: number) => {
        text += `${index + 1}. ${answer.body}\n\n`;
      });
    }
    
    if (issue.replies && issue.replies.length > 0) {
      text += 'User Replies:\n';
      issue.replies.forEach((reply: any, index: number) => {
        text += `${index + 1}. ${reply.author}: ${reply.body}\n\n`;
      });
    }
    
    if (issue.labels && issue.labels.length > 0) {
      text += `Labels: ${issue.labels.join(', ')}\n`;
    }
    
    text += `Status: ${issue.status}\nURL: ${issue.url}`;
    
    return {
      issue_number: issue.issue_number,
      title: issue.title,
      status: issue.status,
      labels: issue.labels || [],
      has_answers: (issue.answers && issue.answers.length > 0),
      answer_count: issue.answers ? issue.answers.length : 0,
      url: issue.url,
      text: text
    };
  }

  async indexIssues() {
    console.log("🚀 Indexing OpenMTP GitHub issues...");
    
    const issuesData: Array<{
      issue_number: number;
      title: string;
      status: string;
      labels: string[];
      has_answers: boolean;
      answer_count: number;
      url: string;
      text: string;
    }> = [];
    
    try {
      const files = fs.readdirSync(this.issuesDir).filter((file:
                                                           string) => file.endsWith('.json'));
      console.log(`Found ${files.length} issue files`);
      
      // Process all issues
      files.forEach((file: string) => {
        const filePath = path.join(this.issuesDir, file);
        const processedIssue = this.processIssueFile(filePath);
        issuesData.push(processedIssue);
      });
    } catch (error) {
      console.error('Error reading issues:', error);
      return;
    }
    
    // Index the issues with rich metadata
    await this.vectorStore.indexIssues(issuesData);
    
    console.log("🎉 GitHub issues indexing complete!");
  }
}
