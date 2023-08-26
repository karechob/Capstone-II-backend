const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit")

async function reworkFilter(ownerOfRepo, repository, shaString) {
    const files = [];
    const commitStats = await octokit.request(
      "GET /repos/{owner}/{repo}/commits/{sha}",
      {
        owner: ownerOfRepo,
        repo: repository,
        sha: shaString,
      }
    );
  
    commitStats.data.files.forEach((fileData) => {
      //Indicates that code in files were modified
      if (fileData.status === "modified" && fileData.deletions !== 0) {
        const fileObject = {
          status: fileData.status,
          changes: fileData.changes,
          additions: fileData.additions,
          deletions: fileData.deletions,
          filename: fileData.filename.split("/").pop(),
        };
        files.push(fileObject);
      }
    });
  
    if (files.length > 0 && commitStats.data.stats.deletions !== 0) {
      const dataObject = {
        date: commitStats.data.commit.committer.date.split("T")[0],
        files: files,
      };
  
      return dataObject;
    }
  }
  
  router.post("/rework", async (req, res, next) => {
    const { owner, repo } = req.body;
    try {
      const filteredDataArr = [];
  
      //get the date 3 weeks ago
      let threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
      const exactDate = threeWeeksAgo.toISOString().split("T")[0];
  
      const result = await octokit.request("GET /repos/{owner}/{repo}/commits", {
        owner: owner,
        repo: repo,
        since: exactDate,
        per_page: 100,
      });
  
      for (let data of result.data) {
        //skip the merge pull request commits
        if (data.commit.verification.verified === true) {
          continue;
        }
  
        let filteredData = reworkFilter(owner, repo, data.sha);
  
        if (filteredData !== undefined) {
          filteredDataArr.push(filteredData);
        }
      }
  
      // res.status(200).json(filteredData);
  
      Promise.all(filteredDataArr).then((stat) => {
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