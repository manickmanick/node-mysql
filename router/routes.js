const express = require("express")
const router = express.Router();
const userController = require("../controllers/user.controller")
const auth = require("../auth/auth")
const fileUpload = require("../controllers/fileUpload.controller");
const transactionController = require("../controllers/transaction.controller");

// user routes
router.post("/register",userController.register);
router.post("/login",userController.login);
router.get("/getUser",auth.auth,userController.getUser);
router.post("/updateUser",auth.auth,userController.update);
router.get("/activate/:token",userController.accountActivation);
router.post("/reactivationLink",userController.resendActivationLink);

router.post("/upload",auth.auth,fileUpload.upload);

//transaction routes

router.post("/transaction/request",auth.auth,transactionController.transactionRequest);
router.post("/transaction/verify",auth.auth,transactionController.transactionVerify);

module.exports = router;