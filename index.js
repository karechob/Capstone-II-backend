const express = require("express");
const app = express();
const db = require("./db");
const cors = require("cors");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const setupRoutes = () => {
    app.use("/api", require("./api"));
    app.get("/", (req, res) => {
        res.send("Hello! This is capstoneII backend");
    });
};

const runServer = async (port) => {
    await db.sync({ force: true }); // test purpose only
    app.listen(port, () => {
        console.log(`server is running on port 8080`);
    });
};

const configureApp = async (port) => {
    setupRoutes();
    return runServer(port);
};

module.exports = configureApp(8080);