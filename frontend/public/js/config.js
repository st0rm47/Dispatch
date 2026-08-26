// In Docker (nginx proxies /api/* to the backend service), leave this empty
// so requests stay relative and same-origin.
//
// For local dev running the frontend on its own static server without
// Docker/nginx, point this at the backend directly, e.g.:
//   window.API_BASE = "http://localhost:4000";
window.API_BASE = "";
