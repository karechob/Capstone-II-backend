const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit")

async function getThoroughPRs(owner, repo) {
    //console.log(owner + " owner 232");
    //console.log(repo + " repository 233 ");
    try {
      if (owner && repo) {
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
              base: "main",
              page: page,
              per_page: 100,
  
              headers: {
                "X-GitHub-Api-Version": "2022-11-28",
              },
            }
          );
  
          const pullRequests = response.data;
          allPullRequests = allPullRequests.concat(pullRequests);
  
          // check if there are more pages
          if (pullRequests.length === 0) {
            hasMorePullRequests = false;
          } else {
            page++;
          }
        }
  
        let totalRequests = allPullRequests.length;
        let thoroughRequests = 0;
        //console.log(totalRequests + " total");
  
        for (const request of allPullRequests) {
          const commentsResponse = await octokit.request(request.comments_url, {
            headers: {
              "X-GitHub-Api-Version": "2022-11-28",
            },
          });
  
          const comments = commentsResponse.data;
  
          if (comments.length > 0) {
            thoroughRequests++;
          }
        }
  
        //console.log(thoroughRequests + "getThoroughPRs 289");
        let percentage = Math.round((thoroughRequests / totalRequests) * 100);
        //console.log(percentage + "getThoroughPRs 291");
        let notThorough = Math.round(
          ((totalRequests - thoroughRequests) / totalRequests) * 100
        );
        //console.log(notThorough + "getThoroughPRs 293");
        return { percentage, notThorough };
      }
    } catch (error) {
      console.log("error fetching pull requests " + error);
      return {
        error: true,
        message: "error fetching pull requests " + error
      }
    }
  }
  
  router.get("/thoroughPRs", async (req, res, next) => {
    try {
        let owner = req.query.owner;
        let repo = req.query.repo;

        const result = await getThoroughPRs(owner, repo);

        if(result.error) {
            console.log(result.message);
            res.json({
                error: true,
                message: result.message
            });
            
        } else {
            console.log(result + "router");
            res.json(result);
        }
    } catch (err) {
        res
            .status(500)
            .json({ message: "get request for thorough pulls data failed" });
        next(err);
    }
});

  module.exports = router;