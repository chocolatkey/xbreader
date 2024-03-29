import { t } from "ttag";
import m, {ClassComponent, Vnode} from "mithril";
import SmartLoader, { chooserFunction } from "xbreader/helpers/lazyLoader";
import Link from "xbreader/models/Link";
import Slider from "xbreader/models/Slider";
import { RenderConfig } from "xbreader/models/Config";
import Peripherals, { BibiMouseEvent } from "xbreader/helpers/peripherals";
export const MAX_FIT_WIDTH = 1400;
export const MAX_FIT_HEIGHT = 1000;
export const MAX_TTB_WIDTH = 1000;
export const MIN_TTB_WIDTH = 720;

export interface PageAttrs {
    readonly data: Link;
    readonly isImage: boolean;
    readonly blank: boolean;
    readonly index: number;
    readonly slider: Slider;
    readonly renderConfig: RenderConfig;
    readonly chooseCallback: chooserFunction;
    readonly binder: Peripherals;
}

interface InnerItemAttrs {
    style: string | object;
}

export default class Page implements ClassComponent<PageAttrs> {

    private itemHeight: number | string;
    private itemWidth: number | string;
    private marginLeft: number;
    private marginRight: number;
    private marginTop: number;

    data: Link;
    blank: boolean;
    private loader: SmartLoader;


    parseDimension(val: number | string) {
        if(isNaN(val as number))
            return "auto";
        else
            return val + "px";
    }

    get styles() {
        // Note: width used to be ${this.parseDimension(this.itemWidth)}, but that causes gaps in between spread pages
        return `\
        height: ${this.parseDimension(this.itemHeight)};\
        width: auto;\
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
        if (vnode.attrs.blank)
            this.blank = true;
        else
            this.loader = new SmartLoader(this.data, vnode.attrs.slider.publication, vnode.attrs.index, vnode.attrs.renderConfig, vnode.attrs.chooseCallback);
    }

    onremove() {
        this.loader.destroy();
    }


    view(vnode: Vnode<PageAttrs, this>) {
        const slider = vnode.attrs.slider;
        let spread = true;
        let free = false;
        let docWidth;
        const docHeight = this.itemHeight = slider.innerHeightCached;
        if (slider) {
            docWidth = slider.width;
            if (slider.single || slider.ttb || this.landscape)
                spread = false;
            if (slider.ttb && this.landscape) {
                this.itemHeight = Math.min(this.data.Height, docHeight);
                free = true;
            }
        } else
            docWidth = document.documentElement.clientWidth || document.body.clientWidth;
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

        const itemAttrs: InnerItemAttrs = {style: null};
        if (slider && (slider.ttb || slider.single)) { // Vertical (TTB) or forced single page
            if(slider.toon || (this.data.Height / this.data.Width) > 2) { // TTB publication or very tall image
                // ... && this.data.Width < docWidth
                if(slider.publication.isTtb || (this.data.Height > MAX_FIT_HEIGHT || this.data.Width > MAX_FIT_WIDTH) && !(this.landscape && !slider.toon)) { // Too large to fit, compromise with maxFit
                    const preferredWidth = Math.min(docWidth, (slider.fit ? MIN_TTB_WIDTH : MAX_TTB_WIDTH));
                    if(preferredWidth < this.data.Width) {
                        this.itemHeight = preferredWidth / this.data.Width * this.data.Height;
                        this.itemWidth = preferredWidth;
                    } else {
                        this.itemWidth = this.data.Width;
                        this.itemHeight = this.data.Height;
                    }
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
                        if(this.loader.reloader) // Keep the scrollbar from glitching as much (it still does some...)
                            this.itemHeight = this.data.Height;
                    }
                }
                if(slider.ttb)
                    this.marginTop = vnode.attrs.index > 0 ? 10 : 0; // this.marginTop = this.loader.reloader ? this.data.Height : (vnode.attrs.index > 0 ? 10 : 0);
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
                draggable: false,
                alt: t`Blank Page`
            });
        else if (this.loader && slider) {
            const pageNumber = vnode.attrs.index+1;
            const innerItemAttrs: any = { // TODO interface
                height: this.data.Height ? this.data.Height : "100%",
                width: this.data.Width ? this.data.Width : "100%",
                draggable: false,
                "aria-label": this.data.Title ? this.data.Title : t`Page ${pageNumber}`
            };
            if(vnode.attrs.isImage) {
                const willDraw = this.loader.drawer || vnode.attrs.renderConfig.onDraw;
                innerItemAttrs.role = "img";
                if(willDraw)
                    innerItemAttrs.height = innerItemAttrs.width = 0;
                else innerItemAttrs.decoding = "async";
                innerItemIs = m(((willDraw ? "canvas" : "img") + ".page-img.noget.noselect"), innerItemAttrs);
            }
            else {
                innerItemAttrs.height = slider.height;
                /*if(vnode.attrs.index === slider.currentSlide)
                    window.setTimeout(() => {
                        //document.documentElement.style.overflowY = "hidden";
                    }, 50);*/
                innerItemAttrs.onload = (e: Event) => {
                    if(!(e.target as HTMLIFrameElement).src) // Not loaded with document, just empty
                        return;
                    const tx = (e.target as HTMLIFrameElement).contentDocument;
                    if(!tx) return;
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
                this.loader.provoke(innerItemIs as any, slider.viewingPage);
            });
        }
        return m(".item.noselect", itemAttrs, [
            innerItemIs
        ]);
    }
}