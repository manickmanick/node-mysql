const express = require("express")
const router = express.Router();
const userController = require("../controllers/user.controller")
const auth = require("../auth/auth")

// user routes
router.post("/register",userController.register);
router.post("/login",userController.login);
router.get("/getUser",auth.auth,userController.getUser);

module.exports = router;