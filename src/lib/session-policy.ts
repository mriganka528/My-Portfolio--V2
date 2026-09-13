export const SESSION_SECONDS = 60 * 60 * 12;
export const REMEMBERED_SESSION_DAYS = 30;
export const REMEMBERED_SESSION_SECONDS = 60 * 60 * 24 * REMEMBERED_SESSION_DAYS;

export function sessionLifetime(rememberMe: boolean) {
  return rememberMe ? REMEMBERED_SESSION_SECONDS : SESSION_SECONDS;
}
