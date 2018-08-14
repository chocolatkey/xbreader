
export default class Navigator {
    constructor(publication) {
        this.spreads = [];
        this.ttb = publication.isTtb;

        this.index(publication);
    }

    index(publication) {
        let lastLandscapeIndex = 0;
        publication.spine.forEach((item, index) => {
            item.number = index + 1;
            if(item.type.indexOf("image/") != 0) // TODO somehow deal with instead of warning
                console.warn(`Item #${index} (${item.href}) in spine is not an image`);
            if(!item.orientation) item.orientation = item.width > item.height ? "landscape" : "portrait";

            const isLandscape = item.orientation === "landscape" ? true : false;
            if(!item.page) item.page = isLandscape ? "center" : (((index - lastLandscapeIndex) % 2) ? (publication.rtl ? "right" : "left") : (publication.rtl ? "left" : "right"));
            if(isLandscape)
                lastLandscapeIndex++;
        });
        this.buildSpreadStrings(publication.spine);
    }

    buildSpreadStrings(spine) {
        let currentSet = [];
        spine.forEach((item, index) => {
            if(!index) {
                this.spreads.push([item]);
            } else if(item.page === "center") { // If a center (single) page spread, push immediately and reset current set
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

    getPageString(slider) {
        if(this.ttb) {
            return `${Math.floor(slider.selector.scrollTop / slider.selector.scrollHeight * 100)}%`;
        } else if (!slider.single) {
            let spreadString = "";
            this.spreads[slider.currentSlide / slider.perPage].forEach((item, index) => {
                if(!index)
                    spreadString += item.number;
                else
                    spreadString += "-" + item.number;
            });
            return spreadString;
        } else
            return slider.currentSlide + 1;
    }
}