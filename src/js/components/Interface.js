import m from "mithril";
import Logo from "../partials/Logo";

export default class Interface {
    oninit() {
        this.isHidden = true; // == vnode.state.hidden
        this.hello = "world";
        this.menuShown = false;
        console.log("Interface initialized");
    }

    toggleMenu(newState) {
        if (newState == null)
            this.menuShown = !this.menuShown;
        else if (this.menuShown != newState)
            this.menuShown = newState;
        else
            return;
    }

    // TODO this.isHidden undefined for retardedness, move to config state
    toggle(newState) {
        if (newState == null)
            this.isHidden = !this.isHidden;
        else if (!!this.isHidden == newState) {
            this.isHidden = !newState;
        } else {
            return false;
        }
        if(this.isHidden)
            this.toggleMenu(false);
        return true;
    }

    sliderMove(e, slider, publication) {
        e.redraw = false;
        if(publication.isTtb)
            slider.selector.scrollTo(0, slider.selector.scrollHeight * e.target.value / 100);
        else
            slider.goTo(parseInt(e.target.value));
    }

    slider(slider, publication) {
        const attrs = {
            type: "range",
            min: 0,
            max: slider.length - (slider.config.shift ? 1 : 2),//(slider.length % 2 ?  : slider.length),
            value: slider.currentSlide,
            step: slider.perPage,
            title: __("Select Page"),
            onchange: (e) => { // Activates when slider is released (mouse let go). Needed for IE compatibility
                this.sliderMove(e, slider, publication);
            },
            oninput: (e) => { // Triggered on slider value changed (while dragging it!), works in evergreen browsers
                this.sliderMove(e, slider, publication);
            },
            dir: publication.rtl ? "rtl" : "ltr"
        };
        if(publication.isTtb) {
            attrs.max = 100;
            attrs.value = slider.selector.scrollTop / slider.selector.scrollHeight * 100;
            attrs.step = "any";
        }
        return m("input.br-slider", attrs);
    }

    sliderSystem(slider, publication) {        
        let items = [
            this.slider(slider, publication)
        ];

        const currentPageIndicator = m("span.br-slider__pagenum", {
            title: __("Current Page")
        }, publication.navi.getPageString(slider));
        const pageAmountIndicator = m("span.br-slider__pagenum-last", {
            title: __("# of Pages")
        }, publication.pmetadata.numberOfPages);

        if(publication.rtl) {
            items.unshift(pageAmountIndicator);
            items.push(currentPageIndicator);
        } else {
            items.unshift(currentPageIndicator);
            if(!publication.isTtb)
                items.push(pageAmountIndicator);
        }

        items.unshift([
            m("span.br-slider__lgo", { // Leftmost slider control
                title: publication.rtl ? __("Go to the next chapter") : __("Go to the previous chapter")
            }, m("a", {
                href: "#"
            }, publication.rtl ? __("Next") : __("Prev")))
        ]);
        items.push([ // Rightmost slider control
            m("span.br-slider__rgo", {
                title: publication.rtl ? __("Go to the previous chapter") : __("Go to the next chapter")
            }, m("a", {
                href: "#"
            }, publication.rtl ? __("Prev") : __("Next")))
        ]);

        return m("div.br-botbar-container", items);
    }

