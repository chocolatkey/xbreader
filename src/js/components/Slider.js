/**
Source originally from Siema (https://github.com/pawelgrzybek/siema), license below:
------------------------------
MIT License

Copyright (c) 2017 [Paweł Grzybek](https://pawelgrzybek.com/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
------------------------------
 * Modified by chocolatkey
 */
import Platform from "../helpers/platform";
export default class Slider {
    /**
     * Create a Slider.
     * @param {Object} options - Optional settings object.
     */
    constructor(options) {
        // Merge defaults with user's settings
        this.config = Slider.mergeSettings(options);

        // Resolve selector's type
        this.selector = typeof this.config.selector === "string" ? document.querySelector(this.config.selector) : this.config.selector;

        // update perPage number dependable of user value
        this.resolveSlidesNumber();

        // Create global references
        this.selectorWidth = this.selector.offsetWidth;
        this.innerElements = [].slice.call(this.selector.children);
        this.currentSlide = Math.max(0, Math.min(this.config.startIndex, this.innerElements.length - this.perPage));

        this.transformProperty = Platform.webkitOrNot();

        // Bind all event handlers for referencability
        ["resizeHandler"].forEach(method => {
            this[method] = this[method].bind(this);
        });

        // Build markup and apply required styling to elements
        this.init();
    }


    /**
     * Overrides default settings with custom ones.
     * @param {Object} options - Optional settings object.
     * @returns {Object} - Custom Slider settings.
     */
    static mergeSettings(options) {
        const settings = {
            selector: "#br-book",
            duration: 200,
            easing: "ease-out",
            perPage: 1,
            startIndex: 0,
            draggable: true,
            multipleDrag: false,
            threshold: 20,
            rtl: false,
            ttb: false,
            fit: true,
            shift: true,
            onInit: () => {},
            onChange: () => {},
        };

        const userSttings = options;
        for (const attrname in userSttings) {
            settings[attrname] = userSttings[attrname];
        }

        return settings;
    }

    /**
     * Attaches listeners to required events.
     */
    attachEvents() {
        // Resize element on window resize
        window.addEventListener("resize", this.resizeHandler);
    }


    /**
     * Detaches listeners from required events.
     */
    detachEvents() {
        window.removeEventListener("resize", this.resizeHandler);
    }


    /**
     * Builds the markup and attaches listeners to required events.
     */
    init() {
        this.attachEvents();

        // hide everything out of selector's boundaries
        this.selector.style.overflow = "hidden";

        // build a frame and slide to a currentSlide
        this.buildSliderFrame();

        this.config.onInit.call(this);
    }


    /**
     * Build a sliderFrame and slide to a current item.
     */
    buildSliderFrame() {
        // Create frame and apply styling
        this.sliderFrame = document.createElement("div");
        this.enableTransition();

        // Create a document fragment to put slides into it
        const docFragment = document.createDocumentFragment();

        this.nLandscape = 0;
        // Loop through the slides, add styling and add them to document fragment
        for (let i = 0; i < this.innerElements.length; i++) {
            if(this.innerElements[i].clientWidth > this.innerElements[i].clientHeight) {
                this.innerElements[i].isLandscape =  true;
                this.nLandscape++;
            } else
                this.innerElements[i].isLandscape = false;
            
        }
        // Yep, repeat same loop because we have to know total of landscape items before calculating item widths
        for (let i = 0; i < this.innerElements.length; i++) {
            const element = this.buildSliderFrameItem(this.innerElements[i]);
            docFragment.appendChild(element);
        }
        // Padding at beginning for first page offset
        let margin = 0;
        if(this.perPage > 1 && this.config.shift)
            margin = `${this.selector.clientWidth / 2}px`;
        if(this.config.rtl)
            this.sliderFrame.style.marginRight = margin;
        else
            this.sliderFrame.style.marginLeft = margin;

        const widthItem = this.selectorWidth / this.perPage;
        this.sliderFrame.style.width = `${widthItem * this.length}px`;

        // Add fragment to the frame
        this.sliderFrame.appendChild(docFragment);

        // Clear selector (just in case something is there) and insert a frame
        this.selector.innerHTML = "";
        this.selector.appendChild(this.sliderFrame);

        // Go to currently active slide after initial build
        this.slideToCurrent();
    }

