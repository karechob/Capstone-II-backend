const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit")

// merge success rate
// returns all pull requests
router.get("/mergeSuccessRate", async(req, res, next) => {
    try {
      const {owner, repo} = req.query;
  
      // get pull requests
     
      const response = await octokit.paginate("GET /repos/:owner/:repo/pulls", {
        owner: owner,
        repo: repo,
        state: "all",
        per_page: 100,
      });
  
      const pullRequests = response;
      const totalPullRequests = response.length;
  
      let mergedPR = 0;
  
      for(const pullRequest of pullRequests) {
        if(pullRequest.merged_at) {
          mergedPR++;
        }
      }
  
      const mergeSuccessRate = (mergedPR / totalPullRequests) * 100 || 0;
      console.log("this is merge success rate", mergeSuccessRate)
      res.json({
        totalPullRequests: totalPullRequests,
        mergeSuccessRate: mergeSuccessRate.toFixed(2),
      });
  
    } catch(error) {
      next(error);
    }
  })

  module.exports = router;