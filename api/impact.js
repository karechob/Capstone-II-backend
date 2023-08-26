const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit")

//helper functions
// send api request to get the data of merge commits based on the sha
async function impactFilter(ownerOfRepo, repository, shaString) {
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
    date: changeStats.data.commit.committer.date,
    stats: changeStats.data.stats,
    numFiles: changeStats.data.files.length,
    files: files,
  };
  return dataObject;
}

// result of this endpoint will list out the commits that does merge pull request from branch to main
// include date, number of files affected, line of code been changed
// more details about files changes is iniside file object
router.post("/impact", async (req, res, next) => {
    const { owner, repo } = req.body;
    try {
      const filteredData = [];
      const dataCollection = [];
      const result = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
        owner: owner,
        repo: repo,
        per_page: 5,
        state: "closed",
      });
      result.data.forEach(async (data) => {
        if(data.merge_commit_sha){
        filteredData.push(impactFilter(owner, repo, data.merge_commit_sha));
        }
      });
      Promise.all(filteredData)
        .then((stat) => {
          dataCollection.push(stat);
        })
        .then(() => {
          res.send(dataCollection);
        });
    } catch (err) {
      res
        .status(500)
        .json({ message: "get request for commit data failed exception" });
      next(err);
    }
  });

  module.exports = router;