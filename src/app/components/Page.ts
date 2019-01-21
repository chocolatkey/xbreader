import m, {ClassComponent, Vnode} from "mithril";
import SmartLoader from "../helpers/lazyLoader";
import Link from "xbreader/models/Link";
import Slider from "xbreader/models/Slider";
import Peripherals, { BibiMouseEvent } from "xbreader/helpers/peripherals";
export const MAX_FIT_WIDTH = 1400;
export const MAX_FIT_HEIGHT = 1000;

export interface PageAttrs {
    data: Link;
    isImage: boolean;
    blank: boolean;
    index: number;
    slider: Slider;
    drmCallback: Function;
    binder: Peripherals;
}

interface InnerItemAttrs {
    style: Object;
}

export default class Page implements ClassComponent<PageAttrs> {

    itemHeight: number | string;
    itemWidth: number | string;
    marginLeft: number;
    marginRight: number;
    marginTop: number;

    data: Link;
    blank: boolean;
    loader: SmartLoader;
    drmed: boolean;


    parseDimension(val: number | string) {
        if(isNaN(val as number))
            return "auto";
        else
            return val + "px";
    }

    get styles() {            
        return `\
        height: ${this.parseDimension(this.itemHeight)};\
        width: ${this.parseDimension(this.itemWidth)};\
        float: ${this.float};\
        margin-left: ${this.marginLeft}px;\
        margin-right: ${this.marginRight}px;\
        margin-top: ${this.marginTop}px;`;
    }

    get float() {
        if(this.blank) return "right"; // If blank position on left (for now)

        // Get reverse of page alignment
        if(this.data.Properties.Page === "left")
            return "right";
        if(this.data.Properties.Page === "right")
            return "left";
        return this.data.Properties.Page;
    }

    get landscape() {
        return this.data.Properties.Orientation === "landscape" ? true : false;
    }

    oninit(vnode: Vnode<PageAttrs, this>) {
        this.data = vnode.attrs.data;
        this.drmed = (this.data.Properties && this.data.Properties.Encrypted) ? true : false;
        if (vnode.attrs.blank)
            this.blank = true;
        else
            this.loader = new SmartLoader(this.data, vnode.attrs.index, vnode.attrs.drmCallback);
    }


