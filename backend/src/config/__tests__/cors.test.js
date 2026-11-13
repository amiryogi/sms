/**
 * CORS origins come from FRONTEND_URL, which may list several addresses
 * (e.g. the Vercel address and a custom domain), plus the local dev servers.
 */
const load = (frontendUrl) => {
  const saved = process.env.FRONTEND_URL;
  if (frontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = frontendUrl;
  let config;
  jest.isolateModules(() => {
    config = require('../index');
  });
  if (saved === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = saved;
  return config.cors.origin;
};

describe('CORS origins', () => {
  test('one address, plus the dev servers', () => {
    expect(load('https://vidyalaya-sms.vercel.app')).toEqual([
      'https://vidyalaya-sms.vercel.app',
      'http://localhost:5173',
      'http://localhost:5174',
    ]);
  });

  test('a comma-separated list, trimmed, without trailing slashes or empty entries', () => {
    expect(load(' https://vidyalaya-sms.vercel.app/ , https://app.example.com.np,, ')).toEqual([
      'https://vidyalaya-sms.vercel.app',
      'https://app.example.com.np',
      'http://localhost:5173',
      'http://localhost:5174',
    ]);
  });

  test('unset falls back to localhost:3000, and duplicates are dropped', () => {
    expect(load(undefined)).toEqual(['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174']);
    expect(load('http://localhost:5173')).toEqual(['http://localhost:5173', 'http://localhost:5174']);
  });
});
