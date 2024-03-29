const { getUsers } = require("../controllers/users.controllers");

const usersRouter = require("express").Router();

usersRouter.route("/").get(getUsers);

usersRouter.route("/:username").get(getUsers);

module.exports = usersRouter;
