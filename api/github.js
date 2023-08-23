const express = require("express");
const router = express.Router();
const { Octokit } = require("octokit")
require("dotenv").config();

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
});

// helper functions
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

// Unreviewed Pull Requests helper function
async function getGitHubPulls(req, type) {
  // console.log(req.query);
  const { owner, repo } = req.query;
  async function getAllPulls(limit, page) {
    // console.log(`page number: ${page}`);
    const data = [];
    // request api
    const result = await octokit.request(
      // get open pull requests only to avoid api call limit
      // "GET /repos/{owner}/{repo}/pulls?state=open",
      `GET /repos/{owner}/{repo}/pulls?state=open&per_page=${limit}&page=${page}`,
      {
        owner: owner,
        repo: repo,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    // return data and store it in declared data array
    if (Array.isArray(result.data)) {
      data.push(...result.data);
    }
    // if limit is smaller than length, then it is the last page
    if (result.data.length < limit) {
      return data;
    } else {
      // if not, then go to next page and retrieve data
      const preData = await getAllPulls(limit, page + 1);
      if (Array.isArray(preData)) {
        data.push(...preData);
      }
      return data;
    }
  }
  let pullData = await getAllPulls(100, 1);
  // console.log("Successfully fetch pullData");
  // use Promise.all to execute all asynchronous functions

  if (type === "comments") {
    const promises = Promise.all(
      pullData.map((t, i) =>
        getGitHubPullComment(t.comments_url, i, pullData.length)
      )
    );
    const result = {
      halfAnHour: 0,
      anHour: 0,
      threeHours: 0,
      halfADay: 0,
      aDay: 0,
      aWeek: 0,
      oneMonth: 0,
      notResponding: 0,
    };
    const map = {
      halfAnHour: 1000 * 60 * 30,
      anHour: 1000 * 60 * 60,
      threeHours: 1000 * 60 * 60 * 3,
      halfADay: 1000 * 60 * 60 * 12,
      aDay: 1000 * 60 * 60 * 24,
      aWeek: 1000 * 60 * 60 * 24 * 7,
      oneMonth: 1000 * 60 * 60 * 24 * 30,
    };
    await promises.then((res) => {
      res.forEach((t, i) => {
        if (t.length === 0) {
          result.notResponding++;
        } else {
          // time for the first comment
          const targetTime = new Date(t[0].created_at).getTime();
          // time when the pull request is made
          const sourceTime = new Date(pullData[i].created_at).getTime();
          const diff = targetTime - sourceTime;

          // check the time range that the data falls within
          if (diff <= map.halfAnHour) {
            result.halfADay++;
          } else if (diff <= map.anHour) {
            result.anHour++;
          } else if (diff <= map.threeHours) {
            result.threeHours++;
          } else if (diff <= map.halfADay) {
            result.halfADay++;
          } else if (diff <= map.aDay) {
            result.aDay++;
          } else if (diff <= map.aWeek) {
            result.aWeek++;
          } else if (diff <= map.oneMonth) {
            result.oneMonth++;
          }
        }
      });
    });
    return result;
  } else {
    const promises = Promise.all(
      pullData.map((t, i) =>
        getGitHubPullReview(owner, repo, t.number, i, pullData.length)
      )
    );
    // keep track of successfully reviewed and failed-to-review GitHub pull requests
    const result = {
      success: 0,
      failure: 0,
    };
    await promises.then((res) => {
      // console.log("Successfully fetch reviewData");
      res.forEach((t, i) => {
        // if review.data's length is greater than 0, it means there is comment in that pull request
        // then it is not an unreviewed pull requests
        // therefore, the count of successfully reviewed pull requests increments
        if (Array.isArray(t.data) && t.data.length > 0) {
          result.success++;
        } else {
          // otherwise, the count of pull requests failed to be reviewed increments
          result.failure++;
        }
      });
    });
    return result;
  }
}

// request for reviews
async function getGitHubPullReview(owner, repo, pull_number, index, total) {
  return await octokit
    .request("GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews", {
      owner,
      repo,
      pull_number,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    .then((res) => {
      // console.log(`Current progress: ${index + 1}/${total}`);
      return res;
    });
}

// request for comments
async function getGitHubPullComment(url, index, total) {
  return await octokit
    .request(url, {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
    .then((res) => {
      // console.log(`Current progress: ${index + 1}/${total}`);
      return res.data;
    });
}

/*
  End-point url -> http://localhost:8080/api/github/generatePull?owner=[owner]&repo=[repo]
	Sample usage -> http://localhost:8080/api/github/generatePull?owner=facebook&repo=react

  Expected query data pass in:
	owner = [the name of the repo's owner]
	repo = [the name of the repo]

  Expected return result object :
  {
    success : number of reviewed open pull requests,
    failure : number of unreviewed open pull requests
  }
  
  Description:
  The result of this endpoint will show the number of reviewed and unreviewed open pull requests. To be considered as a reviewed open pull request, the state of the pull request has to be open, and another contributor must have commented on or approved part of the code within the pull request
*/
router.get("/generatePull", async (req, res, next) => {
  try {
    const result = await getGitHubPulls(req);
    res.send(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "get request for pulls data failed exception" });
    next(err);
  }
});

router.get("/responsiveness", async (req, res, next) => {
  try {
    const result = await getGitHubPulls(req, "comments");
    res.send(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "get request for pulls data failed exception" });
    next(err);
  }
});

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
    throw error;
  }
}

router.get("/thoroughPRs", async (req, res, next) => {
  console.log(req.query);
  try {
    let owner = req.query.owner;
    let repo = req.query.repo;

    const result = await getThoroughPRs(owner, repo);
    console.log(result + "router");
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ message: "get request for thorough pulls data failed" });
    next(err);
  }
});

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
