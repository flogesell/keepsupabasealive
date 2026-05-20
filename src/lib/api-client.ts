/**
 * Same-origin API calls from the dashboard must send cookies and HTTP Basic Auth
 * credentials. Without `credentials: "include"`, some browsers omit the
 * Authorization header on fetch(), which breaks the app behind DASHBOARD_PASSWORD.
 */
export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
  });
}
