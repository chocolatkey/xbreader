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
        if (!vnode.attrs.blank)
            this.loader = new SmartLoader(this.data, vnode.attrs.index);
    }

    view(vnode) {
        const slider = vnode.attrs.slider;
        let spread = true;
        let free = false;
        let docWidth = document.documentElement.clientWidth || document.body.clientWidth;
        const docHeight = this.itemHeight = window.innerHeight;
        if (slider) {
            docWidth = slider.selector.clientWidth; // Other
            if (slider.single || slider.config.ttb || this.landscape)
                spread = false;
            if (slider.config.ttb && this.landscape) {
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
        if (slider && (slider.config.ttb || slider.single)) { // Vertical (TTB) or forced single page
            if (!slider.config.fit && docHeight <= docWidth) { // Fit to original size
                const mFitWidth = MAX_FIT / this.data.height * this.data.width;
                if(this.data.height > MAX_FIT && !this.landscape && mFitWidth < docWidth) { // Too large to fit, compromise with maxFit
                    this.itemHeight = MAX_FIT;
                    this.itemWidth = mFitWidth;
                } else { // Maximum image width
                    this.itemWidth = "auto";
                    this.itemHeight = "auto";
                    //this.itemWidth = docWidth;
                    //this.itemHeight = docWidth / this.data.width * this.data.height;
                }
            }
            itemAttrs.style = `height: ${this.parseDimension(this.itemHeight)}; width: ${this.parseDimension(this.itemWidth)}; margin: 0 auto;`;
            if(slider.single) {
                if(!slider.config.ttb)
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
            innerItemIs = m("img.page-img.noget.noselect", {
                height: this.data.height,
                width: this.data.width,
                draggable: false
            });
            setTimeout(() => {
                this.loader.provoke(innerItemIs, slider.currentSlide);
            });
        }
        return m(".item.noselect", itemAttrs, [
            innerItemIs
        ]);
    }
}