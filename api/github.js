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

function leadTimeGetAveage(dataCollection) {
  var total= 0;
  dataCollection.forEach(element => {
    total += element.data.length;
  });
  // console.log('total commit -> ' + total);
  return total / dataCollection.length;
}

function leadTimeObjFilter(dataObj) {
  let filteredObj = {};
  let commitdat = dataObj.commit;
  filteredObj.author = commitdat.author;
  filteredObj.commit_date = filteredObj.author.date.substring(0, filteredObj.author.date.indexOf('T'));
  filteredObj.message = commitdat.message;
  return filteredObj;
}

function leadTimeFilter(dataCollection) {
  let resData = [];
  dataCollection.map(element => {
    let filteredEle = leadTimeObjFilter(element);

    if (resData.length == 0) {
      resData.push({date : filteredEle.commit_date, data : [filteredEle]});
    } else {
      let res = resData.some(item => {
        if (item.date == filteredEle.commit_date) {
          item.data.push(filteredEle);
          return true;
        }
      });

      if (!res) {
        resData.push({date : filteredEle.commit_date, data : [filteredEle]});
      } 
    }
  });
  return resData;
}

async function getAllCommits(req) {
  var data = [];
  var page = 1;

  while (true) {
    const result = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner: req.query.owner,
      repo: req.query.repo,
      per_page : 100,
      page : page
    });
    
    if (result.data.length == 0) {
      break;
    }

    data = data.concat(result.data);
    page += 1;
  }
  return data;
}

/*
  end-point url -> http://localhost:8080/api/github/leadTime?owner=[owner]&repo=[repo]
    smaple usage -> http://localhost:8080/api/github/leadTime?owner=kai2233&repo=TicketWingMan_backend

  expected query data pass in:
    owner = [the name of the repo's owner]
    repo = [the name of the repo]

  expected return result object :
    {
      statistic : {aveage_commit, total_commit},
      commit_data : [{author: {name, email., date}, commit_date, message}, ... ]
    }
  
  description:
    result of this endpoint will list out the all commits of the repository, 
    including date, commit message, and author info of the commit. Also
    having the statistic data for the total number of commits and the 
    aveage commit times of eatch date.
*/
router.get("/leadTime", async (req, res, next) => {
  try {
    const result = await getAllCommits(req);

    let total_commit = result.length;
    let resultfiltered = leadTimeFilter(result);
    let aveage = leadTimeGetAveage(resultfiltered);
    finalres = {statistic : {aveage_commit : aveage, total_commit : total_commit}, commit_data : resultfiltered};

    finalres ? 
      res.send(finalres) :
      res.status(500).json({message : 'get request for pulls data failed'});
  } catch (err) {
    res.status(500).json({message : 'get request for pulls data failed exception'});
    next(err);
  }
});

module.exports = router;