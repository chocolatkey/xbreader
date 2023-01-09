import { t } from "ttag";
import m, { ClassComponent, Vnode, VnodeDOM } from "mithril";
import Publication from "xbreader/models/Publication";
import Ui from "xbreader/models/Ui";
import Slider from "xbreader/models/Slider";
import Peripherals from "xbreader/helpers/peripherals";
import sML from "xbreader/helpers/sMLstub";
import Spine from "./Spine";
import ReflowableSpine from "./ReflowableSpine";
import Page from "./Page";
import Interface from "./Interface";
import Series from "xbreader/models/Series";
import xbError from "xbreader/models/xbError";
import { parseDirection, directionToString } from "xbreader/helpers/utils";
import Config, { RenderConfig } from "xbreader/models/Config";
import { worker as workerPool, f as workerFunc, chooserFunction } from "xbreader/helpers/lazyLoader";
import Loader from "../partials/Loader";

export interface ReaderAttrs {
    readonly cid: string;
    readonly config: XBConfig;
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
    background: string;
    color: string;
}

export default class Reader implements ClassComponent<ReaderAttrs> {
    readonly config: Config;
    publication: Publication;
    guideHidden: boolean;
    guideHider: number;
    series: Series;
    private readonly mobile: boolean;
    ui: Ui;
    slider: Slider;
    private hint: string;
    private loadingStatus: string;
    loadingFailed: boolean;
    direction: XBReadingDirection;
    private binder: Peripherals;

    constructor(vnode: Vnode<ReaderAttrs>) {
        this.config = new Config(vnode.attrs.config);
        this.config.state.onMount(this);
        this.guideHidden = this.config.state.guideHidden;
        this.publication = new Publication();
        this.series = null;
        this.ui = new Ui(this.config.state.onToggleInterface);
        if (sML.Mobile)
            this.mobile = true;
        else
            this.mobile = false;
        if(sML.UA.InternetExplorer) {
            if(sML.UA.InternetExplorer === 10) {
                // No flex compatibility TODO
            } else if(sML.UA.InternetExplorer < 10) {
                // Not supported TODO
            } 
        }
        this.hint = "";

        this.loadingStatus = t`Initializing...`;
        this.loadingFailed = false;
    }

    /**
     * To update the message shown during loading
     * @param {string} message 
     */
    updateStatus(message: string) {
        this.loadingStatus = message;
        m.redraw();
    }

    setTitle(title?: string) {
        if(!this.config.state.brand.titled) return;
        const bn = this.config.state.brand.name;
        if(bn)
            document.title = title ? `${title} - ${bn}` : title;
        else
            document.title = title ? title : __NAME__;
    }

