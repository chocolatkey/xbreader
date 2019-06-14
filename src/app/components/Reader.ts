import m, {ClassComponent, Vnode} from "mithril";
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
import { parseDirection, directionToString } from "xbreader/helpers/utils";

export interface ReaderAttrs {
    cid: string;
    config: XBConfig;
}

export enum XBReadingDirection {
    LTR,
    RTL,
    TTB
}

interface BookStyle {
    overflow: string;
    direction: string;
    cursor: string;
    transform: string;
    transformOrigin: string;
}

export default class Reader implements ClassComponent<ReaderAttrs> {
    config: XBConfig;
    publication: Publication;
    guideHidden: boolean;
    guideHider: number;
    resizer: number;
    series: Series;
    mobile: boolean;
    r: number;
    ui: Ui;
    slider: Slider;
    hint: string;
    loadingStatus: string;
    loadingFailed: boolean;
    direction: XBReadingDirection;
    binder: Peripherals;

    constructor(vnode: Vnode<ReaderAttrs>) {
        this.config = window.xbconfig = Reader.mergeSettings(vnode.attrs.config);
        this.config.onMount(this);
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
        this.hint = "";

        this.loadingStatus = __("Initializing...");
        this.loadingFailed = false;

        window.addEventListener("orientationchange", this.resizeHandler);
        Platform.checkRequestAnimationFrame();
    }

    static mergeSettings(config: XBConfig) {
        return Object.assign({
            prefix: null,
            mount: document.body,
            preview: false,
            brand: {
                name: null,
                logo: null,
                embedded: false, // Whether to show interface meant for embedding in apps
            },
            tabs: [], // Tabs on right side of top bar
            guideHidden: false, // Skip showing the reading direction guide
            cdn: false, // What CDN to use. False = no CDN
            link: null, // WebPub URL to pass directly and load
            series: null, // Volume/Chapter data

            // Callback/Hooks
            loader: (identifier: string) => { return null }, // Custom loader for the webpub. Can return a URL, WebPub Object or Promise
            onMount: (reader: any) => {}, // As soon as this component is mounted
            onPublicationLoad: (reader: any) => {}, // Right after the publication is fully loaded
            onBeforeReady: (reader: any) => {}, // Right before final preparations are carried out
            onReady: (reader: any) => {}, // When redrawing has finished
            onPageChange: (pnum: number, direction: string, isSpread: boolean) => {}, // When page is changed
            onLastPage: (series: any) => true, // When trying to go further after the last page. If returns true, auto-advance
            onToggleInterface: () => {}, // When interface is shown/hidden
            onDRM: (loader: any, mixedSrc: any) => {}, // When images are protected, this function provides DRM capabilities
        }, config);
    }

    /**
     * To update the message shown during loading
     * @param {string} message 
     */
    updateStatus(message: string) {
        this.loadingStatus = message;
        m.redraw();
    }

    resizeHandler() {
        clearTimeout(this.resizer);
        this.resizer = setTimeout(() => {
            m.redraw();
            if(this.direction == XBReadingDirection.TTB && this.slider)
                this.slider.slideToCurrent();
        }, 50);
    }

    switchDirection(direction?: XBReadingDirection | string) {
        direction = parseDirection(direction);
        const pdir = this.publication.direction;
        if(direction == null) {
            if(!this.direction) {
                console.error("Can't switch directions if one isn't already set!");
                return false;
            }
            if(pdir == XBReadingDirection.TTB) { // Should not be encountered
                console.error("Vertical publications cannot be switched to a horizontal layout!");
                return false;
            }
            if(this.direction == XBReadingDirection.TTB) {
                this.switchDirection(pdir);
            } else {
                this.switchDirection(XBReadingDirection.TTB);
            }
            return true;
        }
        if(this.direction == direction) // Already that direction
            return true;
        console.log("Setting direction: " + directionToString(direction));
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
        case XBReadingDirection.LTR:
            this.direction = direction; // Left to right
            this.hint = this.hint + __("left-to-right");
            break;
        case XBReadingDirection.RTL:
            this.direction = direction; // Right to left
            this.hint = this.hint + __("right-to-left");
            break;
        case XBReadingDirection.TTB:
            this.direction = direction; // Top to bottom
            this.hint = __("Scroll down");
            if(!this.slider) {
                // TTB-only publication!
                console.log("TTB lock");
                this.slider.ttb = true;
            }
            this.slider.ttb = true;
            this.slider.rtl = false;
            this.slider.resizeHandler(true);
            if(sML.Mobile)
                this.slider.slideToCurrent(false, true);
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

    destroy() {
        this.onremove();
        m.mount(this.config.mount, null);
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
        
        // Remove reader listeners
        window.removeEventListener("orientationchange", this.resizeHandler);

        // Destroy classes & objects
        this.binder = this.slider = this.publication = this.series = this.ui = null;
    }

    oncreate(vnode: Vnode<ReaderAttrs, this>) {
        let manifestPointer = this.config.loader(vnode.attrs.cid);
        if(!manifestPointer)
            if(this.config.link)
                manifestPointer = this.config.link;
            else
                manifestPointer = vnode.attrs.cid + ".json";
        else if (!manifestPointer) {
            console.warn("No item specified");
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
            this.slider.binder = this.binder; // TODO improve
            this.switchDirection(this.publication.direction);
            this.config.onBeforeReady(this);
            m.redraw();
            setTimeout(() => {
                if(this.ui && !this.ui.mousing)
                    this.ui.toggle(false);
                m.redraw();
            }, 1500);
            this.config.onReady(this);
            console.log("Reader component created");
        }).catch((error: xbError | Error) => {
            console.error(error);
            if(typeof (error as xbError).export === "function") {
                (error as xbError).go();
            } else {
                const encodedMessage = encodeURIComponent(window.btoa(error.message ? error.message : error.toString()));
                m.route.set("/error/:code/:message", { code: (error as xbError).code ? (error as xbError).code : 9500, message: encodedMessage }, { replace: true });
            }
            return;
        });
    }

    view(vnode: Vnode<ReaderAttrs, this>) {
        const sldr = vnode.state.slider;
        if(!(vnode.state.publication && vnode.state.publication.ready))
            return m("div.br-loader__container", [
                m("div.spinner#br-loader__spinner"),
                m("span#br-loader__message", vnode.state.loadingStatus)
            ]);
        // Additional
        let bookStyle: BookStyle = {
            overflow: "hidden",//vnode.state.slider ? (vnode.state.slider.ttb ? "auto" : "hidden") : "hidden",
            direction: sldr ? (vnode.state.slider.rtl ? "rtl" : "ltr") : "ltr",
            //"overflow-y": vnode.state.slider ? (vnode.state.slider.perPage == 1 ? "scroll" : "auto") : "auto", // TODO SMALLS SCREEN!
            cursor: null,
            transform: null,
            transformOrigin: null
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

        const pages = vnode.state.publication.Spine.map((page, index) => {
            return m(Page, {
                data: page,
                key: page.Href,
                isImage: page.findFlag("isImage"),
                index: index,
                slider: sldr,
                drmCallback: this.config.onDRM,
                binder: bnd,
                blank: false
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
                    class: bnd ? (bnd.isPinching ? "pinching" : "normal") : "",
                    tabindex: -1, // Needed to be able to focus on this element (from peripherals)
                    oncontextmenu: (e: MouseEvent) => {
                        this.ui.toggle();
                        e.preventDefault();
                    },
                    ondblclick: (e: MouseEvent) => {
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
                class: "br-guide__" + directionToString(this.direction) + ((vnode.state.guideHidden || !vnode.state.publication.isReady) ? " hide" : "")
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