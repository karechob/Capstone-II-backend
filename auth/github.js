const router = require("express").Router();
const passport = require("passport");
const GithubStrategy = require("passport-github2").Strategy;
const  User  = require("../db/models");
require("dotenv").config();

//http://localhost:8080/auth/github
passport.use(
    new GithubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: process.env.GITHUB_CALLBACK_URL,
            scope:["user:email","public_repo","read:user","repo:status","repo_deployment"]
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const githubId = profile.id;
                const email = profile.emails[0].value;
                const username = profile.displayName;
                const access_token = accessToken;
                const refresh_token = refreshToken;
                const [user] = await User.findOrCreate({
                    where: { githubId },
                    defaults: { email, username, access_token,refresh_token},
                });

                done(null, user);
            } catch (err) {
                done(err);
            }
        }
    )
);

router.get(
    "/",
    passport.authenticate("github", { scope: ["profile", "user:email","public_repo","read:user","repo:status","repo_deployment"] })
);

router.get("/failed",  (req, res) => {
    res.send("login failed");
});

router.get("/success",  (req, res) => {
    res.send("login success");
});

router.get(
    "/callback",
    passport.authenticate("github", {
        // failureRedirect: "http://localhost:3000/login",
        failureRedirect: "http://localhost:8080/auth/github/failed",
    }),
    (req, res) => {
        // res.redirect("http://localhost:3000");
        res.redirect("http://localhost:8080/auth/github/success");
    }
);

module.exports = router;