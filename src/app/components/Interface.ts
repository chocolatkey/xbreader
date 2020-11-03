import { t } from "ttag";
import m, {ClassComponent, Vnode, Child} from "mithril";
import Logo from "../partials/Logo";
import Ui from "xbreader/models/Ui";
import Slider from "xbreader/models/Slider";
import Reader from "./Reader";
import Publication from "xbreader/models/Publication";
import Settings from "./Settings";
import Config from '../models/Config';

export interface InterfaceAttrs {
    readonly model: Ui;
    readonly slider: Slider;
    readonly reader: Reader;
    readonly config: Config;
}

export default class Interface implements ClassComponent<InterfaceAttrs> {
    oninit(vnode: Vnode<InterfaceAttrs, this>) {
        console.log("Interface initialized");
    }

    sliderMove(e: MithrilEvent, slider: Slider, publication: Publication) {
        e.redraw = false;
        if(publication.isTtb) {
            if(!slider.selector) return;
            slider.binder.coordinator.HTML.scrollTo(0, (slider.selector.getBoundingClientRect().height - slider.innerHeightCached) * parseFloat((e.target as HTMLInputElement).value) / 100);
        } else
            slider.goTo(parseInt((e.target as HTMLInputElement).value));
    }

    slider(slider: Slider, publication: Publication) {
        const attrs = {
            type: "range",
            min: "0",
            max: `${slider.length - 1}`, //(slider.length % 2 ?  : slider.length), or (slider.shift ? 1 : 2)
            value: `${slider.currentSlide}`,
            step: `${slider.perPage}`,
            title: t`Select Page`,
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
            attrs.value = `${slider.percentage}`;
            attrs.step = "any";
        }
        return m("input.br-slider", attrs);
    }

    sliderSystem(slider: Slider, publication: Publication, embedded: boolean) {        
        const items = [
            this.slider(slider, publication)
        ];

        const currentPageIndicator = m("span.br-slider__pagenum", {
            title: t`Current Page`,
            onclick: () => {
                if(slider.toon) return;
                const newPage = parseInt(prompt(`${t`Input a page number`} (${1}-${publication.pmetadata.NumberOfPages})`, (slider.currentSlide + 1).toString())) - 1;
                if(newPage !== (slider.currentSlide + 1) && newPage >= 0)
                    slider.goTo(newPage);
            }
        }, publication.navi.getPageString(slider));
        const pageAmountIndicator = m("span.br-slider__pagenum-last", {
            title: t`# of Pages`
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
                    title: t`Go to the next chapter`
                }, m(m.route.Link, {
                    href: "/" + sseries.next.uuid,
                    options: {replace: false}
                }, t`Next` as Child));
            if(publication.rtl)
                items.unshift(nextLink);
            else
                items.push(nextLink);
        }
        if(sseries && sseries.prev && !embedded) {
            const prevLink = // Has a previous chapter
                m(`span.br-slider__${publication.rtl ? "rgo" : "lgo"}`, {
                    title: t`Go to the previous chapter`
                }, m(m.route.Link, {
                    href: "/" + sseries.prev.uuid,
                    options: {replace: false}
                }, t`Prev` as Child));
            if(publication.rtl)
                items.push(prevLink);
            else
                items.unshift(prevLink);
        }
        return m("div.br-botbar-container", items);
    }

    view(vnode: Vnode<InterfaceAttrs, this>) {
        const ui = vnode.attrs.model;
        const brand = vnode.attrs.reader.config.state.brand;
        const tabConfig = vnode.attrs.reader.config.state.tabs;
        const slider = vnode.attrs.slider;
        const publication = vnode.attrs.reader.publication;
        const series = vnode.attrs.reader.series;
        const config = vnode.attrs.config;

        let tweakButton: Vnode;
        if (slider.ttb) // Vertical tweaking
            tweakButton = m("button#br-view__tweak", {
                onclick: () => {
                    slider.fit = !slider.fit;
                    if(publication.isTtb) slider.slideToCurrent(false, true);
                },
                title: slider.fit ? (publication.isTtb ? t`Widen` : t`Fit to width`) : (publication.isTtb ? t`Narrow` : t`Fit to height`)
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
                title: slider.single ? t`Spread view` : t`Single page view`,
                "aria-label": slider.single ? t`Spread view` : t`Single page view`
            }, [
                m("i", {
                    class: slider.single ? "br-i-spread" : "br-i-single",
                    "aria-hidden": "true"
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
                title: t`Menu`,
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
        const barClass = (ui.isHidden ? "hidden" : "shown") + (config.animate ? " animate" : "");
        const retval = [
            m("div.noselect#br-topbar", {
                class: barClass,
                "aria-label": t`Top bar`
            }, [
                m("div.br-topbar__row", [
                    m("section.br-toolbar__section.br-toolbar__section--align-start", {
                        class: brand.embedded ? "embedded" : "",
                        "aria-label": t`Logo`
                    }, [
                        m(Logo, brand)
                    ]),
                    m("section.br-toolbar__tsection", {"aria-label": t`Title`}, [
                        series.exists ? (brand.embedded ? m("span.br-toolbar__ellipsis", series.firstSeries.Name as Child) : [m("a.br-toolbar__ellipsis", {
                            href: series.firstSeries.Identifier,
                            title: t`Series`
                        }, series.firstSeries.Name as Child),
                        m("span.spacer", "›")]) : null,
                        brand.embedded ? m("span#br-chapter", publication.pmetadata.Title as Child) : vnode.attrs.reader.series.selector
                    ]),
                    m("section.br-toolbar__section.br-toolbar__section--align-end.dhide", {
                        class: brand.embedded ? "gone" : "",
                        "aria-label": t`Menu toggle`
                    }, [
                        m("div", [
                            m("nav.br-tab-bar", tabToggle)
                        ])
                    ]),
                    m("section.br-toolbar__section.br-toolbar__section--align-end.br-cmenu", {
                        class: brand.embedded ? "gone" : (ui.menuShown ? "shown" : "sgone"),
                        "aria-label": t`Menu`
                    }, [
                        m("div", tabBar)
                    ])
                ])
            ]),
            m("div#br-botbar.noselect", {
                class: barClass,
                "aria-label": t`Bottom bar`
            }, [
                this.sliderSystem(slider, publication, brand.embedded),
                m("div.br-botbar-controls", {
                    class: slider.portrait ? "portrait" : "landscape"
                }, [
                    (!publication.isTtb || !publication.isSmallToon) && tweakButton,
                    !publication.isTtb && m("button#br-view__rvm", {
                        title: t`Toggle reading direction`,
                        onclick: () => {
                            const reader = vnode.attrs.reader;
                            slider.zoomer.scale = 1;
                            reader.switchDirection();
                        }
                    }, [
                        m("i#br-view__toggle", {
                            "aria-hidden": "true",
                            class: slider.ttb ? "br-i-horizontal" : "br-i-vertical"
                        })
                    ])
                ])
            ])
        ];
        
        if(ui.settingsShown)
            retval.push(m(Settings, {
                config,
                ui
            }));
        return retval;
    }
}