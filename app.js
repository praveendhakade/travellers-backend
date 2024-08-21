const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const HttpError = require("./models/http-error");
const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const app = express();

app.use(bodyParser.json());
app.use("/uploads/images", express.static(path.join("uploads", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  next();
});

app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);

app.use((req, res, next) => {
  const error = new HttpError("Route not found", 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "Unknown error occured" });
});

const db_user = process.env.MONGODB_USER;

const uri = `mongodb+srv://${db_user}:uu79KGKoajrnayB1@cluster0.uauxnjj.mongodb.net/`

mongoose
  .connect(
uri
  )
  .then(() => {
    // console.log("connected")
    app.listen(5000);
  })
  .catch((err) => {
    console.log(err);
  });
