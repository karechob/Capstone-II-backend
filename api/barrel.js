const express = require("express");
const router = express.Router();
const impact = require("./impact")
const avgTimeToMerge = require("./avgTimeToMerge")
const deploymentFrequency = require("./deploymentFrequency")
const leadTime = require("./leadTime")
const mergeSuccessRate = require("./mergeSuccess")
const new_Work = require("./newWork")
const rework = require("./rework")
const thoroughPRs = require("./thoroughPRs")
const pullRequests = require("./pullRequests")

router.use("/", impact);
router.use("/", avgTimeToMerge);
router.use("/", deploymentFrequency);
router.use("/", leadTime)
router.use("/", mergeSuccessRate)
router.use("/", new_Work)
router.use("/", rework)
router.use("/", thoroughPRs)
router.use("/", pullRequests)



module.exports = router;
