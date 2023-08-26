const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit")

function leadTimeObjFilter(dataObj) {
    let filteredObj = {};
    let commitdat = dataObj.commit;
    filteredObj.author = commitdat.author;
    filteredObj.commit_date = filteredObj.author.date.substring(
      0,
      filteredObj.author.date.indexOf("T")
    );
    filteredObj.message = commitdat.message;
    return filteredObj;
  }
  
  function leadTimeFilter(dataCollection) {
    let resData = [];
    for (var i = dataCollection.length - 1; i >= 0; i--) {
      let filteredEle = leadTimeObjFilter(dataCollection[i]);
      if (resData.length == 0) {
        resData.push({ date: filteredEle.commit_date, data: [filteredEle] });
      } else {
        let res = resData.some((item) => {
          if (item.date == filteredEle.commit_date) {
            item.data.push(filteredEle);
            return true;
          }
        });
  
        if (!res) {
          resData.push({ date: filteredEle.commit_date, data: [filteredEle] });
        }
      }
    }
  
    let fianl = {
      statistic: {
        average_commit:
          Math.round((dataCollection.length / resData.length) * 100) / 100,
        total_commit: dataCollection.length,
      },
      commit_data: resData,
    };
  
    return fianl;
  }
  
  async function getAllCommits(req) {
    var data = [];
    var page = 1;
  
    while (true) {
      const result = await octokit.request("GET /repos/{owner}/{repo}/commits", {
        owner: req.query.owner,
        repo: req.query.repo,
        per_page: 100,
        page: page,
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
      sample usage -> http://localhost:8080/api/github/leadTime?owner=kai2233&repo=TicketWingMan_backend
  
    expected query data pass in:
      owner = [the name of the repo's owner]
      repo = [the name of the repo]
  
    expected return result object :
      {
        statistic : {average_commit, total_commit},
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
      let resultfiltered = leadTimeFilter(result);
  
      resultfiltered
        ? res.send(resultfiltered)
        : res.status(500).json({ message: "get request for pulls data failed" });
    } catch (err) {
      res
        .status(500)
        .json({ message: "get request for pulls data failed exception" });
      next(err);
    }
  });

module.exports = router;