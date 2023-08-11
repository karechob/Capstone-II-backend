const express = require("express");
const app = express();
const db = require("./db");
const cors = require("cors");
const session = require("express-session");
const sequelizeStore = require("connect-session-sequelize")(session.Store);

const store = new sequelizeStore({ db });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(
  session({
    secret: "capstoneii",
    store: store,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3 * 1000 * 60 * 60 },
    httpOnly: true,
  })
);

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
    await store.sync();
    setupRoutes();
    return runServer(port);
};

module.exports = configureApp(8080);