    buildSliderFrameItem(elm) {
        const elementContainer = document.createElement("div");
        elementContainer.style.cssFloat = this.config.rtl ? "right" : "left";
        elementContainer.style.float = this.config.rtl ? "right" : "left";
        if(this.perPage > 1 && elm.isLandscape)
            elementContainer.style.width = `${100 / (this.length) * 2}%`;
        else
            elementContainer.style.width = `${100 / (this.length)}%`;
        elementContainer.appendChild(elm);
        return elementContainer;
    }


    /**
     * Determinates slides number accordingly to clients viewport.
     */
    resolveSlidesNumber() {
        // Autoresolve - chocolatkey
        if (window.innerHeight > window.innerWidth || this.config.perPage === 1 || this.config.ttb)
            this.perPage = 1;
        else
            this.perPage = 2;
            
    }

    get single() {
        return this.perPage > 1 ? false : true;
    }


    /**
     * Go to previous slide.
     * @param {number} [howManySlides=1] - How many items to slide backward.
     * @param {function} callback - Optional callback function.
     */
    prev(howManySlides = 1, callback) {
        // early return when there is nothing to slide
        if (this.innerElements.length <= this.perPage) {
            return;
        }

        const beforeChange = this.currentSlide;

        this.currentSlide = Math.max(this.currentSlide - howManySlides, 0);
        if(this.perPage > 1 && this.currentSlide % 2)
            this.currentSlide++;

        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(true);
            this.config.onChange.call(this);
            if (callback) {
                callback.call(this);
            }
        }
    }


    /**
     * Go to next slide.
     * @param {number} [howManySlides=1] - How many items to slide forward.
     * @param {function} callback - Optional callback function.
     */
    next(howManySlides = 1, callback) {
        // early return when there is nothing to slide
        if (this.innerElements.length <= this.perPage) {
            return;
        }

        const beforeChange = this.currentSlide;

        this.currentSlide = Math.min(this.currentSlide + howManySlides, this.length - 1);
        if(this.perPage > 1 && this.currentSlide % 2)
            this.currentSlide--;

        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(true);
            this.config.onChange.call(this);
            if (callback) {
                callback.call(this);
            }
        }
    }


    /**
     * Disable transition on sliderFrame.
     */
    disableTransition() {
        this.sliderFrame.style.webkitTransition = `all 0ms ${this.config.easing}`;
        this.sliderFrame.style.transition = `all 0ms ${this.config.easing}`;
    }


    /**
     * Enable transition on sliderFrame.
     */
    enableTransition() {
        const dur = (this.perPage == 1 && window.innerHeight < window.innerWidth) ? this.config.duration/2 : this.config.duration;
        this.sliderFrame.style.webkitTransition = `all ${dur}ms ${this.config.easing}`;
        this.sliderFrame.style.transition = `all ${dur}ms ${this.config.easing}`;
    }

    /**
     * Get current amount of pages
     */
    get length() {
        if(this.perPage == 1)
            return this.innerElements.length;
        return this.innerElements.length + this.nLandscape;
    }


    /**
     * Go to slide with particular index
     * @param {number} index - Item index to slide to.
     * @param {function} callback - Optional callback function.
     */
    goTo(index, callback) {
        if (this.innerElements.length <= this.perPage)
            return;
        const beforeChange = this.currentSlide;
        this.currentSlide = Math.min(Math.max(index, 0), this.length - 1);
        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(false);
            this.config.onChange.call(this);
            if (callback) {
                callback.call(this);
            }
        }
    }


    /**
     * Moves sliders frame to position of currently active slide
     */
    slideToCurrent(enableTransition) {
        if (this.config.ttb) {
            this.innerElements[this.currentSlide].scrollIntoView(true);
            return;
        }
        if(this.single && !this.config.ttb)
            //this.selector.scrollTo(this.selector.pageXOffset, 0);
            this.selector.scrollBy(0, -9999); // Scroll back to top for next page


        /*let offset = 0;
        if(this.perPage > 1) { // Spread
            let nLandscape = 0;
            for(let i = 0; i < this.currentSlide + 1; i++) {
                if(this.innerElements[i].isLandscape)
                    nLandscape++;
            }
            const multiplier = ((this.currentSlide) * (this.selectorWidth / this.perPage))// - (nLandscape * this.selectorWidth); 
            offset = (this.config.rtl ? 1 : -1) * multiplier;
        } else*/ 
        const offset = (this.config.rtl ? 1 : -1) * this.currentSlide * (this.selectorWidth / this.perPage);

        if (enableTransition) {
            // This one is tricky, I know but this is a perfect explanation:
            // https://youtu.be/cCOL7MC4Pl0
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.enableTransition();
                    this.sliderFrame.style[this.transformProperty] = `translate3d(${offset}px, 0, 0)`;
                });
            });
        } else {
            this.disableTransition();
            this.sliderFrame.style[this.transformProperty] = `translate3d(${offset}px, 0, 0)`;
        }
    }


    /**
     * When window resizes, resize slider components as well
     */
    resizeHandler() {
        // update perPage number dependable of user value
        this.resolveSlidesNumber();

        // relcalculate currentSlide
        // prevent hiding items when browser width increases
        if (this.currentSlide + this.perPage > this.innerElements.length) {
            this.currentSlide = this.innerElements.length <= this.perPage ? 0 : this.innerElements.length - this.perPage;
        }

        this.selectorWidth = this.selector.offsetWidth;

        this.buildSliderFrame();
    }


    /**
     * Insert item to carousel at particular index.
     * @param {HTMLElement} item - Item to insert.
     * @param {number} index - Index of new new item insertion.
     * @param {function} callback - Optional callback to call after insert.
     */
    insert(item, index, callback) {
        if (index < 0 || index > this.innerElements.length + 1) {
            throw new Error("Unable to inset it at this index 😭");
        }
        if (this.innerElements.indexOf(item) !== -1) {
            throw new Error("The same item in a carousel? Really? Nope 😭");
        }

        // Avoid shifting content
        const shouldItShift = index <= this.currentSlide && this.innerElements.length;
        this.currentSlide = shouldItShift ? this.currentSlide + 1 : this.currentSlide;

        this.innerElements.splice(index, 0, item);

        // build a frame and slide to a currentSlide
        this.buildSliderFrame();

        if (callback) {
            callback.call(this);
        }
    }


    /**
     * Prepernd item to carousel.
     * @param {HTMLElement} item - Item to prepend.
     * @param {function} callback - Optional callback to call after prepend.
     */
    prepend(item, callback) {
        this.insert(item, 0);
        if (callback) {
            callback.call(this);
        }
    }


    /**
     * Append item to carousel.
     * @param {HTMLElement} item - Item to append.
     * @param {function} callback - Optional callback to call after append.
     */
    append(item, callback) {
        this.insert(item, this.innerElements.length + 1);
        if (callback) {
            callback.call(this);
        }
    }


    /**
     * Removes listeners and optionally restores to initial markup
     * @param {boolean} restoreMarkup - Determinants about restoring an initial markup.
     * @param {function} callback - Optional callback function.
     */
    destroy(restoreMarkup = false, callback) {
        this.detachEvents();

        this.selector.style.cursor = "auto";

        if (restoreMarkup) {
            const slides = document.createDocumentFragment();
            for (let i = 0; i < this.innerElements.length; i++) {
                slides.appendChild(this.innerElements[i]);
            }
            this.selector.innerHTML = "";
            this.selector.appendChild(slides);
            this.selector.removeAttribute("style");
        }

        if (callback) {
            callback.call(this);
        }
    }
}