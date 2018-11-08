import m from "mithril";
import SmartLoader from "../helpers/lazyLoader";
export const MAX_FIT = 1400;

export default class Page {
    parseDimension(val) {
        if(isNaN(val))
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
        // Get reverse of page alignment
        if(this.data.properties.page === "left")
            return "right";
        if(this.data.properties.page === "right")
            return "left";
        return this.data.properties.page;
    }

    get landscape() {
        return this.data.properties.orientation === "landscape" ? true : false;
    }

    oninit(vnode) {
        this.data = vnode.attrs.data;
        this.drmed = this.data.properties && this.data.properties.encrypted;
        if (!vnode.attrs.blank)
            this.loader = new SmartLoader(this.data, vnode.attrs.index, vnode.attrs.drmCallback);
    }

    view(vnode) {
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
                this.itemHeight = Math.min(this.data.height, docHeight);
                free = true;
            }
        }
        this.marginLeft = this.marginRight = this.marginTop = 0;
        this.itemWidth = (this.itemHeight / this.data.height) * this.data.width;
        if (((this.itemWidth * 2) > docWidth && docHeight <= docWidth) && (!this.landscape || spread)) {
            this.itemWidth = docWidth / 2;
            this.itemHeight = (this.itemWidth / this.data.width) * this.data.height;
            this.marginTop = free ? 0 : (docHeight - this.itemHeight) / 2;
        }
        if (docHeight > docWidth || !spread) { // Single page view
            if (docWidth < this.itemWidth) {
                this.itemWidth = docWidth;
                this.itemHeight = (this.itemWidth / this.data.width) * this.data.height;
            }
            this.marginTop = free ? 0 : (docHeight - this.itemHeight) / 2; // Vertical align to center in horizontal
            if (this.float === "left")
                this.marginLeft = (docWidth - this.itemWidth) / 2;
            else if (this.float === "right" || this.float === "center")
                this.marginRight = (docWidth - this.itemWidth) / 2;
        }

        let itemAttrs = {};
        if (slider && (slider.ttb || slider.single)) { // Vertical (TTB) or forced single page
            if (!slider.fit && vnode.attrs.isImage && docHeight <= docWidth) { // Fit to original size
                const mFitWidth = MAX_FIT / this.data.height * this.data.width;
                if(this.data.height > MAX_FIT && !this.landscape && mFitWidth < docWidth) { // Too large to fit, compromise with maxFit
                    this.itemHeight = MAX_FIT;
                    this.itemWidth = mFitWidth;
                } else { // Maximum image width
                    // this.itemWidth = "auto";
                    // this.itemHeight = "auto";
                    this.itemWidth = docWidth;
                    this.itemHeight = docWidth / this.data.width * this.data.height;
                }
            }
            itemAttrs.style = `height: ${this.parseDimension(this.itemHeight)}; width: ${this.parseDimension(this.itemWidth)}; margin: 0 auto;`;
            if(slider.single) {
                if(slider.ttb)
                    this.marginTop = vnode.attrs.index > 0 ? 10 : 0;
                    
                itemAttrs.style += ` margin-top: ${this.marginTop}px;`;
            } else {
                if (this.float === "left")
                    this.marginLeft = (docWidth - this.itemWidth) / 2;
                else if (this.float === "right" || this.float === "center")
                    this.marginRight = (docWidth - this.itemWidth) / 2;
                itemAttrs.style = this.styles;
            }
        } else // Horizontal (LTR & RTL)
            itemAttrs.style = this.styles;
        let innerItemIs = null;
        if (vnode.attrs.blank)
            innerItemIs = m("canvas.page-blank", {
                height: this.data.height,
                width: this.data.width,
                style: "background: transparent;", // TODO
                draggable: false
            });
        else if (this.loader && slider) {
            const innerItemAttrs = {
                height: this.data.height ? this.data.height : "100%",
                width: this.data.width ? this.data.width : "100%",
                draggable: false,
                title: this.data.title
            };
            if(vnode.attrs.isImage)
                innerItemIs = m(((this.drmed ? "canvas" : "img") + ".page-img.noget.noselect"), innerItemAttrs);
            else {
                innerItemAttrs.height = document.documentElement.clientHeight;
                if(vnode.attrs.index === slider.currentSlide)
                    setTimeout(() => {
                        //document.documentElement.style.overflowY = "hidden";
                    }, 50);
                innerItemAttrs.onload = (e) => {
                    if(!e.target.src) // Not loaded with document, just empty
                        return;
                    const tx = e.target.contentDocument;
                    vnode.attrs.binder.observe(tx);
                    tx.addEventListener("pointermove", (e) => {
                        e.special = true;
                        vnode.attrs.binder.onpointermove(e);
                    });
                    tx.addEventListener("mousemove", vnode.attrs.binder.mousemoveUpdater); // To keep it updated for when you go back to normal pages
                    tx.addEventListener("mousemove", (e) => {
                        e.special = true;
                        return vnode.attrs.binder.mousemoveHandler(e);
                    });
                    tx.addEventListener("click", (e) => {
                        e.target.blur();
                        e.special = true;
                        return vnode.attrs.binder.mousemoveHandler(e);
                    });

                    tx.addEventListener("touchmove", vnode.attrs.binder.touchmoveHandler);
                    tx.addEventListener("touchstart", vnode.attrs.binder.touchstartHandler);
                    tx.addEventListener("touchend", (e) => {
                        vnode.attrs.binder.touchendHandler(e);
                        e.target.blur();
                    });
                };
                innerItemIs = m("iframe.page-frame.noselect", innerItemAttrs); // + (vnode.attrs.data.xbr.final ? "" : ".noget")
            }
            setTimeout(() => {
                this.loader.provoke(innerItemIs, slider.currentSlide);
            });
        }
        return m(".item.noselect", itemAttrs, [
            innerItemIs
        ]);
    }
}