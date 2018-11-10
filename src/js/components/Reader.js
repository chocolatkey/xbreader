import m from "mithril";
import Publication from "../models/Publication";
import Ui from "../models/Ui";
import Slider from "../models/Slider";
import Peripherals from "../helpers/peripherals";
import sML from "../helpers/sMLstub";
import Spine from "./Spine";
import Page from "./Page";
import Interface from "./Interface";
import Platform from "../helpers/platform";
import Series from "../models/Series";
import xbError from "../models/xbError";

export default class Reader {
    constructor(vnode) {
        this.config = window.xbconfig = Reader.mergeSettings(vnode.attrs.config);
        this.guideHidden = this.config.guideHidden;
        this.r = Math.random();
        this.publication = new Publication();
        this.series = null;
        this.ui = new Ui(this.config.onToggleInterface);
        if (sML.Mobile)
            this.mobile = true;
        else
            this.mobile = false;
        if(sML.UA.InternetExplorer) {
            if(sML.UA.InternetExplorer == 10) {
                // No flex compatibility TODO
            } else if(sML.UA.InternetExplorer < 10) {
                // Not supported TODO
            }
                
        }
        this.direction = "auto"; // page-progression-direction
        this.hint = "";

        this.loadingStatus = __("Initializing...");
        this.loadingFailed = false;

        window.addEventListener("orientationchange", this.resizeHandler);
        Platform.checkRequestAnimationFrame();
    }

    static mergeSettings(config) {
        const settings = {
            brand: {
                name: null,
                logo: null
            },
            tabs: [], // Tabs on right side of top bar
            guideHidden: false, // Skip showing the reading direction guide
            cdn: false, // What CDN to use. False = no CDN
            link: null, // WebPub URL to pass directly and load
            series: null, // Volume/Chapter data

            // Callback/Hooks
            loader: () => {}, // Custom loader for the webpub. Can return a URL, WebPub Object or Promise
            onPublicationLoad: () => {}, // Right after the publication is fully loaded
            onBeforeReady: () => {}, // Right before final preparations are carried out
            onReady: () => {}, // When redrawing has finished
            onPageChange: () => {}, // When page is changed
            onLastPage: () => true, // When trying to go further after the last page. If returns true, auto-advance
            onToggleInterface: () => {}, // When interface is shown/hidden
            onDRM: () => {}, // When images are protected, this function provides DRM capabilities
        };

        for (const attrname in config) {
            settings[attrname] = config[attrname];
        }

        return settings;
    }

    /**
     * To update the message shown during loading
     * @param {string} message 
     */
    updateStatus(message) {
        this.loadingStatus = message;
        m.redraw();
    }

    resizeHandler() {
        clearTimeout(this.resizer);
        this.resizer = setTimeout(() => {
            m.redraw();
            if(this.direction == "ttb" && this.slider)
                this.slider.slideToCurrent();
        }, 50);
    }

    switchDirection(direction) {
        const pdir = this.publication.direction;
        if(direction == null) {
            if(!this.direction) {
                console.error("Can't switch directions if one isn't already set!");
                return false;
            }
            if(pdir == "ttb") { // Should not be encountered
                console.error("Vertical publications cannot be switched to a horizontal layout!");
                return false;
            }
            if(this.direction == "ttb") {
                this.switchDirection(pdir);
            } else {
                this.switchDirection("ttb");
            }
            return true;
        }
        if(this.direction == direction) // Already that direction
            return true;
        console.log("Setting direction: " + direction);
        if(this.slider.zoomer) this.slider.zoomer.scale = 1;
        this.guideHidden = this.config.guideHidden;
        clearTimeout(this.guideHider);
        this.guideHider = setTimeout(() => {
            if(this.guideHidden) return;
            this.guideHidden = true;
            m.redraw();
        }, 2000);
        this.hint = this.mobile ? __("Swipe or tap ") : __("Navigate ");
        switch (direction) {
        case "ltr":
            this.direction = "ltr"; // Left to right
            this.hint = this.hint + __("left-to-right");
            break;
        case "rtl":
            this.direction = "rtl"; // Right to left
            this.hint = this.hint + __("right-to-left");
            break;
        case "ttb":
            this.direction = "ttb"; // Top to bottom
            this.hint = __("Scroll down");
            if(!this.slider) {
                // TTB-only publication!
                console.log("TTB lock");
                this.slider.ttb = true;
            }
            this.slider.ttb = true;
            this.slider.rtl = false;
            this.slider.resizeHandler(true);
            // maybe settimeout?
            this.binder.updateMovingParameters(this.direction);
            return true;
        default: {
            console.error("Invalid flow direction: " + direction);
            const err = new xbError(9400, __("Invalid flow!"));
            this.hint = err.message;
            err.go();
            return false;
        }
        }
        // Horizontal (RTL or LTR)
        this.slider.ttb = false;
        this.slider.rtl = this.publication.rtl;
        if (this.slider.currentSlide % 2 && !this.slider.single) // Prevent getting out of track
            this.slider.currentSlide++;
        this.slider.resizeHandler(true);
        this.binder.attachEvents();
        this.binder.updateMovingParameters(this.direction);
        return true;
    }

