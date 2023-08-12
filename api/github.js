const express = require("express");
const router = express.Router();
const { Octokit } = require("octokit");
require("dotenv").config();

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
});

//helper functions
//send api request to get the data of merge commits based on the sha
async function filter (ownerOfRepo,repository,shaString){
  const changeStats = await octokit.request('GET /repos/{owner}/{repo}/commits/{sha}', {
    // owner: 'kai2233',
    owner: ownerOfRepo,
    repo: repository,
    sha: shaString,
  });
  const dataObject = {
    date: changeStats.data.commit.committer.date,
    stats: changeStats.data.stats,
    numFiles: changeStats.data.files.length,
    files: changeStats.data.files
  };
  return dataObject;
}

//post http://localhost:8080/api/github/impact
//to test out this endpoint, remeber to put the json object below in postman->body->raw->json type
//{
//   "owner":"kai2233",
//   "repo": "TicketWingMan_backend"
// }
// 
// result of this endpoint will list out the commits that does merge pull request from branch to main
// include date, number of files affected, line of code been changed
// more details about files changes is iniside file object
router.post("/impact", async (req, res, next) => {
  const{owner,repo} = req.body;
  try {
    const filteredData = [];
    const dataCollection = []
    const result = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner: owner,
      // repo: 'TicketWingMan_backend',
      repo: repo,
      per_page: 100,
    });
    result.data.forEach(async (data) => {
      if(data.commit.message.includes("Merge")){
        // const result = await filter(data.parents[0].sha); 
        filteredData.push(filter(owner,repo,data.parents[0].sha))
      }
    })
    Promise.all(filteredData).then((stat)=>{
      dataCollection.push(stat);
    }).then(()=>{
      res.send(dataCollection);
    })
  } catch (err) {
    res.status(500).json({message : 'get request for commit data failed exception'});
    next(err);
  }
});

router.get("/pulls", async (req, res, next) => {
  try {
    const result = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner: 'kai2233',
      repo: 'TicketWingMan_backend',
      state : 'all',
    });
    result ? 
      res.send(result.data) :
      res.status(500).json({message : 'get request for pulls data failed'});
  } catch (err) {
    res.status(500).json({message : 'get request for pulls data failed exception'});
    next(err);
  }
});

router.get("/deployments", async (req, res, next) => {
  try {
    const result = await octokit.request('GET /repos/{owner}/{repo}/deployments', {
      owner: 'kai2233',
      repo: 'TicketWingMan_backend',
      state : 'all',
    });
    result ? 
      res.send(result.data) :
      res.status(500).json({message : 'get request for deployments data failed'});
  } catch (err) {
    res.status(500).json({message : 'get request for deployments data failed exception'});
    next(err);
  }
});


module.exports = router;