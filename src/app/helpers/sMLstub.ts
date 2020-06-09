/*!
 *                                                                                                                         (℠)
 *  # sML.js | I'm a Simple and Middling Library.
 *
 *  * Copyright (c) Satoru MATSUSHIMA - https://github.com/satorumurmur/sML
 *  * Licensed under the MIT license. - http://www.opensource.org/licenses/mit-license.php
 *
 * Portions of this code come from the sML library
 */

declare interface OSFlags {
    iOS: number;
    macOS: number;
    WindowsPhone: number;
    Windows: number;
    Android: number;
    Chrome: boolean;
    Linux: boolean;
    Firefox: boolean;
}

declare interface UAFlags {
    Gecko: number;
    Firefox: number;
    Opera: number;
    Silk: number;
    Chrome: number | boolean;
    Chromium: number | boolean;
    Safari: number;
    Edge: number;
    Blink: number | boolean;
    WebKit: number;
    Trident: number;
    InternetExplorer: number;
    Flash: number;
}

class sML {
    OperatingSystem: OSFlags;
    OS: OSFlags; // Synonym for above
    UserAgent: UAFlags;
    UA: UAFlags; // Synonym for above
    Environments: string[];
    Env: string[]; // Synonym for above
    Mobile: boolean;

    constructor() {
        const nUA = navigator.userAgent;
        const getVersion = (Prefix: string, Reference?: string) => parseFloat(nUA.replace(new RegExp("^.*" + Prefix + "[ :\\/]?(\\d+([\\._]\\d+)?).*$"), Reference ? Reference : "$1").replace(/_/g, ".")) || undefined;

        this.OperatingSystem = this.OS = ((OS: OSFlags) => {
            if(/ \(iP(hone|ad|od touch);/.test(nUA)) OS.iOS     = getVersion("CPU (iPhone )?OS", "$2");
            else if(      /Mac OS X 10[\._]\d/.test(nUA)) OS.macOS   = getVersion("Mac OS X ");
            else if(  /Windows Phone( OS)? \d/.test(nUA)) OS.WindowsPhone = getVersion("Windows Phone OS") || getVersion("Windows Phone");
            else if(        /Windows( NT)? \d/.test(nUA)) OS.Windows = (W => W >= 10 ? W : W >= 6.3 ? 8.1 : W >= 6.2 ? 8 : W >= 6.1 ? 7 : W)(getVersion("Windows NT") || getVersion("Windows"));
            else if(              /Android \d/.test(nUA)) OS.Android = getVersion("Android");
            else if(                    /CrOS/.test(nUA)) OS.Chrome  = true;
            else if(                    /X11;/.test(nUA)) OS.Linux   = true;
            else if(                 /Firefox/.test(nUA)) OS.Firefox = true;
            return OS;
        })({} as OSFlags);

        this.Mobile = (this.OS.iOS || this.OS.Android || this.OS.WindowsPhone) ? true : false;

        this.UserAgent = this.UA = ((UA: UAFlags) => {
            if(/Gecko\/\d/.test(nUA)) {
                UA.Gecko = getVersion("rv");
                if(/Firefox\/\d/.test(nUA)) UA.Firefox = getVersion("Firefox");
                //UA.VendorPrefix = "moz";
            } else if(/Edge\/\d/.test(nUA)) {
                UA.Edge = getVersion("Edge");
                //UA.VendorPrefix = "$1";
            } else if(/Chrom(ium|e)\/\d/.test(nUA)) {
                UA.Chromium = getVersion("Chromium") || getVersion("Chrome") || true;
                if( /Edg\/\d/.test(nUA)) UA.Edge   = getVersion("Edg");
                else if( /OPR\/\d/.test(nUA)) UA.Opera  = getVersion("OPR");
                else if(/Silk\/\d/.test(nUA)) UA.Silk   = getVersion("Silk");
                else                          UA.Chrome = getVersion("Chrome") || UA.Chromium;
                //UA.VendorPrefix = '';
            } else if(/AppleWebKit\/\d/.test(nUA)) {
                UA.WebKit = getVersion("AppleWebKit");
                if(   /CriOS \d/.test(nUA)) UA.Chrome  = getVersion("CriOS");
                else if(   /FxiOS \d/.test(nUA)) UA.Firefox = getVersion("FxiOS");
                else if( /EdgiOS\/\d/.test(nUA)) UA.Edge    = getVersion("EdgiOS");
                else if(/Version\/\d/.test(nUA)) UA.Safari  = getVersion("Version");
                //UA.VendorPrefix = "webkit";
            } else if(/Trident\/\d/.test(nUA)) {
                UA.Trident          = getVersion("Trident"); 
                UA.InternetExplorer = getVersion("rv") || getVersion("MSIE");
                //UA.VendorPrefix = "ms";
            }
            //try { UA.Flash = parseFloat(navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin.description.replace(/^.+?([\d\.]+).*$/, '$1')); } catch(Err) {}
            return UA;
        })({} as UAFlags);

        this.Environments = this.Env = ["OperatingSystem", "UserAgent"].reduce((Env, OS_UA) => { for(const Param in (this as any)[OS_UA]) if((this as any)[OS_UA][Param]) Env.push(Param); return Env; }, []);
    }

    edit(Obj: object | HTMLElement, ...ProSets: any) {
        const l = ProSets.length;
        if((Obj as HTMLElement).tagName) {
            for(let i = 0; i < l; i++) { const ProSet = ProSets[i];
                for(const Pro in ProSet) {
                    if(Pro === "$1" || Pro === "style") continue;
                    if(/^data-/.test(Pro)) (Obj as HTMLElement).setAttribute(Pro, ProSet[Pro]);
                    else                   (Obj as any)[Pro] = ProSet[Pro];
                }
                if(ProSet.on) for(const EN in ProSet.on) (Obj as HTMLElement).addEventListener(EN, ProSet.on[EN]);
                //if(ProSet.style) this.CSS.setStyle(Obj, ProSet.style);
            }
        } else {
            for(let i = 0; i < l; i++) { const ProSet = ProSets[i];
                for(const Pro in ProSet) (Obj as any)[Pro] = ProSet[Pro];
            }
        }
        return Obj;
    }
}

export default (new sML);