import m from "mithril";
import Publication from "../models/Publication";
import Peripherals from "../helpers/peripherals";
import Slider from "./Slider";
import sML from "../helpers/sMLstub";
import Page from "./Page";
import Interface from "./Interface";
import Platform from "../helpers/platform";

export default class Reader {
    constructor() {
        this.r = Math.random();
        this.publication = new Publication();
        this.interface = new Interface(this);
        if (sML.OS.iOS || sML.OS.Android || sML.OS.WindowsPhone)
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
        this.guideHidden = false;
        window.addEventListener("resize", this.resizeHandler);
        window.addEventListener("orientationchange", this.resizeHandler);
        Platform.checkRequestAnimationFrame();
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
        this.guideHidden = false;
        clearTimeout(this.guideHider);
        this.guideHider = setTimeout(() => {
            if(this.guideHidden) return;
            this.guideHidden = true;
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
            if(this.slider) {
                this.slider.config.ttb = true;
                this.slider.config.rtl = false;
                this.slider.resolveSlidesNumber();
                this.slider.destroy(true, () => {
                    this.binder.detachEvents();
                    m.redraw(); // Need to redraw so items are in vertical alignment and we can ~slide~
                    this.slider.slideToCurrent();
                });
            }
            this.binder.updateMovingParameters(this.direction);
            return true;
        default:
            this.hint = "Unknown flow!";
            console.errror("Invalid flow direction: " + direction);
            return false;
        }
        // Horizontal (RTL or LTR)
        if(!this.slider) {
            this.slider = new Slider({
                selector: "#br-book",
                duration: 200,
                easing: "ease-out",
                onChange: () => {
                    this.guideHidden = true;
                    m.redraw();
                },
                onInit: () => {
                    m.redraw();
                },
                increment: 2,
                startIndex: 0,
                threshold: 20,
                ttb: false,
                fit: false,
                rtl: this.publication.rtl,
                perPage: this.spread ? 2 : 1 // TODO detect whether need spread
            });
            console.log("Slider initialized");
        } else {
            this.slider.config.ttb = false;
            this.slider.config.rtl = this.publication.rtl;
            this.slider.resizeHandler();
            if (this.slider.currentSlide % 2 && this.slider.perPage > 1) // Prevent getting out of track
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
                }, 1500);
            }, 0);
        }).catch(error => {
            console.error("Couldn't load publication");
            console.error(error);
            if(__DEV__)
                alert(error.stack);
            else
                alert("Publication loading failed!");
            // TODO popup error
        });
        console.log("Reader component created");
    }

    view(vnode) {
        const overflow = vnode.state.slider ? (vnode.state.slider.config.ttb ? "auto" : "hidden") : "hidden";
        const direction = vnode.state.slider ? (vnode.state.slider.config.rtl ? "rtl" : "ltr") : "ltr";
        let lastLandscapeIndex = 0;
        let rend = [
            m("div#br-main", {
                style: vnode.state.publication.isReady ? null : "visibility: hidden;"
            }, [
                m("div#br-book", {
                    style: `overflow: ${overflow}; direction: ${direction}`,
                    oncontextmenu: (e) => {
                        this.interface.toggle();
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
                        float: ((index - lastLandscapeIndex) % 2) ? "left" : "right",
                        slider: this.slider,
                    }));
                    if(page.width > page.height)
                        lastLandscapeIndex++;
                    return items;
                })),
            ]),
            m("div.br-guide", {
                class: "br-guide__" + this.direction + ((vnode.state.guideHidden || !vnode.state.publication.isReady) ? " hide" : "")
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