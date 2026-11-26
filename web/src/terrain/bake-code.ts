/**
 * The code fingerprint baked ground is checked against (web/ground-bake-code.ts). The project's
 * Vite config replaces this module with the hash of the bake path's sources; a server started
 * without that config (some browser tests) keeps this placeholder, which no bake matches, so its
 * areas build their ground in the browser.
 */
const code: string = 'unhashed';
export default code;
