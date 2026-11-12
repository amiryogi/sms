// Small API client for test setup and for comparing the UI with the API.
const API = () => process.env.E2E_API_URL;

const call = async (method, path, token, body) => {
  const response = await fetch(API() + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

const login = async (email, password = "password123") => {
  const res = await call("POST", "/auth/login", null, { email, password });
  if (res.status !== 200) throw new Error(`login ${email}: ${res.status} ${res.body?.message}`);
  return res.body.data;
};

module.exports = { call, login };
