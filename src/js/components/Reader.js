import m from "mithril";
import Publication from "../models/Publication";
import Ui from "../models/Ui";
import Peripherals from "../helpers/peripherals";
import Slider from "./Slider";
import sML from "../helpers/sMLstub";
import Page from "./Page";
import Interface from "./Interface";
import Platform from "../helpers/platform";
import Series from "../models/Series";

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
        this.spread = true;
        this.hint = "";

        this.loadingStatus = __("Initializing...");
        this.loadingFailed = false;


        window.addEventListener("resize", this.resizeHandler);
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
            onReady: () => {}, // When reader is ready
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

    makeSlider(isTTB) {
        this.slider = new Slider({
            selector: "#br-book", // TODO dynamic
            duration: 200,
            easing: "ease-out",
            onChange: () => {
                if(this.binder)
                    this.guideHidden = true;
                this.zoomer.scale = 1;
                m.redraw();
                this.config.onPageChange(this.slider.currentSlide + (this.slider.single ? 1 : 0), this.direction, !this.slider.single);
            },
            onInit: () => {
                this.zoomer = {
                    scale: 1,
                    translate: {
                        X: 0,
                        Y: 0
                    },
                };
                m.redraw();
            },
            onLastPage: () => {
                if(this.config.onLastPage(this.series)) {
                    const next = this.series.next;
                    if(!next) { // No more chapters left
                        alert(__("Reached the end of this publication!"));
                        return;
                    }
                    // Go to next chapter
                    m.route.set("/:id", { id: next.uuid, }, { replace: false });
                }
            },
            increment: 2,
            startIndex: 0,
            threshold: 20,
            ttb: isTTB,
            fit: false,
            rtl: this.publication.rtl,
            shift: this.publication.shift,
            perPage: this.spread === true ? 2 : 1
        });
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
        if(this.zoomer) this.zoomer.scale = 1;
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
                this.makeSlider(true);
            }
            this.slider.config.ttb = true;
            this.slider.config.rtl = false;
            this.slider.resolveSlidesNumber();
            this.slider.destroy(true, () => {
                //this.binder.detachEvents();
                m.redraw(); // Need to redraw so items are in vertical alignment and we can ~slide~
                this.slider.slideToCurrent();
            });
            setTimeout(() => {
                this.binder.updateMovingParameters(this.direction);
                this.binder.detachEvents();
            });
            return true;
        default:
            this.hint = __("Unknown flow!");
            console.errror("Invalid flow direction: " + direction);
            return false;
        }
        // Horizontal (RTL or LTR)
        if(!this.slider) {
            this.makeSlider(false);
            console.log("Slider initialized");
        } else {
            this.slider.config.ttb = false;
            this.slider.config.rtl = this.publication.rtl;
            this.slider.resizeHandler();
            if (this.slider.currentSlide % 2 && !this.slider.single) // Prevent getting out of track
                this.slider.currentSlide++;
            this.slider.init();
            this.binder.attachEvents();
            this.binder.updateMovingParameters(this.direction);
        }
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
            this.slider.destroy(false);

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
            m.redraw();
            setTimeout(() => {
                this.series.setRelations();
                this.switchDirection(this.publication.direction);
                this.config.onBeforeReady(this);
                this.binder = new Peripherals(this);
                m.redraw();
                setTimeout(() => {
                    if(!this.ui.mousing)
                        this.ui.toggle(false);
                    m.redraw();
                }, 1500);
                this.config.onReady(this);
            }, 50); // TODO fix need for timeout when making Slider a mithril component
        }).catch(error => {
            if(typeof error.export === "function") {
                const exp = error.export();
                const encodedMessage = encodeURIComponent(window.btoa(exp.message));
                m.route.set("/error/:code/:message", { code: exp.code, message: encodedMessage }, { replace: true });
            } else {
                const encodedMessage = encodeURIComponent(window.btoa(error.message ? error.message : new String(error)));
                m.route.set("/error/:code/:message", { code: error.code ? error.code : 9500, message: encodedMessage }, { replace: true });
            }
            return;
        });
        console.log("Reader component created");
    }

    view(vnode) {
        if(!(vnode.state.publication && vnode.state.publication.ready))
            return m("div.br-loader__container", [
                m("div.spinner#br-loader__spinner"),
                m("span#br-loader__message", vnode.state.loadingStatus)
            ]);
        // Additional
        let bookStyle = {
            //overflow: vnode.state.slider ? (vnode.state.slider.config.ttb ? "auto" : "hidden") : "hidden",
            direction: vnode.state.slider ? (vnode.state.slider.config.rtl ? "rtl" : "ltr") : "ltr",
            //"overflow-y": vnode.state.slider ? (vnode.state.slider.config.perPage == 1 ? "scroll" : "auto") : "auto", // TODO SMALLS SCREEN!
        };

        document.documentElement.style.overflow = vnode.state.slider ? ((vnode.state.slider.config.ttb || vnode.state.slider.config.perPage === 1) ? "auto" : "hidden") : "hidden";

        // Cursor
        const bnd = vnode.state.binder;
        if(bnd) {
            bookStyle.cursor = bnd.cursor;
        }


        // Zoomer
        const zmr = vnode.state.zoomer;
        if(zmr) {
            bookStyle.transform = `scale(${zmr.scale})`;
            bookStyle.transformOrigin = `${zmr.translate.X}px ${zmr.translate.Y}px 0px`;
            if(zmr.scale > 1) {
                bookStyle.cursor = "move";
                document.documentElement.style.overflow = "hidden";
            }
        }

        // Rendering
        let rend = [
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
                        if(vnode.state.slider.config.ttb || !this.binder)
                            return;
                        this.binder.ondblclick(e);
                        e.preventDefault();
                    }
                }, vnode.state.publication.spine.map((page, index) => {
                    const items = [];
                    /*if (!index) // First push a blank
                        items.push(m(Page, {
                            data: page,
                            key: page.href,
                            blank: true,
                            float: "left",
                            slider: this.slider,
                        }));*/
                    items.push(m(Page, {
                        data: page,
                        key: page.href,
                        index: index,
                        slider: this.slider,
                        drmCallback: this.config.onDRM
                    }));
                    return items;
                })),
            ]),
            m("div.br-guide", {
                class: "br-guide__" + this.direction + ((vnode.state.guideHidden || !vnode.state.publication.isReady) ? " hide" : "")
            }, this.hint)
        ];
        if (this.publication.isReady && this.slider)
            rend.push(m(Interface, {
                reader: this,
                model: this.ui,
            }));
        return rend;
    }
}