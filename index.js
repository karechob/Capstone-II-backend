const express = require("express");
const app = express();
const db = require("./db");
const cors = require("cors");
const session = require("express-session");
const sequelizeStore = require("connect-session-sequelize")(session.Store);
const passport = require("passport");
const User = require("./db/models");
const store = new sequelizeStore({ db });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: "http://localhost:3000",
        methods: "GET,PUT,PATCH,HEAD,POST,DELETE",
        credentials: true,
    })
);

app.use(
    session({
        secret: "capstoneii",
        store: store,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 7 * 1000 * 60 * 60 },
        httpOnly: true,
    })
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);

        done(null, user);
    } catch (err) {
        done(err);
    }
});

app.use(passport.initialize());
app.use(passport.session());

const setupRoutes = () => {
    app.use("/auth/github",require("./auth/github"));
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