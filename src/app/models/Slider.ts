/**
    Inspired by Siema (https://github.com/pawelgrzybek/siema)
 */

import { t } from "ttag";
import m from "mithril";
import sML from "../helpers/sMLstub";
import Publication from "./Publication";
import Navigator from "./Navigator";
import Series from "./Series";
import Peripherals from "xbreader/helpers/peripherals";
import Config from "./Config";

export interface Zoomer {
    scale: number;
    translate: {
        X: number;
        Y: number;
    };
}

export default class Slider {
    private readonly navigator: Navigator;
    readonly series: Series;
    readonly publication: Publication;
    private readonly config: Config;
    private transform: string = null;
    private orientationInternal = -1; // Portrait = 1, Landscape = 0, Unknown = -1
    currentSlide = 0;
    rtl: boolean;
    ttb = false;
    spread: boolean;
    fit: boolean;
    guideHidden: boolean;
    binder: Peripherals;
    width: number;
    height: number;
    zoomer: Zoomer = {
        scale: 1,
        translate: {
            X: 0,
            Y: 0
        }
    };
    properties: Record<string, any>; // TODO CSS styles
    private readonly resizeBoundHandler: EventListenerOrEventListenerObject;

    constructor(series: Series, publication: Publication, binder: Peripherals, config: Config) {
        this.navigator = publication.navi;
        this.publication = publication;
        this.series = series;
        this.binder = binder;
        this.config = config;

        this.spread = config.spread;

        this.rtl = this.publication.rtl;
        this.fit = config.fit;
        this.updateProperties(true);
        this.resizeBoundHandler = this.resizeHandler.bind(this);
        window.addEventListener("resize", this.resizeBoundHandler);
        window.addEventListener("orientationchange", this.resizeBoundHandler);
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

        this.orientationInternal = -1;

        this.updateProperties(true);
        if(slide && !sML.Mobile)
            this.slideToCurrent(!fast, fast);

        m.redraw();
        /*
            if(this.direction == XBReadingDirection.TTB && this.slider)
                this.slider.slideToCurrent();*/
    }

    destroy() {
        window.removeEventListener("resize", this.resizeBoundHandler);
        window.removeEventListener("orientationchange", this.resizeBoundHandler);
    }

    /**
     * It is important that these values be cached to avoid spamming them on redraws, they are expensive.
     */
    private updateDimensions() {
        this.width = document.documentElement.clientWidth;
        this.height = document.documentElement.clientHeight;
    }

    updateProperties(animate: boolean, fast = true) {
        let margin = "0";
        this.updateDimensions();
        if(this.perPage > 1 && this.shift)
            margin = `${this.width / 2}px`;
        if(this.ttb) {
            this.properties = {

            };
        } else {
            this.properties = {
                transition: (animate && this.config.animate) ? `all ${fast ? 150 : 500}ms ease-out` : "all 0ms ease-out",
                marginRight: this.rtl ? margin : "0",
                marginLeft: this.rtl ? "0" : margin,
                width: `${(this.width / this.perPage) * this.length}px`,
                transform: this.transform
            };
        }
    }

    get threshold() {
        return 50;
    }

    private get easing() {
        return "ease-out";
    }

    get perPage() {
        return this.spread && !this.portrait && !this.ttb ? 2 : 1;
    }

    get portrait() {
        if(this.orientationInternal == -1) {
            this.orientationInternal = window.innerHeight > window.innerWidth ? 1 : 0;
        }
        return this.orientationInternal === 1;
    }

    get single() {
        return !this.spread || this.portrait || this.ttb;
    }

    private get nLandscape() {
        return this.navigator.nLandscape ? this.navigator.nLandscape : 0;
    }

    get viewingPage() {
        if(this.single || this.ttb) return this.currentSlide;
        const spread = this.navigator.currentSpread(this);
        return spread && this.publication.Spine.indexOf(spread[spread.length-1]) || this.currentSlide;
    }

