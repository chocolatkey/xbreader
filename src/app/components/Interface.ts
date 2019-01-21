import m, {ClassComponent, Vnode, Child} from "mithril";
import Logo from "../partials/Logo";
import Ui from "xbreader/models/Ui";
import Slider from "xbreader/models/Slider";
import Reader from "./Reader";
import Publication from "xbreader/models/Publication";

export interface InterfaceAttrs {
    model: Ui;
    slider: Slider;
    reader: Reader;
}

export default class Interface implements ClassComponent<InterfaceAttrs> {
    oninit() {
        console.log("Interface initialized");
    }

    sliderMove(e: MithrilEvent, slider: Slider, publication: Publication) {
        e.redraw = false;
        if(publication.isTtb) {
            if(!slider.selector) return;
            window.scrollTo(0, slider.selector.scrollHeight * parseInt((e.target as HTMLInputElement).value) / 100);
        } else
            slider.goTo(parseInt((e.target as HTMLInputElement).value));
    }

    slider(slider: Slider, publication: Publication) {
        const attrs = {
            type: "range",
            min: "0",
            max: `${slider.length - (slider.shift ? 1 : 2)}`,//(slider.length % 2 ?  : slider.length),
            value: `${slider.currentSlide}`,
            step: `${slider.perPage}`,
            title: __("Select Page"),
            onchange: (e: MithrilEvent) => { // Activates when slider is released (mouse let go). Needed for IE compatibility
                this.sliderMove(e, slider, publication);
                (e.target as HTMLInputElement).blur();
            },
            oninput: (e: MithrilEvent) => { // Triggered on slider value changed (while dragging it!), works in evergreen browsers
                this.sliderMove(e, slider, publication);
            },
            dir: publication.rtl ? "rtl" : "ltr"
        };
        if(publication.isTtb) {
            attrs.max = `${100}`;
            attrs.value = `${(document.documentElement.scrollTop + document.body.scrollTop) / document.documentElement.scrollHeight * 100}`;
            attrs.step = "any";
        }
        return m("input.br-slider", attrs);
    }

    sliderSystem(slider: Slider, publication: Publication, embedded: boolean) {        
        let items = [
            this.slider(slider, publication)
        ];

        const currentPageIndicator = m("span.br-slider__pagenum", {
            title: __("Current Page"),
            onclick: () => {
                const newPage = parseInt(prompt(`${__("Input a page number")} (${1}-${publication.pmetadata.NumberOfPages})`, (slider.currentSlide + 1).toString())) - 1;
                if(newPage !== (slider.currentSlide + 1) && newPage >= 0 && newPage < publication.pmetadata.NumberOfPages)
                    slider.goTo(newPage);
            }
        }, publication.navi.getPageString(slider));
        const pageAmountIndicator = m("span.br-slider__pagenum-last", {
            title: __("# of Pages")
        }, publication.pmetadata.NumberOfPages);

        if(publication.rtl) {
            items.unshift(pageAmountIndicator);
            items.push(currentPageIndicator);
        } else {
            items.unshift(currentPageIndicator);
            if(!publication.isTtb)
                items.push(pageAmountIndicator);
        }

        const sseries = publication.findSpecial("series") && publication.findSpecial("series").Value;
        if(sseries && sseries.next && !embedded) { // Has a next chapter
            const nextLink =
                m(`span.br-slider__${publication.rtl ? "lgo" : "rgo"}`, { // Leftmost slider control
                    title: __("Go to the next chapter")
                }, m("a", {
                    href: "/" + sseries.next.uuid,
                    oncreate: m.route.link({ replace: false } as any),
                    onupdate: m.route.link({ replace: false } as any)
                } as any as m.Attributes, __("Next") as Child));
            if(publication.rtl)
                items.unshift(nextLink);
            else
                items.push(nextLink);
        }
        if(sseries && sseries.prev && !embedded) {
            const prevLink = // Has a previous chapter
                m(`span.br-slider__${publication.rtl ? "rgo" : "lgo"}`, {
                    title: __("Go to the previous chapter")
                }, m("a", {
                    href: "/" + sseries.prev.uuid,
                    oncreate: m.route.link({ replace: false } as any),
                    onupdate: m.route.link({ replace: false } as any)
                } as any as m.Attributes, __("Prev") as Child));
            if(publication.rtl)
                items.push(prevLink);
            else
                items.unshift(prevLink);
        }
        return m("div.br-botbar-container", items);
    }

