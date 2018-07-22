import m from "mithril";
import SmartLoader from "../helpers/lazyLoader";
const MAX_FIT = 1400;

export default class Page {

    oninit(vnode) {
        this.data = vnode.attrs.data;
        this.isLandscape = this.data.width > this.data.height; // TODO based on spine property
        if (!vnode.attrs.blank)
            this.loader = new SmartLoader(this.data, vnode.attrs.index);
    }

    view(vnode) {
        const slider = vnode.attrs.slider;
        const float = vnode.attrs.float;
        let spread = true;
        let free = false;
        let docWidth = document.documentElement.clientWidth || document.body.clientWidth;
        const docHeight = this.itemHeight = window.innerHeight;
        if (slider) {
            docWidth = slider.selector.clientWidth; // Other
            if (slider.perPage == 1 || slider.config.ttb || this.isLandscape)
                spread = false;
            if (slider.config.ttb && this.isLandscape) {
                this.itemHeight = Math.min(this.data.height, docHeight);
                free = true;
            }
        }
        this.marginLeft = this.marginRight = this.marginTop = 0;
        this.itemWidth = (this.itemHeight / this.data.height) * this.data.width;
        if (((this.itemWidth * 2) > docWidth && docHeight <= docWidth) && (!this.isLandscape || spread)) {
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

            if (float === "left")
                this.marginLeft = (docWidth - this.itemWidth) / 2;
            else if (float === "right")
                this.marginRight = (docWidth - this.itemWidth) / 2;
        }

        let itemAttrs = {};
        if (slider && slider.config.ttb) // Vertical (TTB)
            if (!slider.config.fit && docHeight <= docWidth) { // Fit to original size
                const mFitWidth = MAX_FIT / this.data.height * this.data.width;
                if(this.data.height > MAX_FIT && !this.isLandscape && mFitWidth < docWidth) { // Too large to fit, compromise with maxFit
                    itemAttrs.style = `height: ${MAX_FIT}px; width: ${mFitWidth}px; margin: 0 auto;`;
                } else // Original image size
                    itemAttrs.style = "height: auto; width: auto; margin: 0 auto;";
            } else // Fit to browser height
                itemAttrs.style = `height: ${this.itemHeight}px; width: ${this.itemWidth}px; margin: 0 auto;`;
        else // Horizontal (LTR & RTL)
            itemAttrs.style = `height: ${this.itemHeight}px; width: ${this.itemWidth}px; float: ${float}; margin-left: ${this.marginLeft}px; margin-right: ${this.marginRight}px; margin-top: ${this.marginTop}px;`;

        
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
        //this.canvas = innerItemIs;

        return m(".item.noselect", itemAttrs, [
            innerItemIs
        ]);
    }
}