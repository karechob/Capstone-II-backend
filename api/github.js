const express = require("express");
const router = express.Router();
const { Octokit } = require("octokit");
require("dotenv").config();

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN
});

router.get("/", async (req, res) => {
  const result = await octokit.request('GET /repos/{owner}/{repo}/commits', {
    owner: 'yuzchen7',
    repo: 'ttp_crud_backend',
  })
  res.send(result.data);
});

module.exports = router;