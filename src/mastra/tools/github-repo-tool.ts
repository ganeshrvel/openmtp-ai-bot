// import { createTool } from "@mastra/core/tools";
// import { z } from "zod";
//
// interface RepoResponse {
//   stargazers_count: number;
//   forks_count: number;
//   open_issues_count: number;
//   license: { name: string } | null;
//   pushed_at: string;
//   description: string | null;
// }
//
// export const githubRepoTool = createTool({
//   id: "get-github-repo-info",
//   description: "Fetch basic insights for a public GitHub repository",
//   inputSchema: z.object({
//     owner: z.string().describe("GitHub username or organization"),
//     repo: z.string().describe("Repository name"),
//   }),
//   outputSchema: z.object({
//     stars: z.number(),
//     forks: z.number(),
//     issues: z.number(),
//     license: z.string().nullable(),
//     lastPush: z.string(),
//     description: z.string().nullable(),
//   }),
//   execute: async ({ context }) => getRepo(context.owner, context.repo),
// });
//
// async function getRepo(owner: string, repo: string) {
//   const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
//   if (res.status === 404) throw new Error(`Repository ${owner}/${repo} not found`);
//   const data: RepoResponse = await res.json();
//   return {
//     stars: data.stargazers_count,
//     forks: data.forks_count,
//     issues: data.open_issues_count,
//     license: data.license?.name ?? null,
//     lastPush: data.pushed_at,
//     description: data.description,
//   };
// }
