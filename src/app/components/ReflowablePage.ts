import { t } from "ttag";
import m, {ClassComponent, Vnode, Attributes, VnodeDOM} from "mithril";
import SmartLoader, { chooserFunction } from "xbreader/helpers/lazyLoader";
import Link from "xbreader/models/Link";
import Slider from "xbreader/models/Slider";
import { RenderConfig } from "xbreader/models/Config";
import Peripherals, { BibiMouseEvent } from "xbreader/helpers/peripherals";

export interface ReflowablePageAttrs {
    readonly data: Link;
    readonly blank: boolean;
    readonly index: number;
    readonly slider: Slider;
    readonly renderConfig: RenderConfig;
    readonly chooseCallback: chooserFunction;
    readonly binder: Peripherals;
}

interface InnerItemAttrs {
    height: string | number;
    width: string | number;
    draggable: boolean;
    loading: "lazy" | null;
    "aria-label": string;
    src: string;
    style: CSSStyleDeclaration;
    onload?: EventListener;
    // onupdate?(vnode: VnodeDOM): void;
}

export default class ReflowablePage implements ClassComponent<ReflowablePageAttrs> {

    private itemHeight: number | string;
    private oldItemHeight: number | string;
    private itemWidth: number | string;
    private oldItemWidth: number | string;
    private marginLeft: number;
    private marginRight: number;
    private marginTop: number;
    private iframeWidth = 0;
    private iframeHeight = 0;

    data: Link;
    blank: boolean;


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
        margin-left: ${this.marginLeft}px;\
        margin-right: ${this.marginRight}px;\
        margin-top: ${this.marginTop}px;`;
    }

    oninit(vnode: Vnode<ReflowablePageAttrs, this>) {
        this.data = vnode.attrs.data;
        if (vnode.attrs.blank)
            this.blank = true;
    }

    view(vnode: Vnode<ReflowablePageAttrs, this>) {
        const slider = vnode.attrs.slider;
        let spread = true;
        let docWidth;
        const docHeight = this.itemHeight = slider.innerHeightCached;
        if (slider) {
            docWidth = slider.width;
            if (slider.single || slider.ttb)
                spread = false;
        } else
            docWidth = document.documentElement.clientWidth || document.body.clientWidth;
        this.marginLeft = this.marginRight = this.marginTop = 0;
        this.itemWidth = this.iframeWidth;
        if (((this.itemWidth * 2) > docWidth && docHeight <= docWidth) && spread) {
            this.itemWidth = docWidth / 2;
            //this.itemHeight = (this.itemWidth / this.data.Width) * this.data.Height;
            this.marginTop = (docHeight - this.itemHeight) / 2;
        }
        if (docHeight > docWidth || !spread) { // Single page view
            if (docWidth < this.itemWidth) {
                this.itemWidth = docWidth;
                //this.itemHeight = (this.itemWidth / this.data.Width) * this.data.Height;
            }
            this.marginTop = docHeight - this.itemHeight / 2; // Vertical align to center in horizontal
        }

        const itemAttrs: Attributes = {style: ""};
        if (slider && (slider.ttb || slider.single)) { // Vertical (TTB) or forced single page
            if(slider.ttb) {
                    this.marginTop = vnode.attrs.index > 0 ? 10 : 0; // this.marginTop = this.loader.reloader ? this.data.Height : (vnode.attrs.index > 0 ? 10 : 0);
            }
            itemAttrs.style = `height: ${this.parseDimension(this.itemHeight)}; width: auto;`;
        } else { // Horizontal (LTR & RTL)
            if(this.data.findFlag("addBlank")) // If item is single with full width, position properly
                if(slider.rtl)
                    this.marginLeft += docWidth / 2;
                else
                    this.marginRight += docWidth / 2;
            itemAttrs.style = this.styles;
        }
        let innerItemIs: Vnode = null;
        if (slider) {
            const pageNumber = vnode.attrs.index+1;
            const innerItemAttrs: InnerItemAttrs = {
                loading: "lazy",
                height: "100%",
                width: "100%",
                src: this.data.Href,
                draggable: false,
                "aria-label": this.data.Title ? this.data.Title : t`Page ${pageNumber}`,
                style: {
                    //pointerEvents: "none"
                } as CSSStyleDeclaration
            };

            innerItemAttrs.onload = (e: Event) => {
                const target = e.target as HTMLIFrameElement;
                if(!target.src) // Not loaded with document, just empty
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
        return m(".item.noselect", itemAttrs, [
            innerItemIs
        ]);
    }
}