function notFound(req, res, next) { res.status(404); next(new Error(`Not found: ${req.method} ${req.originalUrl}`)); }
function errorHandler(err, req, res, next) {
  let status = res.statusCode >= 400 ? res.statusCode : 500;
  let message = err.message || "Server error";
  if (err.name === "ValidationError") { status = 400; message = Object.values(err.errors).map(e => e.message).join(", "); }
  if (err.code === 11000) { status = 409; message = "A record with this unique value already exists"; }
  if (err.name === "CastError") { status = 400; message = "Invalid resource identifier"; }
  res.status(status).json({ success: false, message, ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}) });
}
module.exports = { notFound, errorHandler };