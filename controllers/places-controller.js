const { validationResult } = require("express-validator");
const fs = require("fs");
const mongoose = require("mongoose");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../utils/location");
const Place = require("../models/place");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  // const place = DUMMY_PLACES.find((p) => p.id === placeId);
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("Place ould not be found!", 500);
    return next(error);
  }
  if (!place) {
    // return res
    // .status(404)
    // .json({ message: "No place found with provided place id!" });
    const error = new HttpError("No place found with provided place id!", 404);
    return next(error);
  }
  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  // const places = DUMMY_PLACES.filter((p) => p.creator === userId);
  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch {
    const error = new HttpError("Place ould not be found!", 500);
    return next(error);
  }
  if (!places || places.length === 0) {
    // return res
    // .status(404)
    // .json({ message: "No place found with provided user id!" });

    return next(new HttpError("No places found with provided user id!", 404));
  }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Invalid inputs passed, check your data", 422));
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    location: coordinates,
    image: req.file.path,
    address,
    creator: req.userData.userId,
  });

  let user;

  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError("Creating place failed", 500));
  }
  if (!user) {
    return next(new HttpError("Could not find user by id!", 404));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await createdPlace.save({ session: session });
    user.places.push(createdPlace); //mongoose push bts
    await user.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError("Place could not be created!", 500);
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const deleteById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong! Can't delete the place1",
      500
    );
    return next(error);
  }

  if (!place) {
    return next(new HttpError("Could not find place!", 404));
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError("You are not allowed to delete this place", 401);
    return next(error);
  }
  const imagePath = place.image
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await place.deleteOne({ session: session });
    //remove()deprecated.
    place.creator.places.pull(place);
    await place.creator.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong! Can't delete the place2",
      500
    );
    return next(error);
  }
  fs.unlink(imagePath, (err) => {
    console.log(err);
  });
  res.status(200).json({ message: "Place deleted!" });
};

const updatePlaceById = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    return next(new HttpError("Invalid inputs!", 422));
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;
  let place;

  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("Something went wrong!", 500);
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId){
    const error = new HttpError("You are not allowed to edit this place", 401);
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError("Place could not be updated!", 500);
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.deleteById = deleteById;
exports.updatePlaceById = updatePlaceById;
