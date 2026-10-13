// A tiny helper so route handlers can use async/await without wrapping every
// function in try/catch. If the promise rejects, the error is passed to
// Express, which sends a clean error response.
//
// Usage:  router.get('/things', asyncHandler(async (req, res) => { ... }))

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
