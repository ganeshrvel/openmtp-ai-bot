#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const REPO_OWNER = 'ganeshrvel';
const REPO_NAME = 'openmtp';
const OUTPUT_DIR = './openmtp-gh-issues';
const GITHUB_API_BASE = 'https://api.github.com';

// Utility function to sanitize filename
function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

// Utility function to make GitHub API requests
async function githubRequest(url) {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'OpenMTP-Issues-Fetcher'
    }
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Function to fetch all issues (with pagination)
async function fetchAllIssues() {
  let allIssues = [];
  let page = 1;
  let hasMore = true;
  
  console.log('Fetching issues from GitHub...');
  
  while (hasMore) {
    const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=all&page=${page}&per_page=100`;
    
    try {
      const issues = await githubRequest(url);
      
      if (issues.length === 0) {
        hasMore = false;
      } else {
        allIssues = allIssues.concat(issues);
        console.log(`Fetched page ${page}: ${issues.length} issues`);
        page++;
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      break;
    }
  }
  
  console.log(`Total issues fetched: ${allIssues.length}`);
  return allIssues;
}

// Function to fetch comments for an issue
async function fetchIssueComments(issueNumber) {
  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`;
  
  try {
    return await githubRequest(url);
  } catch (error) {
    console.error(`Error fetching comments for issue #${issueNumber}:`, error.message);
    return [];
  }
}

// Function to process and transform issue data
function processIssueData(issue, comments) {
  const ganeshrvelReplies = [];
  const otherReplies = [];
  
  // Process comments
  comments.forEach(comment => {
    const commentData = {
      author: comment.user.login,
      body: comment.body,
      created_at: comment.created_at,
      updated_at: comment.updated_at
    };
    
    if (comment.user.login === 'ganeshrvel') {
      ganeshrvelReplies.push(commentData);
    } else {
      otherReplies.push(commentData);
    }
  });
  
  return {
    issue_number: issue.number,
    title: issue.title,
    question: {
      author: issue.user.login,
      body: issue.body,
      created_at: issue.created_at,
      updated_at: issue.updated_at
    },
    replies: otherReplies,
    answers: ganeshrvelReplies,
    status: issue.state,
    labels: issue.labels.map(label => label.name),
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    url: issue.html_url
  };
}

// Function to save issue data to JSON file
function saveIssueToFile(issueData) {
  const sanitizedTitle = sanitizeFilename(issueData.title);
  const filename = `${issueData.issue_number}-${sanitizedTitle}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  try {
    fs.writeFileSync(filepath, JSON.stringify(issueData, null, 2), 'utf8');
    console.log(`✅ Saved: ${filename}`);
  } catch (error) {
    console.error(`❌ Error saving ${filename}:`, error.message);
  }
}

// Main function
async function main() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Fetch all issues
    const issues = await fetchAllIssues();
    
    console.log('\nProcessing issues and fetching comments...');
    
    // Process each issue
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      
      // Skip pull requests (they appear in issues API but have pull_request property)
      if (issue.pull_request) {
        console.log(`⏭️  Skipping PR #${issue.number}: ${issue.title}`);
        continue;
      }
      
      console.log(`📋 Processing issue #${issue.number}: ${issue.title}`);
      
      // Fetch comments for this issue
      const comments = await fetchIssueComments(issue.number);
      
      // Process and transform the data
      const processedData = processIssueData(issue, comments);
      
      // Save to file
      saveIssueToFile(processedData);
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 All issues have been processed and saved!');
    console.log(`📁 Check the '${OUTPUT_DIR}' directory for the JSON files.`);
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}