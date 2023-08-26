const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit")

async function new_work_metric_filter(ownerOfRepo, repository, shaString) {
    const files = [];
    const changeStats = await octokit.request(
      "GET /repos/{owner}/{repo}/commits/{sha}",
      {
        owner: ownerOfRepo,
        repo: repository,
        sha: shaString,
      }
    );
    changeStats.data.files.forEach((fileData) => {
      const fileObject = {
        changes: fileData.changes,
        additions: fileData.additions,
        deletions: fileData.deletions,
        filename: fileData.filename.split("/").pop(),
      };
      files.push(fileObject);
    });
  
    const dataObject = {
      date: changeStats.data.commit.committer.date.split("T")[0],
      stats: changeStats.data.stats,
      numFiles: changeStats.data.files.length,
      files: files,
    };
    return dataObject;
  }
  
  router.post("/new_Work", async (req, res, next) => {
    const { owner, repo } = req.body;
    try {
      const filteredData = [];
  
      //get the date 7 days ago
      let sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const exactDate = sevenDaysAgo.toISOString().split("T")[0];
  
      const result = await octokit.request("GET /repos/{owner}/{repo}/commits", {
        owner: owner,
        repo: repo,
        since: exactDate,
        per_page: 100,
      });
      console.log(result.data.length);
      for (let data of result.data) {
        //skip the merge pull request commits
        if (data.commit.verification.verified === true) {
          continue;
        }
        filteredData.push(new_work_metric_filter(owner, repo, data.sha));
      }
      console.log(filteredData.length);
      // res.status(200).json(filteredData);
      Promise.all(filteredData).then((stat) => {
        res.send(stat);
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "get request for commit data failed exception" });
      next(err);
    }
  });

  module.exports = router;