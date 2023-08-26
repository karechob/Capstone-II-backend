const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit")

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

module.exports = router;