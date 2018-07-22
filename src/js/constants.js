// TODO move to config file!

export const DEBUG = true; // Are we debugging?
const GLOBAL_BASE = "";
export const API_BASE = GLOBAL_BASE + "/api"; // Base for API
export const API_HEADERS = {
    "Accept": "application/json, text/plain, */*"
    //Cache-Control: max-age=3600
};
export const STATIC_BASE = GLOBAL_BASE + "/static"; // Base for static assets
export const READER_BASE = GLOBAL_BASE + "/r"; // Base URL on domain for the reader
export function seriesLink(slug) {
    return READER_BASE + "/series/" + slug + "/";
}
export function readerLink(uuid) {
    return READER_BASE + "/read/" + uuid + "/";
}
export const READER_VERSION = "0.0.1"; // Don't change unless you modify the code
export const PLACEHOLDER = "/static/img/placeholder.svg"; // Placeholder for images that haven't loaded
export const CREDITS = 2; // Position of credits page. 0 = none
export const COMMENTS = "whimsubs"; // Either disqus code or false/null
export const DISCORD = "415371905067909132"; // Discord group ID, optional
export const USECDN = false; // Use CDNs for images