    switchDirection(direction?: XBReadingDirection | string) {
        direction = parseDirection(direction);
        const pdir = this.publication.direction;
        if(direction === undefined) {
            if(this.direction === undefined) {
                console.error("Can't switch directions if one isn't already set!");
                return false;
            }
            if(pdir === XBReadingDirection.TTB) { // Should not be encountered
                console.error("Vertical publications cannot be switched to a horizontal layout!");
                return false;
            }
            if(this.direction === XBReadingDirection.TTB) {
                this.switchDirection(pdir);
            } else {
                this.switchDirection(XBReadingDirection.TTB);
            }
            return true;
        }
        if(this.direction === direction) // Already that direction
            return true;
        console.log("Setting direction: " + directionToString(direction));
        if(this.slider.zoomer) this.slider.zoomer.scale = 1;
        this.guideHidden = this.config.state.guideHidden;
        clearTimeout(this.guideHider);
        this.guideHider = window.setTimeout(() => {
            if(this.guideHidden) return;
            this.guideHidden = true;
            m.redraw();
        }, 2000);
        this.hint = this.mobile ? t`Swipe or tap` : t`Navigate`;
        switch (direction) {
            case XBReadingDirection.LTR:
                this.direction = direction; // Left to right
                this.hint = t`${this.hint} left-to-right`;
                break;
            case XBReadingDirection.RTL:
                this.direction = direction; // Right to left
                this.hint = t`${this.hint} right-to-left`;
                break;
            case XBReadingDirection.TTB: {
                this.direction = direction; // Top to bottom
                this.hint = t`Scroll down`;
                if(!this.slider) {
                    // TTB-only publication!
                    console.log("TTB lock");
                    this.slider.ttb = true;
                }
                // Coming from spreads
                const p = this.slider.minViewingPage;
                if(p !== this.slider.currentSlide) this.slider.currentSlide = p;

                this.slider.ttb = true;
                this.slider.rtl = false;
                this.slider.resizeHandler(true);
                if(this.mobile)
                    this.slider.slideToCurrent(false, true);
                // maybe settimeout?
                this.binder.updateMovingParameters(this.direction);
                return true;
            } default: {
                console.error("Invalid flow direction: " + direction);
                const err = new xbError(9400, t`Invalid flow!`);
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
        m.mount(this.config.state.mount, null); // Unmount XBReader
        document.documentElement.style.removeProperty("overflow"); // TODO stop polluting the document in the first place
        workerPool?.destroy(); // Terminate all Workers in the pool
    }

    oninit() {
        if(workerPool?.destroyed) // If the pool was previousy destroyed
            workerPool.create(URL.createObjectURL(new Blob([`(${workerFunc})()`])));
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
        this.binder = this.slider = this.publication = this.series = this.ui = null;
    }

    oncreate(vnode: VnodeDOM<ReaderAttrs, this>) {
        let manifestPointer: unknown | string = this.config.state.loader(vnode.attrs.cid);
        if(!manifestPointer)
            if(this.config.state.link)
                manifestPointer = this.config.state.link;
            else
                manifestPointer = vnode.attrs.cid + ".json";

        if (!manifestPointer) {
            console.warn("No item specified");
            m.route.set("/error/:code/:message", { code: 9400, message: t`No item specified` }, { replace: true });
            return;
        }
        this.updateStatus(t`Fetching info...`);
        this.setTitle(t`Loading...`);
        this.publication.smartLoad(manifestPointer).then(() => {
            this.config.state.onPublicationLoad(this);
            if(!this.publication) {
                // Happens if you quickly change to another publication while this one is still loading
                console.warn("Publication loaded, but no longer exists");
                return;
            }
            this.series = new Series(this.publication, this.config.state.series);
            this.series.setRelations();
            this.slider = new Slider(this.series, this.publication, this.binder, this.config);
            this.binder = new Peripherals(this); 
            this.slider.binder = this.binder; // TODO improve
            this.switchDirection(this.publication.direction);//this.config.overrideDirection(this.publication.direction));
            this.config.state.onBeforeReady(this);
            m.redraw();
            window.setTimeout(() => {
                if(this.ui && !this.ui.mousing)
                    this.ui.toggle(false);
                m.redraw();
            }, 1500);
            if(this.publication.Metadata.Title)
                this.setTitle(this.publication.Metadata.Title as string);
            else
                this.setTitle();
            this.config.state.onReady(this);
            console.log("Reader component created");
        }).catch((error: xbError | Error) => {
            if(typeof (error as xbError).export === "function") {
                (error as xbError).go();
            } else {
                console.error(error);
                const encodedMessage = encodeURIComponent(window.btoa(error.message ? error.message : error.toString()));
                m.route.set("/error/:code/:message", { code: (error as xbError).code ? (error as xbError).code : 9500, message: encodedMessage }, { replace: true });
            }
            return;
        });
    }

    view(vnode: Vnode<ReaderAttrs, this>) {
        const sldr = vnode.state.slider;
        //console.log("VIEWR", vnode.state.publication, vnode.state.publication.ready);
        if(!(vnode.state.publication && vnode.state.publication.ready))
            return m(Loader, {
                status: vnode.state.loadingStatus
            });
        // Additional
        const bookStyle: BookStyle = {
            overflow: "hidden",//vnode.state.slider ? (vnode.state.slider.ttb ? "auto" : "hidden") : "hidden",
            direction: sldr ? (vnode.state.slider.rtl ? "rtl" : "ltr") : "ltr",
            //"overflow-y": vnode.state.slider ? (vnode.state.slider.perPage === 1 ? "scroll" : "auto") : "auto", // TODO SMALLS SCREEN!
            cursor: null,
            transform: null,
            transformOrigin: null,
            background: this.config.background,
            color: this.config.foreground
        };
        (sldr.reflowable && !sldr.ttb) && Object.assign(bookStyle, {
            height: "100%"
        });

        document.documentElement.style.overflow = sldr ? ((sldr.ttb || !sldr.spread) ? "auto" : "hidden") : "hidden";

        // Cursor
        const bnd = vnode.state.binder;
        let bookClass = "normal";
        if(bnd) {
            const cursr = bnd.cursor;
             // Only Windows doesn't have single-direction resize cursors. Firefox still blurs them in HighDPI
            if(sML.OS.Windows && !(sML.UA.Firefox && window.devicePixelRatio > 1) && (cursr.endsWith("-resize") || cursr === "context-menu"))
                bookClass += ` cursor__${bnd.cursor}`;
            else
                bookStyle.cursor = cursr;
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

        // Rendering
        const rend = [
            m("div.br__notifier", {
                class: this.ui.notifierShown ? null : "hide"
            }, this.ui.notification),
            m("div#br-main", {
                style: {
                    visibility: vnode.state.publication.isReady ? "visible" : "hidden",
                    background: this.config.background,
                    color: this.config.foreground
                },
                "aria-label": t`Content`
            }, [
                m("div#br-book", {
                    style: bookStyle,
                    "aria-label": t`Book`,
                    class: bnd ? (bnd.isPinching ? "pinching" : bookClass) : "",
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
                    ontouchmove: bnd ? bnd.touchmoveHandler : null
                }, sldr.reflowable ? m(ReflowableSpine, {
                    slider: sldr,
                    binder: bnd,
                    config: this.config,
                    spine: vnode.state.publication.Spine
                }) : m(Spine, {
                    slider: sldr,
                    binder: bnd
                }, vnode.state.publication.Spine.map((page, index) => m(Page, {
                    data: page,
                    key: page.Href,
                    isImage: page.findFlag("isImage"),
                    index: index,
                    slider: sldr,
                    renderConfig: this.config.state.render as RenderConfig,
                    chooseCallback: this.config.state.onSource as chooserFunction,
                    binder: bnd,
                    blank: false
                }))))
            ]),
            m("div.br-guide", {
                class: "br-guide__" + directionToString(this.direction) + ((vnode.state.guideHidden || !vnode.state.publication.isReady) ? " hide" : ""),
                "aria-label": t`Reading Guide`
            }, this.hint)
        ];
        if (this.publication.isReady && this.slider)
            rend.push(m(Interface, {
                reader: this,
                model: this.ui,
                slider: this.slider,
                config: this.config
            }));
        return rend;
    }
}