    view(vnode) {
        const self = vnode.attrs.reader.interface;
        const slider = vnode.attrs.reader.slider;
        const publication = vnode.attrs.reader.publication;
        let bClass = "default available"; // TODO when actually available
        let fClass = "default available";
        if (this.hoverBack) {
            bClass += " hover";
        }
        if (this.hoverForward) {
            fClass += " hover";
        }
        slider.resolveSlidesNumber();
        const isPortrait = window.innerHeight > window.innerWidth ? true : false;

        let tweakButton = [];
        if (slider.config.ttb) // Vertical tweaking
            tweakButton = m("button#br-view__tweak", {
                onclick: () => {
                    slider.config.fit = !slider.config.fit;
                },
                title: slider.config.fit ? __("Fit to width") : __("Fit to height"),
            }, [
                m("i", {
                    class: slider.config.fit ? "br-i-wide" : "br-i-thin"
                })
            ]);
        else // Horizontal tweaking
            tweakButton = m("button#br-view__tweak", {
                onclick: () => {
                    if (slider.config.perPage == 1) {
                        slider.config.perPage = 2;
                        slider.currentSlide++;
                        if (slider.currentSlide % 2) // Prevent getting out of track
                            slider.prev();
                    } else {
                        slider.config.perPage = 1;
                        if(slider.currentSlide > 1) slider.currentSlide--;
                    }
                    slider.resizeHandler();
                },
                title: slider.single ? __("Spread view") : __("Single page view"),
            }, [
                m("i", {
                    class: slider.single ? "br-i-spread" : "br-i-single"
                })
            ]);

        return [
            m("div.noselect#br-topbar", {
                class: self.isHidden ? "hidden" : "shown"
            }, [
                m("div.br-topbar__row", [
                    m("section.br-toolbar__section.br-toolbar__section--align-start", [
                        /*m("a.br-i-menu.br-topbar__icon.menu-toggle[href=#]", {
                            title: "Menu"
                        }),*/
                        m("a.logo[href=/]", [
                            m(Logo)
                        ])
                    ]),
                    m("section.br-toolbar__tsection", [
                        m("a", {
                            href: publication.pmetadata.belongs_to.series.identifier,
                            title: __("Series")
                        }, publication.pmetadata.belongs_to.series.name),
                        m("span.spacer", "›"),
                        /*m("a#br-chapter", {
                            href: "#", // TODO
                            title: "Chapter selection"
                        }, publication.pmetadata.title),*/
                        m("select#br-chapter", {
                            title: __("Chapter selection")
                        }, [
                            // TODO options loader
                            m("option", {
                                value: "b38fc336-531d-4eff-be25-311d21bf2902",
                                selected: "",
                            }, publication.pmetadata.title),
                            m("option", __("Loading...")),
                        ])
                    ]),
                    m("section.br-toolbar__section.br-toolbar__section--align-end.dhide", [
                        m("div", [
                            m("nav.br-tab-bar", [
                                m("button.br-tab.br-cmenu__toggle", {
                                    title: __("Menu"),
                                    onclick: () => {
                                        self.toggleMenu();
                                    }
                                }, [
                                    m("i.br-i-apps", {
                                        "aria-hidden": "true"
                                    })
                                ])
                            ])
                        ])
                    ]),
                    m("section.br-toolbar__section.br-toolbar__section--align-end.br-cmenu", {
                        class: self.menuShown ? "shown" : "gone"
                    }, [
                        m("div", [
                            m("nav.br-tab-bar", [
                                m("a.br-tab", {
                                    title: "Latest",
                                    href: "/r/latest"
                                }, [
                                    m("i.br-i-latest", {
                                        "aria-hidden": "true"
                                    })
                                ]),
                                m("a.br-tab", {
                                    title: "Directory",
                                    href: "/r/directory"
                                }, [
                                    m("i.br-i-list", {
                                        "aria-hidden": "true"
                                    })
                                ]),
                                m("a.br-tab", {
                                    title: "Search",
                                    href: "/r/search"
                                }, [
                                    m("i.br-i-search", {
                                        "aria-hidden": "true"
                                    })
                                ])
                            ])
                        ])
                    ])
                ])
            ]),
            m("div#bibi-arrow-back", {
                title: "Previous",
                onmouseover: () => this.hoverBack = true,
                onmouseout: () => this.hoverBack = false,
                class: bClass
            }),
            m("div#bibi-arrow-forward", {
                title: "Next",
                onmouseover: () => this.hoverForward = true,
                onmouseout: () => this.hoverForward = false,
                class: fClass
            }),
            m("div#br-botbar.noselect", {
                class: self.isHidden ? "hidden" : "shown"
            }, [
                this.sliderSystem(slider, publication),
                m("div.br-botbar-controls", {
                    class: isPortrait ? "portrait" : "landscape",
                    style: publication.isTtb ? "display: none;" : null,
                }, [
                    tweakButton,
                    m("button#br-view__rvm", {
                        title: "",
                        onclick: () => {
                            const reader = vnode.attrs.reader;
                            reader.zoomer.scale = 1;
                            reader.switchDirection();
                        }
                    }, [
                        m("i#br-view__toggle", {
                            title: __("Toggle reading direction"),
                            class: slider.config.ttb ? "br-i-horizontal" : "br-i-vertical"
                        })
                    ])
                ])
            ])
        ];
    }
}