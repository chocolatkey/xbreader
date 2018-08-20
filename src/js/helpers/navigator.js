
export default class Navigator {
    constructor(publication) {
        this.spreads = [];
        this.ttb = publication.isTtb;
        this.shift = true;

        this.index(publication);
        this.testShift(publication);
        console.log(`Indexed ${this.spreads.length} spreads for ${publication.spine.length} items`);
    }

    index(publication, redo = false) {
        let lastLandscapeIndex = 0;
        publication.spine.forEach((item, index) => {
            if(!redo) {
                item.number = index + 1;
                if(item.type.indexOf("image/") != 0) // TODO somehow deal with instead of warning
                    console.warn(`Item #${index} (${item.href}) in spine is not an image`);
                if(!item.orientation) item.orientation = item.width > item.height ? "landscape" : "portrait";
            }
            const isLandscape = item.orientation === "landscape" ? true : false;
            if(!item.page || redo) item.page = isLandscape ? "center" : ((((this.shift ? 0 : 1) + index - lastLandscapeIndex) % 2) ? (publication.rtl ? "right" : "left") : (publication.rtl ? "left" : "right"));
            if(isLandscape)
                lastLandscapeIndex++;
        });
        if(redo)
            this.spreads = [];
        this.buildSpreads(publication.spine);
    }

    testShift(publication) {
        let wasLastSingle = false;
        this.spreads.forEach((item) => {
            if(item.length > 1)
                return; // Only left with single-page "spreads"
            const single = item[0];

            // If last was a true single, and this spread is a center page, something's wrong
            if(wasLastSingle && single.page === "center")
                this.shift = false;
            
            // If this single page spread is an orphaned component of a double page spread (and it's not the first page)
            if(single.orientation === "portrait" && single.page !== "center" && single.number > 1)
                wasLastSingle = true;
        });
        if(!this.shift)
            this.index(publication, true); // Re-index spreads
    }

    buildSpreads(spine) {
        let currentSet = [];
        spine.forEach((item, index) => {
            if(!index && this.shift) {
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
            const spread = this.spreads[Math.floor(slider.currentSlide / slider.perPage)];
            if(!spread) {
                console.error(`Went off the edge of the spine @${slider.currentSlide}`);
                return "?";
            }
            spread.forEach((item, index) => {
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