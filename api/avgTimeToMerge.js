const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit")

async function getClosedPRs(owner, repo) {
    try {
      let allPullRequests = [];
      let page = 1;
      let hasMorePullRequests = true;
  
      while (hasMorePullRequests) {
        const response = await octokit.request(
          "GET /repos/{owner}/{repo}/pulls",
          {
            owner: owner,
            repo: repo,
            state: "closed",
            page: page,
            per_page: 100,
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );
  
        // If the current page has fewer than 100 PRs, it means it's the last page.
  
        if (response.data.length < 100) {
          hasMorePullRequests = false;
        }
  
        allPullRequests = allPullRequests.concat(response.data);
  
        page++;
      }
  
      const mergedPRs = allPullRequests.filter((pr) => pr.merged_at);
  
      const timesToMerge = mergedPRs.map((pr) => {
        const createdAt = new Date(pr.created_at);
  
        const mergedAt = new Date(pr.merged_at);
  
        return (mergedAt - createdAt) / (1000 * 60 * 60);
      });
  
      const total = timesToMerge.reduce((acc, curr) => acc + curr, 0);
  
      const avgTime = total / timesToMerge.length || 0;
  
      return avgTime;
    } catch (error) {
      console.log("error fetching pull requests " + error);
  
      throw error;
    }
  }
  
  router.get("/avgTimeToMerge", async (req, res, next) => {
    try {
      let owner = req.query.owner;
  
      let repo = req.query.repo;
  
      const avgTime = await getClosedPRs(owner, repo);
  
      console.log(`Average Time to Merge: ${avgTime}`);
  
      res.json({ avgTime });
    } catch (err) {
      res
        .status(500)
        .json({ message: "get request for closed pulls data failed" });
  
      next(err);
    }
  });

  module.exports = router;