    get minViewingPage() {
        if(this.single || this.ttb) return this.currentSlide;
        const spread = this.navigator.currentSpread(this);
        return spread && this.publication.Spine.indexOf(spread[0]) || this.currentSlide;
    }

    get shift() {
        return this.navigator.shift;
    }

    get length() {
        if(this.single)
            return this.slength;
        const total = this.slength + this.nLandscape;
        return (this.shift && (total % 2 == 0)) ? total + 1 : total;
    }

    get slength() {
        return this.publication.spine.length;
    }

    get direction() { // TODO use enum
        return this.ttb ? "ttb" : (this.rtl ? "rtl" : "ltr");
    }

    toggleSpread() {
        if (this.single) {
            this.spread = true;
            this.currentSlide++;
            if (this.currentSlide % 2) // Prevent getting out of track
                this.prev();
            // console.log("single -> spread", this.currentSlide, this.minViewingPage);
        } else {
            if(this.currentSlide > 1) this.currentSlide = this.minViewingPage;
            this.spread = false;
        }
        requestAnimationFrame(() => this.resizeHandler(true));
    }

    onChange() {
        if(this.binder)
            this.guideHidden = true;
        this.zoomer.scale = 1;
        m.redraw();
        this.config.state.onPageChange(this.currentSlide + (this.single ? 1 : 0), this.direction, !this.single);
    }

    onLastPage() {
        if(this.config.state.onLastPage(this.series)) {
            const next = this.series.next;
            
            if(!next) { // No more chapters left
                this.bounce(this.rtl);
                return;
            }
            // Go to next chapter
            m.route.set("/:id", { id: next.uuid }, { replace: false });
        }
    }

    bounce(rtl = false) {
        requestAnimationFrame(() => {
            this.transform = `translate3d(${this.offset+(50 * (rtl ? 1 : -1))}px, 0, 0)`;
            this.updateProperties(true, true);
            m.redraw();
            setTimeout(() => {
                this.transform = `translate3d(${this.offset}px, 0, 0)`;
                this.updateProperties(true, true);
                m.redraw();
            }, 100);
        });
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
            this.onLastPage();
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
        } else
            this.bounce(!this.rtl);
    }
    

    /**
     * Go to slide with particular index
     * @param {number} index - Item index to slide to.
     */
    goTo(index: number) {
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

    get selector() {
        const br_spine = document.getElementById("br-spine");
        if(!br_spine) return null;
        return br_spine;
    }

    private get offset() {
        return (this.rtl ? 1 : -1) * this.currentSlide * (this.width / this.perPage);
    }

    /**
     * Moves sliders frame to position of currently active slide
     */
    slideToCurrent(enableTransition?: boolean, fast = true, changed = true) {
        // console.log("stc", this.currentSlide);
        if (this.ttb) {
            const br_slider = this.selector;
            if(!br_slider) return;
            const children = br_slider.children;
            requestAnimationFrame(() => { // TODO nicer animation. Right now you still see a flash of the top
                requestAnimationFrame(() => {
                    if(this && children && children[this.currentSlide])
                        children[this.currentSlide].children[0].scrollIntoView(true);
                    m.redraw();
                });
            });
            return;
        }
        if(this.single && !this.ttb && changed) // Scroll back to top for next/prev page
            window.setTimeout(() => {
                this && this.binder && this.binder.coordinator && this.binder.coordinator.HTML && this.binder.coordinator.HTML.scrollTo(0, 0);
            }, 100);

        this.updateDimensions();
        if (enableTransition) {
            // This one is tricky, I know but this is a perfect explanation:
            // https://youtu.be/cCOL7MC4Pl0
            requestAnimationFrame(() => {
                requestAnimationFrame(() => { 
                    this.transform = `translate3d(${this.offset}px, 0, 0)`;
                    this.updateProperties(true, fast);
                    m.redraw();
                });
            });
        } else {
            this.transform = `translate3d(${this.offset}px, 0, 0)`;
            this.updateProperties(false);
            m.redraw();
        }
    }
}