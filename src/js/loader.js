// Checks compatibility and loads XBReader in the appropriate language
// WARNING: Do not use ECMAScript syntax in this file to be safe!

var defaultLanguage = "en"; // Default language to use when no appropriate client language is detected
var supportedLanguages = [ // Language supported for XBReader
    "en",
    "ja",
    "de",
    "fr",
];

function getLanguage() {
    var naviLang = navigator.browserLanguage || navigator.language || navigator.userLanguage;
    if(typeof naviLang != "string") return defaultLanguage;
    var clientLanguage = navigator.language.split("-")[0];
    if(supportedLanguages.indexOf(clientLanguage) != -1)
        return clientLanguage;
    else
        return defaultLanguage;
}

// TODO no IE smaller than 10
document.addEventListener("DOMContentLoaded", function() {
    var reader = document.createElement("script");
    reader.src = "./bin/" + __NAME__ + "-" + getLanguage() + ".js?v=" + __VERSION__;
    document.head.appendChild(reader);
    reader.onload = function() {
        window.xbreader(window.xbconfig);
    };
});