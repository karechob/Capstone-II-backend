const express = require("express");
const router = express.Router();
const { Octokit } = require("octokit");
require("dotenv").config();

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
});

router.get("/", async (req, res, next) => {
  try {
    const result = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner: 'yuzchen7',
      repo: 'ttp_crud_backend',
    });
    result ? 
      res.send(result.data) :
      res.status(500).json({message : 'get request for commit data failed'});
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