    /**
     * Called when reader is being destroyed, for example when changing chapters
     */
    onremove() {
        // Slider and binder
        if(this.binder)
            this.binder.destroy();
        if(this.slider)
            this.slider.destroy();

        // Destroy classes & objects
        this.binder = this.slider = this.publication = this.series = this.ui = this.config = null;
    }

    oncreate(vnode) {
        let manifestPointer = this.config.loader(vnode.attrs.cid);
        if(!manifestPointer)
            if(this.config.link)
                manifestPointer = this.config.link;
            else
                manifestPointer = vnode.attrs.cid + ".json";
        else if (!manifestPointer) {
            console.warning("No item specified");
            m.route.set("/error/:code/:message", { code: 9400, message: __("No item specified") }, { replace: true });
            return;
        }
        this.updateStatus(__("Fetching info..."));
        this.publication.smartLoad(manifestPointer).then(() => {
            this.config.onPublicationLoad(this);
            this.series = new Series(this.publication, this.config.series);
            this.series.setRelations();
            this.slider = new Slider(this.series, this.publication, this.binder, this.config);
            this.binder = new Peripherals(this);
            this.switchDirection(this.publication.direction);
            this.config.onBeforeReady(this);
            m.redraw();
            setTimeout(() => {
                if(this.ui && !this.ui.mousing)
                    this.ui.toggle(false);
                m.redraw();
            }, 1500);
            this.config.onReady(this);
        }).catch(error => {
            if(typeof error.export === "function") {
                error.go();
            } else {
                const encodedMessage = encodeURIComponent(window.btoa(error.message ? error.message : new String(error)));
                m.route.set("/error/:code/:message", { code: error.code ? error.code : 9500, message: encodedMessage }, { replace: true });
            }
            return;
        });
        console.log("Reader component created");
    }

    view(vnode) {
        const sldr = vnode.state.slider;
        if(!(vnode.state.publication && vnode.state.publication.ready))
            return m("div.br-loader__container", [
                m("div.spinner#br-loader__spinner"),
                m("span#br-loader__message", vnode.state.loadingStatus)
            ]);
        // Additional
        let bookStyle = {
            overflow: "hidden",//vnode.state.slider ? (vnode.state.slider.ttb ? "auto" : "hidden") : "hidden",
            direction: sldr ? (vnode.state.slider.rtl ? "rtl" : "ltr") : "ltr",
            //"overflow-y": vnode.state.slider ? (vnode.state.slider.perPage == 1 ? "scroll" : "auto") : "auto", // TODO SMALLS SCREEN!
        };

        document.documentElement.style.overflow = sldr ? ((sldr.ttb || !sldr.spread) ? "auto" : "hidden") : "hidden";

        // Cursor
        const bnd = vnode.state.binder;
        if(bnd) {
            bookStyle.cursor = bnd.cursor;
        }


        // Zoomer
        const zmr = sldr ? sldr.zoomer : null;
        if(zmr) {
            bookStyle.transform = `scale(${zmr.scale})`;
            bookStyle.transformOrigin = `${zmr.translate.X}px ${zmr.translate.Y}px 0px`;
            if(zmr.scale > 1) {
                bookStyle.cursor = "move";
                document.documentElement.style.overflow = "hidden";
            }
        }

        const pages = vnode.state.publication.spine.map((page, index) => {
            return m(Page, {
                data: page,
                key: page.href,
                isImage: page.xbr.isImage,
                index: index,
                slider: sldr,
                drmCallback: this.config.onDRM,
                binder: bnd
            });
            //return items;
        });

        // Rendering
        const rend = [
            m("div#br-main", {
                style: vnode.state.publication.isReady ? null : "visibility: hidden;"
            }, [
                m("div#br-book", {
                    style: bookStyle,
                    tabindex: -1, // Needed to be able to focus on this element (from peripherals)
                    oncontextmenu: (e) => {
                        this.ui.toggle();
                        e.preventDefault();
                    },
                    ondblclick: (e) => {
                        if(vnode.state.slider.ttb || !bnd)
                            return;
                        bnd.ondblclick(e);
                        e.preventDefault();
                    },
                    onclick: bnd ? bnd.onclick : null,
                    ontouchend: bnd ? bnd.mtimerUpdater : null,
                    onmouseup: bnd ? bnd.mtimerUpdater : null,
                    onmousedown: bnd ? bnd.mtimerUpdater : null,
                    onmousemove: bnd ? bnd.mousemoveHandler : null,
                    ontouchmove: bnd ? bnd.touchmoveHandler : null,
                }, m(Spine, {
                    slider: sldr,
                    binder: bnd
                }, pages)),
            ]),
            m("div.br-guide", {
                class: "br-guide__" + this.direction + ((vnode.state.guideHidden || !vnode.state.publication.isReady) ? " hide" : "")
            }, this.hint)
        ];
        if (this.publication.isReady && this.slider)
            rend.push(m(Interface, {
                reader: this,
                model: this.ui,
                slider: this.slider
            }));
        return rend;
    }
}