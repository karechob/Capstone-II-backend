const { Sequelize } = require("sequelize");
const pg = require("pg");
require('dotenv').config();

const db = new Sequelize(
  `postgres://${process.env.dbUsername}:${process.env.dbPassword}@localhost:${process.env.dbPort}/${process.env.dbName}`, 
{
  logging: false,
});

module.exports = db;