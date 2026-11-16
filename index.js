const router = require("express").Router();
router.use("/auth", require("./auth"));
router.use("/products", require("./products"));
router.use("/categories", require("./categories"));
router.use("/cart", require("./cart"));
router.use("/orders", require("./orders"));
router.use("/reports", require("./reports"));
module.exports = router;