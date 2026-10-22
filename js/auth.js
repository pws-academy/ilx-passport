// Microsoft sign-in (MSAL). Loaded only when SharePoint mode is on.
import { CONFIG } from "./config.js";

const SCOPES = ["User.Read", "Sites.ReadWrite.All"];
let pca = null;

export async function initAuth() {
  pca = new window.msal.PublicClientApplication({
    auth: {
      clientId: CONFIG.clientId,
      authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
      redirectUri: window.location.origin + window.location.pathname
    },
    cache: { cacheLocation: "localStorage" }
  });
  if (pca.initialize) await pca.initialize();
  const result = await pca.handleRedirectPromise();
  if (result && result.account) pca.setActiveAccount(result.account);
  const account = pca.getActiveAccount() || pca.getAllAccounts()[0] || null;
  if (account) pca.setActiveAccount(account);
  return account;
}

export function signIn() { return pca.loginRedirect({ scopes: SCOPES, prompt: "select_account" }); }
export function signOut() { return pca.logoutRedirect({ postLogoutRedirectUri: window.location.origin + window.location.pathname }); }

export async function getToken() {
  const account = pca.getActiveAccount();
  try {
    const r = await pca.acquireTokenSilent({ scopes: SCOPES, account });
    return r.accessToken;
  } catch (e) {
    await pca.acquireTokenRedirect({ scopes: SCOPES, account });
    throw e;
  }
}

export function currentUser() {
  const a = pca && pca.getActiveAccount();
  return a ? { id: a.localAccountId || a.homeAccountId, name: a.name || a.username, email: a.username } : null;
}
