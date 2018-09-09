import m from "mithril";
import Publication from "../models/Publication";
import Peripherals from "../helpers/peripherals";
import Slider from "./Slider";
import sML from "../helpers/sMLstub";
import Page from "./Page";
import Interface from "./Interface";
import Platform from "../helpers/platform";

export default class Reader {
    constructor(config) {
        this.config = Reader.mergeSettings(config);
        this.r = Math.random();
        this.publication = new Publication();
        this.interface = new Interface(this);
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
        window.addEventListener("resize", this.resizeHandler);
        window.addEventListener("orientationchange", this.resizeHandler);
        Platform.checkRequestAnimationFrame();
    }

    static mergeSettings(config) {
        const settings = { // TODO
            next: null,
            previous: null,
            direction: "auto",
            spread: "spread",
            guideHidden: false
        };

        const userSttings = config;
        for (const attrname in userSttings) {
            settings[attrname] = userSttings[attrname];
        }

        return settings;
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
                this.config.guideHidden = true;
                this.zoomer.scale = 1;
                m.redraw();
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
            increment: 2,
            startIndex: 0,
            threshold: 20,
            ttb: isTTB,
            fit: false,
            rtl: this.publication.rtl,
            shift: this.publication.shift,
            perPage: this.spread ? 2 : 1 // TODO detect whether need spread
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
        this.config.guideHidden = false;
        clearTimeout(this.guideHider);
        this.guideHider = setTimeout(() => {
            if(this.config.guideHidden) return;
            this.config.guideHidden = true;
            m.redraw();
        }, 2000);
        this.hint = this.mobile ? "Swipe or tap " : "Navigate ";
        switch (direction) {
        case "ltr":
            this.direction = "ltr"; // Left to right
            this.hint = this.hint + "left-to-right";
            break;
        case "rtl":
            this.direction = "rtl"; // Right to left
            this.hint = this.hint + "right-to-left";
            break;
        case "ttb":
            this.direction = "ttb"; // Top to bottom
            this.hint = "Scroll down";
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
            this.hint = "Unknown flow!";
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

    oncreate(vnode) {
        vnode.item = vnode.attrs.uuid;
        if (!vnode.item) {
            console.error("No item specified!");
            return;
        }
        //console.dir(vnode)
        this.publication.load(vnode.item + ".json").then(() => {
            setTimeout(() => {
                this.switchDirection(this.publication.direction);
                this.binder = new Peripherals(this);
                m.redraw();
                setTimeout(() => {
                    this.interface.toggle(false);
                    m.redraw();
                }, 1500);
            }, 0);
        }).catch(error => {
            console.error(error);
            if(__DEV__)
                alert(error) && console.error(error.stack);
            else
                alert("Failed to load publication!");
            m.route.set("/error/:code/:message", { code: 9500, message: "Couldn't load publication" });
            return;
        });
        console.log("Reader component created");
    }

    view(vnode) {
        let bookStyle = {
            overflow: vnode.state.slider ? (vnode.state.slider.config.ttb ? "auto" : "hidden") : "hidden",
            direction: vnode.state.slider ? (vnode.state.slider.config.rtl ? "rtl" : "ltr") : "ltr",
            "overflow-y": vnode.state.slider ? (vnode.state.slider.config.perPage == 1 ? "scroll" : "auto") : "auto", // TODO SMALLS SCREEN!
        };

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
            bookStyle.cursor = zmr.scale > 1 ? "move" : bookStyle.cursor;
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
                        this.interface.toggle();
                        e.preventDefault();
                    },
                    ondblclick: (e) => {
                        if(vnode.state.slider.config.ttb || !this.binder)
                            return;
                        this.binder.ondblclick(e);
                        e.preventDefault();
                    }
                }, vnode.state.publication.spine.map((page, index) => {
                    let items = [];
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
                    }));
                    return items;
                })),
            ]),
            m("div.br-guide", {
                class: "br-guide__" + this.direction + ((vnode.state.config.guideHidden || !vnode.state.publication.isReady) ? " hide" : "")
            }, this.hint)
        ];
        if (this.publication.isReady && this.slider)
            rend.push(m(this.interface, {
                reader: this
            }));
        //console.log("rerendered");
        return rend;
    }
}