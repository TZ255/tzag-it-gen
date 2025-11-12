module.exports.notFound = (req, res) => {
  res.status(404).render('errors/404', {
    title: 'Page Not Found',
    description: 'Sorry, the page you requested was not found.',
    keywords: '404, page not found, error',
    page: '404',
  });
};

module.exports.serverError = (err, req, res, next) => {
  // Log detailed error on server only
  // eslint-disable-next-line no-console
  console.error(err && err.stack ? err.stack : err);
  res.status(500).render('errors/500', {
    title: 'Internal Server Error',
    description: 'There was a problem on our side. Please try again later.',
    keywords: '500, internal server error, error',
    page: '500',
  });
};
