const express = require("express");
const router = express.Router();
const octokit = require("../octokit/octokitInit");

// Calculate deployment frequency
router.get("/deploymentFrequency", async (req, res, next) => {
    const { owner, repo } = req.query;
    try {
        if (!octokit.repos || typeof octokit.repos.listDeployments !== 'function') {
            console.error('Octokit repos object or listDeployments method not defined');
            res.status(500).json({ message: "Internal server error." });
            return;
        }
        
      const response = await octokit.repos.listDeployments({
        owner,
        repo,
        per_page: 100, 
      });
  
      const deployments = response.data;
      const totalDeployments = deployments.length;
      const lastDeploymentTime = totalDeployments > 0 ? deployments[0].created_at : null;
  
      res.json({
        totalDeployments,
        lastDeploymentTime,
      });
    } catch (error) {
      console.log("error in fetching deployments " + error);
      res.status(500).json({ message: "get request for deployments data failed exception" });
      next(error);
    }
  });

  module.exports = router;