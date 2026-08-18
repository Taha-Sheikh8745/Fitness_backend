const getRefreshTokenCookieOptions = (overrides = {}) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  ...overrides,
});

module.exports = { getRefreshTokenCookieOptions };