    view(vnode: Vnode<PageAttrs, this>) {
        const slider = vnode.attrs.slider;
        let spread = true;
        let free = false;
        let docWidth = document.documentElement.clientWidth || document.body.clientWidth;
        const docHeight = this.itemHeight = window.innerHeight;
        if (slider) {
            docWidth = document.documentElement.clientWidth; // Other
            if (slider.single || slider.ttb || this.landscape)
                spread = false;
            if (slider.ttb && this.landscape) {
                this.itemHeight = Math.min(this.data.Height, docHeight);
                free = true;
            }
        }
        this.marginLeft = this.marginRight = this.marginTop = 0;
        this.itemWidth = (this.itemHeight / this.data.Height) * this.data.Width;
        if (((this.itemWidth * 2) > docWidth && docHeight <= docWidth) && (!this.landscape || spread)) {
            this.itemWidth = docWidth / 2;
            this.itemHeight = (this.itemWidth / this.data.Width) * this.data.Height;
            this.marginTop = free ? 0 : (docHeight - this.itemHeight) / 2;
        }
        if (docHeight > docWidth || !spread) { // Single page view
            if (docWidth < this.itemWidth) {
                this.itemWidth = docWidth;
                this.itemHeight = (this.itemWidth / this.data.Width) * this.data.Height;
            }
            this.marginTop = free ? 0 : (docHeight - this.itemHeight) / 2; // Vertical align to center in horizontal
            if (this.float === "left")
                this.marginLeft = (docWidth - this.itemWidth) / 2;
            else if (this.float === "right" || this.float === "center")
                this.marginRight = (docWidth - this.itemWidth) / 2;
        }

        let itemAttrs: InnerItemAttrs = {style: null};
        if (slider && (slider.ttb || slider.single)) { // Vertical (TTB) or forced single page
            if(slider.publication.isTtb && (this.data.Height / this.data.Width) > 2) { // TTB publication or very tall image
                if(this.data.Height > MAX_FIT_HEIGHT && !this.landscape && this.data.Width < docWidth) { // Too large to fit, compromise with maxFit
                    this.itemHeight = "auto";
                    this.itemWidth = MAX_FIT_HEIGHT;
                } else { // Maximum image width
                    this.itemWidth = docWidth;
                    this.itemHeight = docWidth / this.data.Width * this.data.Height;
                }
                this.marginTop = 0;
            } else {
                if (!slider.fit && vnode.attrs.isImage && docHeight <= docWidth) { // Landscape window. Fit to original size
                    const mFitWidth = MAX_FIT_WIDTH / this.data.Height * this.data.Width;
                    if(this.data.Height > MAX_FIT_WIDTH && !this.landscape && mFitWidth < docWidth) { // Too large to fit, compromise with maxFit
                        this.itemWidth = mFitWidth;
                        this.itemHeight = MAX_FIT_WIDTH;
                    } else { // Maximum image width
                        this.itemWidth = docWidth;
                        this.itemHeight = docWidth / this.data.Width * this.data.Height;
                        if(this.itemHeight > this.data.Height) {
                            this.itemWidth = "auto";
                            this.itemHeight = "auto";
                        }
                    }
                }
                if(slider.ttb)
                    this.marginTop = vnode.attrs.index > 0 ? 10 : 0;
            }
            
            
            itemAttrs.style = `height: ${this.parseDimension(this.itemHeight)}; width: ${this.parseDimension(this.itemWidth)}; margin: ${this.marginTop}px auto 0 auto;`;
        } else { // Horizontal (LTR & RTL)
            if(this.data.findFlag("addBlank")) // If item is single with full width, position properly
                if(slider.rtl)
                    this.marginLeft += docWidth / 2;
                else
                    this.marginRight += docWidth / 2;
            itemAttrs.style = this.styles;
        }
        let innerItemIs: Vnode = null;
        if (vnode.attrs.blank)
            innerItemIs = m("canvas.page-blank", {
                height: this.data.Height,
                width: this.data.Width,
                style: "background: transparent;", // TODO
                draggable: false
            });
        else if (this.loader && slider) {
            const innerItemAttrs: any = { // TODO interface
                height: this.data.Height ? this.data.Height : "100%",
                width: this.data.Width ? this.data.Width : "100%",
                draggable: false,
                title: this.data.Title
            };
            if(vnode.attrs.isImage)
                innerItemIs = m(((this.drmed ? "canvas" : "img") + ".page-img.noget.noselect"), innerItemAttrs);
            else {
                innerItemAttrs.height = document.documentElement.clientHeight;
                if(vnode.attrs.index === slider.currentSlide)
                    setTimeout(() => {
                        //document.documentElement.style.overflowY = "hidden";
                    }, 50);
                innerItemAttrs.onload = (e: Event) => {
                    if(!(e.target as HTMLIFrameElement).src) // Not loaded with document, just empty
                        return;
                    const tx = (e.target as HTMLIFrameElement).contentDocument;
                    vnode.attrs.binder.observe(tx);
                    tx.addEventListener("pointermove", (e: MithrilEvent) => {
                        e.special = true;
                        vnode.attrs.binder.onpointermove(e as any);
                    });
                    tx.addEventListener("mousemove", vnode.attrs.binder.mousemoveUpdater); // To keep it updated for when you go back to normal pages
                    tx.addEventListener("mousemove", (e: MithrilEvent) => {
                        e.special = true;
                        return vnode.attrs.binder.mousemoveHandler(e as any);
                    });
                    tx.addEventListener("click", (e: MithrilEvent) => {
                        (e.target as HTMLElement).blur();
                        e.special = true;
                        return vnode.attrs.binder.mousemoveHandler(e as any as BibiMouseEvent);
                    });

                    tx.addEventListener("touchmove", vnode.attrs.binder.touchmoveHandler);
                    tx.addEventListener("touchstart", vnode.attrs.binder.touchstartHandler);
                    tx.addEventListener("touchend", (e: TouchEvent) => {
                        vnode.attrs.binder.touchendHandler(e);
                        (e.target as HTMLElement).blur();
                    });
                };
                innerItemIs = m("iframe.page-frame.noselect", innerItemAttrs); // + (vnode.attrs.data.findSpecial("final").Value ? "" : ".noget")
            }
            requestAnimationFrame(() => {
                this.loader.provoke(innerItemIs as any, slider.currentSlide);
            });
        }
        return m(".item.noselect", itemAttrs, [
            innerItemIs
        ]);
    }
}