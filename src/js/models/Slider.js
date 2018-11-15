import m from "mithril";

export default class Slider {
    constructor(series, publication, binder, config) {
        this.navigator = publication.navi;
        this.publication = publication;
        this.series = series;
        this.binder = binder;
        this.config = config; // TODO rename to config once slider config is eliminated!!!

        this.zoomer = {
            scale: 1,
            translate: {
                X: 0,
                Y: 0
            },
        };
        this.spread = true;
        this.ttb = false;

        this.rtl = this.publication.rtl;
        this.currentSlide = 0;
        this.fit = false;
        this.transform = null;
        this.children = [];
        this.resolveSlidesNumber();
        this.updateProperties(true);
        this.resizeHandler = this.resizeHandler.bind(this);
        window.addEventListener("resize", this.resizeHandler);
    }

    /**
     * When window resizes, resize slider components as well
     */
    resizeHandler(slide = true, fast = true) {
        // relcalculate currentSlide
        // prevent hiding items when browser width increases
        if (this.currentSlide + this.perPage > this.length) {
            this.currentSlide = this.length <= this.perPage ? 0 : this.length - 1;
        }

        //this.selectorWidth = this.selector.offsetWidth;
        this.resolveSlidesNumber();
        this.updateProperties(true);
        if(slide)
            this.slideToCurrent(!fast, fast);
        m.redraw();
    }

    destroy() {
        window.removeEventListener("resize", this.resizeHandler);
    }

    updateProperties(animate, fast = true) {
        let margin = 0;
        this.width = document.documentElement.clientWidth;
        this.height = document.documentElement.clientHeight;
        if(this.perPage > 1 && this.shift)
            margin = `${this.width / 2}px`;
        if(this.ttb) {
            this.properties = {

            };
        } else {
            this.properties = {
                transition: animate ? `all ${fast ? 150 : 500}ms ease-out` : "all 0ms ease-out", // TODO vary
                marginRight: this.rtl ? margin : 0,
                marginLeft: this.rtl ? 0 : margin,
                width: `${(this.width / this.perPage) * this.length}px`,
                transform: this.transform
            };
        }
    }

    get threshold() {
        return 20; // todo
    }

    get easing() {
        return "ease-out";
    }

    get perPage() {
        return this.spread && !this.portrait ? 2 : 1;
    }

    get portrait() {
        return window.innerHeight > window.innerWidth;
    }

    get single() {
        return !this.spread || this.portrait;
    }

    resolveSlidesNumber() {
        if (!this.spread) //  || this.ttb
            this.spread = false;
        else
            this.spread = true;
    }

    get nLandscape() {
        return this.navigator.nLandscape ? this.navigator.nLandscape : 0;
    }

    get shift() {
        return this.navigator.shift;
    }

    get length() {
        if(this.single)
            return this.slength;
        return this.slength + this.nLandscape;
    }

    get slength() {
        return this.publication.spine.length;
    }

    onChange() {
        if(this.binder)
            this.guideHidden = true;
        this.zoomer.scale = 1;
        m.redraw();
        this.config.onPageChange(this.currentSlide + (this.single ? 1 : 0), this.direction, !this.single);
    }

    onLastPage() {
        if(this.config.onLastPage(this.series)) {
            const next = this.series.next;
            if(!next) { // No more chapters left
                alert(__("You've reached the end of this series!"));
                return;
            }
            // Go to next chapter
            m.route.set("/:id", { id: next.uuid, }, { replace: false });
        }
    }

    /**
     * Go to next slide.
     * @param {number} [howManySlides=1] - How many items to slide forward.
     */
    next(howManySlides = 1) {
        // early return when there is nothing to slide
        if (this.slength <= this.perPage) {
            return;
        }

        const beforeChange = this.currentSlide;

        this.currentSlide = Math.min(this.currentSlide + howManySlides, this.length - 1);
        if(this.perPage > 1 && this.currentSlide % 2)
            this.currentSlide--;

        if(this.currentSlide === beforeChange && this.currentSlide + 1 === this.length) {
            // At end and trying to go further, means trigger "last page" callback
            this.onLastPage(this.series);
        }

        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(true);
            this.onChange();
        }
    }

    /**
     * Go to previous slide.
     * @param {number} [howManySlides=1] - How many items to slide backward.
     */
    prev(howManySlides = 1) {
        // early return when there is nothing to slide
        if (this.slength <= this.perPage) {
            return;
        }

        const beforeChange = this.currentSlide;

        this.currentSlide = Math.max(this.currentSlide - howManySlides, 0);
        if(this.perPage > 1 && this.currentSlide % 2)
            this.currentSlide++;

        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(true);
            this.onChange();
        }
    }
    

    /**
     * Go to slide with particular index
     * @param {number} index - Item index to slide to.
     */
    goTo(index) {
        if (this.slength <= this.perPage)
            return;
        if (index % 2 && !this.single) // Prevent getting out of track
            index++;
        const beforeChange = this.currentSlide;
        this.currentSlide = Math.min(Math.max(index, 0), this.length - 1);
        if (beforeChange !== this.currentSlide) {
            this.slideToCurrent(false);
            this.onChange();
        }
    }

    /**
     * Moves sliders frame to position of currently active slide
     */
    slideToCurrent(enableTransition, fast = true) {
        if (this.ttb) {
            const children = document.getElementById("br-slider").children;
            requestAnimationFrame(() => { // TODO nicer animation. Right now you still see a flash of the top
                requestAnimationFrame(() => {
                    if(this && children && children[this.currentSlide])
                        children[this.currentSlide].children[0].scrollIntoView(true);
                    m.redraw();
                });
            });
            return;
        }
        if(this.single && !this.ttb)
            window.scrollTo(0, 0); // Scroll back to top for next page

        const offset = (this.rtl ? 1 : -1) * this.currentSlide * (this.width / this.perPage);

        if (enableTransition) {
            // This one is tricky, I know but this is a perfect explanation:
            // https://youtu.be/cCOL7MC4Pl0
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.transform = `translate3d(${offset}px, 0, 0)`;
                    this.updateProperties(true, fast);
                    m.redraw();
                });
            });
        } else {
            this.transform = `translate3d(${offset}px, 0, 0)`;
            this.updateProperties(false);
            m.redraw();
        }
    }
}