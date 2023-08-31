const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit");

// Calculate deployment frequency
router.get("/deploymentFrequency", async (req, res, next) => {
  const { owner, repo } = req.query;
  console.log("octokit is here", octokit.rest.repos);
  try {
    const response = await octokit.rest.repos.listDeployments({
      owner,
      repo,
      per_page: 100,
    });

    const deployments = response.data;
    const totalDeployments = deployments.length;

   const lastDeploymentTime =
  totalDeployments > 0
    ? new Date(deployments[0].created_at).toLocaleString()
    : null;

    console.log("deployment 1 here", deployments[0]); //displaying deployments on terminal

    //Obtaining the deployment months
    const deploymentsByMonth = {
      Jan: { count: 0, weeks: [] },
      Feb: { count: 0, weeks: [] },
      Mar: { count: 0, weeks: [] },
      Apr: { count: 0, weeks: [] },
      May: { count: 0, weeks: [] },
      Jun: { count: 0, weeks: [] },
      Jul: { count: 0, weeks: [] },
      Aug: { count: 0, weeks: [] },
      Sep: { count: 0, weeks: [] },
      Oct: { count: 0, weeks: [] },
      Nov: { count: 0, weeks: [] },
      Dec: { count: 0, weeks: [] },
    };
  
    deployments.forEach(deployment => {//iterates through each deployment
      const timestamp = new Date(deployment.created_at);
      const month = timestamp.toLocaleString("default", { 
        month: "short" });

      const weekNumber = getWeekNumber(timestamp);
  
      const weekObj = {
        weekNumber,
        date: timestamp.toISOString(),
      };
  
      deploymentsByMonth[month].count++;
      deploymentsByMonth[month].weeks.push(weekObj);

    });
  
    res.json({
      totalDeployments,
      lastDeploymentTime,
      deploymentsByMonth,
    });

    function getWeekNumber(date) {
      const month = date.getMonth();
      const dayInMonth = date.getDate();
    
      if (dayInMonth <= 7) {
        return 1;
      } else if (dayInMonth <= 14) {
        return 2;
      } else if (dayInMonth <= 21) {
        return 3;
      } else {
        return 4;
      }
  }
    
  } catch (error) {
    console.log("error in fetching deployments " + error);
    res
      .status(500)
      .json({ message: "get request for deployments data failed exception" });
    next(error);
  }
});

module.exports = router;