    view(vnode: Vnode<InterfaceAttrs, this>) {
        const ui = vnode.attrs.model;
        const brand = vnode.attrs.reader.config.brand;
        const tabConfig = vnode.attrs.reader.config.tabs;
        const slider = vnode.attrs.slider;
        const publication = vnode.attrs.reader.publication;
        slider.resolveSlidesNumber();
        const isPortrait = window.innerHeight > window.innerWidth ? true : false;

        let tweakButton: Vnode;
        if (slider.ttb) // Vertical tweaking
            tweakButton = m("button#br-view__tweak", {
                onclick: () => {
                    slider.fit = !slider.fit;
                },
                title: slider.fit ? __("Fit to width") : __("Fit to height"),
            }, [
                m("i", {
                    class: slider.fit ? "br-i-wide" : "br-i-thin"
                })
            ]);
        else // Horizontal tweaking
            tweakButton = m("button#br-view__tweak", {
                onclick: () => {
                    slider.toggleSpread();
                },
                title: slider.single ? __("Spread view") : __("Single page view"),
            }, [
                m("i", {
                    class: slider.single ? "br-i-spread" : "br-i-single"
                })
            ]);

        const tabs: Vnode[] = [];
        const tabBar = [];
        const tabToggle = [];
        tabConfig.forEach(tab => {
            tabs.push(m("a.br-tab", {
                title: tab.title,
                href: tab.href
            }, [
                m(`i.br-i-${tab.icon}`, {
                    "aria-hidden": "true"
                })
            ]));
        });
        if(tabs.length > 0) { // Tabs exist, show tab functionality
            tabToggle.push(m("button.br-tab.br-cmenu__toggle", {
                title: __("Menu"),
                onclick: () => {
                    ui.toggleMenu();
                }
            }, [
                m("i.br-i-apps", {
                    "aria-hidden": "true"
                })
            ]));
            tabBar.push(m("nav.br-tab-bar", tabs));
        }
        return [
            m("div.noselect#br-topbar", {
                class: ui.isHidden ? "hidden" : "shown"
            }, [
                m("div.br-topbar__row", [
                    m("section.br-toolbar__section.br-toolbar__section--align-start", {
                        class: brand.embedded ? "embedded" : ""
                    }, [
                        m(Logo, brand)
                    ]),
                    m("section.br-toolbar__tsection", [
                        brand.embedded ? m("span.br-toolbar__ellipsis", publication.series.Name as Child) : m("a.br-toolbar__ellipsis", {
                            href: publication.series.Identifier,
                            title: __("Series")
                        }, publication.series.Name as Child),
                        m("span.spacer", "›"),
                        brand.embedded ? m("span#br-chapter", publication.pmetadata.Title as Child) : vnode.attrs.reader.series.selector
                    ]),
                    m("section.br-toolbar__section.br-toolbar__section--align-end.dhide", {
                        class: brand.embedded ? "gone" : ""
                    }, [
                        m("div", [
                            m("nav.br-tab-bar", tabToggle)
                        ])
                    ]),
                    m("section.br-toolbar__section.br-toolbar__section--align-end.br-cmenu", {
                        class: brand.embedded ? "gone" : (ui.menuShown ? "shown" : "sgone")
                    }, [
                        m("div", tabBar)
                    ])
                ])
            ]),
            m("div#br-botbar.noselect", {
                class: ui.isHidden ? "hidden" : "shown"
            }, [
                this.sliderSystem(slider, publication, brand.embedded),
                m("div.br-botbar-controls", {
                    class: isPortrait ? "portrait" : "landscape",
                    style: publication.isTtb ? "display: none;" : null,
                }, [
                    tweakButton,
                    m("button#br-view__rvm", {
                        title: "",
                        onclick: () => {
                            const reader = vnode.attrs.reader;
                            slider.zoomer.scale = 1;
                            reader.switchDirection();
                        }
                    }, [
                        m("i#br-view__toggle", {
                            title: __("Toggle reading direction"),
                            class: slider.ttb ? "br-i-horizontal" : "br-i-vertical"
                        })
                    ])
                ])
            ])
        ];
    }
}