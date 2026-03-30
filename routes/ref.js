const express = require("express");
const router = express.Router();

router.get("/:code", (req, res) => {
  const referral = req.params.code;

  // redirect to APK
  res.redirect("http://superx.it.com/app.apk");
});

module.exports = router;