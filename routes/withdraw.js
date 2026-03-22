
if (user.wageringRequired > 0) {
  return res.status(400).json({
    error: "Complete wagering before withdrawal"
  });
}
