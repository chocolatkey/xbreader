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
    Safari: number;
    Edge: number;
    Blink: number | boolean;
    WebKit: number;
    Trident: number;
    InternetExplorer: number;
    Flash: number;
}

class sML {
    [key: string]: any;

    constructor() {
        const nUA = navigator.userAgent;
        let getVersion = function(Prefix: string, Reference?: string): number {
            let N = parseFloat(nUA.replace(new RegExp("^.*" + Prefix + "[ :\\/]?(\\d+([\\._]\\d+)?).*$"), Reference ? Reference : "$1").replace(/_/g, "."));
            return (!isNaN(N) ? N : undefined);
        };

        this.Language = (() => {
            if(typeof navigator.language != "string") return "en";
            return (navigator.language.split("-")[0] == "ja") ? "ja" : "en";
        })();

        this.OperatingSystem = this.OS = ((OS: OSFlags) => {
            if(/iP(hone|ad|od( touch)?);/.test(nUA)) OS.iOS          = getVersion("CPU (iP(hone|ad|od( touch)?) )?OS", "$4");
            else if(          /OS X 10[\._]\d/.test(nUA)) OS.macOS        = getVersion("OS X ");
            else if(  /Windows Phone( OS)? \d/.test(nUA)) OS.WindowsPhone = getVersion("Windows Phone OS") || getVersion("Windows Phone");
            else if(        /Windows( NT)? \d/.test(nUA)) OS.Windows      = (function(W) { return (W >= 10 ? W : W >= 6.3 ? 8.1 : W >= 6.2 ? 8 : W >= 6.1 ? 7 : W); })(getVersion("Windows NT") || getVersion("Windows"));
            else if(              /Android \d/.test(nUA)) OS.Android      = getVersion("Android");
            else if(                    /CrOS/.test(nUA)) OS.Chrome       = true;
            else if(                    /X11;/.test(nUA)) OS.Linux        = true;
            else if(                 /Firefox/.test(nUA)) OS.Firefox      = true;
            return OS;
        })({} as OSFlags);

        this.Mobile = (this.OS.iOS || this.OS.Android || this.OS.WindowsPhone) ? true : false;

        this.UserAgent = this.UA = ((UA: UAFlags) => {
            if(/Gecko\/\d/.test(nUA)) {
                UA.Gecko = getVersion("rv");
                if(/Firefox\/\d/.test(nUA)) UA.Firefox = getVersion("Firefox");
            } else if(/Edge\/\d/.test(nUA)) {
                UA.Edge = getVersion("Edge");
            } else if(/Chrome\/\d/.test(nUA)) {
                UA.Blink = getVersion("Chrome") || true;
                if( /OPR\/\d/.test(nUA)) UA.Opera  = getVersion("OPR");
                else if(/Silk\/\d/.test(nUA)) UA.Silk   = getVersion("Silk");
                else                          UA.Chrome = UA.Blink;
            } else if(/AppleWebKit\/\d/.test(nUA)) {
                UA.WebKit = getVersion("AppleWebKit");
                if(   /CriOS \d/.test(nUA)) UA.Chrome  = getVersion("CriOS");
                else if(   /FxiOS \d/.test(nUA)) UA.Firefox = getVersion("FxiOS");
                else if(/Version\/\d/.test(nUA)) UA.Safari  = getVersion("Version");
            } else if(/Trident\/\d/.test(nUA)) {
                UA.Trident          = getVersion("Trident"); 
                UA.InternetExplorer = getVersion("rv") || getVersion("MSIE");
            }
            try { UA.Flash = parseFloat((navigator.mimeTypes["application/x-shockwave-flash" as any] as any).enabledPlugin.description.replace(/^.+?([\d\.]+).*$/, "$1")); } catch(e) {}
            return UA;
        })({} as UAFlags);

        this.Environments = this.Env = ((Env: number[]) => {
            ["OS", "UA"].forEach((OS_UA) => { for(let Param in this[OS_UA]) if(Param != "Flash" && this[OS_UA][Param]) Env.push(parseInt(Param)); });
            return Env;
        })([]);
    }

    edit(Obj: any, Pros: any, Sty?: CSSStyleDeclaration) {
        for(let Pro in Pros) {
            if(Pro == "on" || Pro == "extraHTML") continue;
            if(/^data-/.test(Pro)) Obj.setAttribute(Pro, Pros[Pro]);
            else                   (Obj as any)[Pro] = Pros[Pro];
        }
        if(Pros) {
            if(Pros.extraHTML) Obj.innerHTML = Obj.innerHTML + Pros.extraHTML;
            if(Pros.on) this.Event.add(Obj, Pros.on);
            if(Sty) this.CSS.set(Obj, Sty);
        }
        return Obj;
    }
}

export default (new sML);