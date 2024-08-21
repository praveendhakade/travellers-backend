const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError("No users", 404);
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signUp = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid inputs, enter valid data!", 422));
  }
  const { name, email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Can not find the user!", 404);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError("User already exists! Try login instead", 422);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create User, try again!", 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    password:hashedPassword,
    places: [],
    image: req.file.path,
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Place could not be created!", 500);
    return next(error);
  }

  let token;
  try {
  token = jwt.sign(
    { userId: createdUser.id, email: createdUser.email },
    "secretpass_dont_share",
    { expiresIn: "1h" }
  );
  } catch (err) {
    const error = new HttpError("Couldn't signup, check creds!", 500);
    return next(error);
  }

  // res.status(201).json({ user: createdUser.toObject({ getters: true }) });
  res.status(201).json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Logging  in failed!", 404);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError("Invalid creds", 401);
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError("Couldn't login, check creds!", 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError("Couldn't login, check creds!", 401);
    return next(error);
  }

  let token;
  try {
  token = jwt.sign(
    { userId: existingUser.id, email: existingUser.email },
    "secretpass_dont_share",
    { expiresIn: "1h" }
  );
  } catch (err) {
    const error = new HttpError("Couldn't login, check creds!", 500);
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token
  });
  // res.json({
  //   message: "Logged In!",
  //   user: existingUser.toObject({ getters: true }),
  // });
};

exports.getUsers = getUsers;
exports.signUp = signUp;
exports.login = login;

//   const identifiedUser = DUMMY_USERS.find((u) => u.email === email);

//   if (!identifiedUser || identifiedUser.password !== password) {
//     return next(new HttpError("Could not find user, or wrong credentials", 421));
//   }
