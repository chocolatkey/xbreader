import { t } from "ttag";
import Publication from "./Publication";
import Link from "./Link";
import Slider from "./Slider";
import { Properties } from "@r2-shared-js/models/metadata-properties";
export default class Navigator {
    private readonly ttb: boolean;
    shift = true; // TODO getter
    private spreads: Link[][] = [];
    nLandscape: number; // TODO getter

    constructor(publication: Publication) {
        this.ttb = publication.isTtb;

        this.index(publication);
        this.testShift(publication);
        console.log(`Indexed ${this.spreads.length} spreads for ${publication.spine.length} items`);
    }

    private index(publication: Publication, redo = false) {
        this.nLandscape = 0;
        publication.spine.forEach((item, index) => {
            if (!/^(?:[a-z]+:)?\/\//i.test(item.Href)) // convert URL relative to manifest to absolute URL
                item.Href = new URL(item.Href, publication.url).href;
            if(!item.Properties)  item.Properties = new Properties();
            item.Properties.Spread = item.Properties.Spread ? item.Properties.Spread : "landscape"; // TODO Maybe default to auto instead
            if(!redo) {
                item.setSpecial("number", index + 1);
                Publication.fixDeprecated(item, "mime", "type");
                if(item.TypeLink.indexOf("image/") === 0)
                    item.setSpecial("isImage", true);
                if(!item.Properties.Orientation) item.Properties.Orientation = item.Width > item.Height ? "landscape" : "portrait";
            }
            const isLandscape = item.Properties.Orientation === "landscape" ? true : false;
            if(!item.Properties.Page || redo) item.Properties.Page = 
                isLandscape ? // If a landscape image
                    "center" : // Center it
                    ((((this.shift ? 0 : 1) + index - this.nLandscape) % 2) ? 
                        (publication.rtl ? "right" : "left") :
                        (publication.rtl ? "left" : "right"));
            if(isLandscape || item.findFlag("addBlank"))
                this.nLandscape++;
        });
        if(redo)
            this.spreads = [];
        this.buildSpreads(publication.spine);
    }

    private testShift(publication: Publication) {
        let wasLastSingle = false;
        this.spreads.forEach((item, index) => {
            if(item.length > 1)
                return; // Only left with single-page "spreads"
            const single = item[0];

            // If last was a true single, and this spread is a center page (that's not special), something's wrong
            if(wasLastSingle && single.Properties.Page === "center") {
                this.spreads[index - 1][0].setSpecial("addBlank", true);
                if(single.findFlag("final"))
                    this.nLandscape++;
            }

            // If this single page spread is an orphaned component of a double page spread (and it's not the first page)
            if(single.Properties.Orientation === "portrait" && single.Properties.Page !== "center" && single.findSpecial("number").Value > 1)
                wasLastSingle = true;
            else
                wasLastSingle = false;
        });
        if(!this.shift)
            this.index(publication, true); // Re-index spreads
    }

    private buildSpreads(spine: Link[]) {
        let currentSet: Link[] = [];
        spine.forEach((item, index) => {
            if(!index && this.shift) {
                this.spreads.push([item]);
            } else if(item.Properties.Page === "center") { // If a center (single) page spread, push immediately and reset current set
                if(currentSet.length > 0) this.spreads.push(currentSet);
                this.spreads.push([item]);
                currentSet = [];
            } else if (currentSet.length >= 2) { // Spread has max 2 pages
                this.spreads.push(currentSet);
                currentSet = [item];
            } else // Add this item to current set
                currentSet.push(item);
        });
        if(currentSet.length > 0) this.spreads.push(currentSet);
    }

    currentSpread(slider: Slider) {
        return this.spreads[Math.floor(slider.currentSlide / slider.perPage)];
    }

    getPageString(slider: Slider) {
        if(this.ttb) {
            if(!slider.selector) return "0%";
            return `${Math.floor((document.documentElement.scrollTop + document.body.scrollTop) / slider.selector.scrollHeight * 100)}%`;
        } else if (!slider.single && !slider.ttb) {
            let spreadString = "";
            const spread = this.currentSpread(slider);
            if(!spread) {
                console.error(`Went off the edge of the spine @${slider.currentSlide}`);
                return "?";
            }
            if(spread.length && spread[0].findFlag("final"))
                return t`END`;
            spread.forEach((item, index) => {
                if(!index)
                    spreadString += item.findSpecial("number").Value;
                else
                    spreadString += "-" + item.findSpecial("number").Value;
            });
            return spreadString;
        } else {
            const last = this.spreads[this.spreads.length - 1];
            if(slider.currentSlide + 1 === slider.length && last && last.length && last[0].findFlag("final"))
                return t`END`;
            return slider.currentSlide + 1;
        }
    }
}