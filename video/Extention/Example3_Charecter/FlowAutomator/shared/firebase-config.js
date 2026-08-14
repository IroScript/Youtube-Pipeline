/**
 * Firebase client configuration for extension-side auth/firestore access.
 * Note: This is public client config (not a secret key).
 */
export const firebaseConfig = {
    apiKey: "AIzaSyBrGUFtypJ2jDYKKq_PUh0eDR6u_Ppc8_w",
    authDomain: "youtubsubcheck.firebaseapp.com",
    projectId: "youtubsubcheck",
    appId: "1:893441364470:web:b63d75281388997e6677d7",
    // Web OAuth fallback for Chromium browsers. Add each extension redirect URI
    // to this Google OAuth client of type "Web application".
    googleOAuthWebClientId: "893441364470-7obikvc7ci1kuphpfjo1eqf3kkjduuos.apps.googleusercontent.com",
    // Backwards-compatible alias for older popup code.
    edgeGoogleOAuthClientId: "893441364470-7obikvc7ci1kuphpfjo1eqf3kkjduuos.apps.googleusercontent.com"
};
