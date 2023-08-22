const express = require("express");
const app = express();
const cors = require("cors");
const PORT = 4000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.use("/api", require("./api"));
app.get("/", (req, res) => {
    res.send("Hello! This is capstoneII backend");
});

app.listen(PORT, () => {
    console.log(`API listening on PORT ${PORT}`);
});

module.exports = app;
