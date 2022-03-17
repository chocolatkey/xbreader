import { t } from "ttag";
import m, { CVnode, ChildArray, Child, Vnode, ClassComponent } from "mithril";
import Slider, { DEFAULT_MARGIN } from "xbreader/models/Slider";
import Peripherals from "xbreader/helpers/peripherals";
import { chooserFunction, worker } from "xbreader/helpers/lazyLoader";
import Page from "./Page";
import ReflowablePage from "./ReflowablePage";
import Link from "../models/Link";
import Loader from "../partials/Loader";
import Skeleton from "../partials/Skeleton";
import Config, { RenderConfig } from "../models/Config";

export interface ReflowableSpineAttrs {
    readonly slider: Slider;
    readonly config: Config;
    readonly binder: Peripherals;
    readonly spine: Link[];
}

interface PData {
    link: Link;
    blob: string;
    sections?: Element[];
}

function getContentholder(el: HTMLElement): Element {
    if(el.childElementCount !== 1) return el;
    return el.children[0];
}

function hasTextContent(el: HTMLElement): boolean {
    return el.textContent.trim().length > 0;
}

const SEPARATE_ELEMENTS = ["IMG", "IMAGE"];

export default class ReflowableSpine implements ClassComponent<ReflowableSpineAttrs> {
    loaded = false;
    dats: PData[] = [];

    oninit({attrs}: CVnode<ReflowableSpineAttrs>) {
        Promise.all(attrs.spine.map(link => new Promise<PData>((resolve: (d: PData)=> void, reject: (e: Error)=> void) => {
            const handler = (e: MessageEvent) => {
                if (e.data.src === link.Href) {
                    (e.target as Worker).removeEventListener("message", handler);
                    if (e.data.error) {
                        reject(new Error(e.data.error));
                    }
                    if(e.data.url) {
                        if(link.TypeLink.indexOf("html") !== 0 && !link.findFlag("final"))
                            fetch(e.data.url).then(r => r.text()).then(plaintext => {
                                const doc = (new DOMParser()).parseFromString(plaintext, link.TypeLink as DOMParserSupportedType);
                                const sections: Element[] = [];
                                Array.from(doc.getElementsByTagName("section")).forEach(el => {
                                    if(el?.childNodes.length === 0) return;
                                    const ch = getContentholder(el);
                                    const nodes = Array.from(ch.childNodes) as Element[];
                                    for (let i = 0, j = 0; i < nodes.length; i = j) {
                                        let section: Element;
                                        if(sections.length > 0 && sections[sections.length-1]?.innerHTML.trim().length === 0) {
                                            section = sections[sections.length-1] as Element;
                                        } else {
                                            section = ch.cloneNode(false) as Element;
                                            sections.push(section);
                                        }

                                        if (SEPARATE_ELEMENTS.includes(nodes[j].tagName?.toUpperCase())) {
                                            nodes[j].setAttribute("draggable", "false");
                                            nodes[j].classList.add("noselect");
                                            section.appendChild(nodes[j++]);
                                            continue;
                                        }

                                        while (j < nodes.length && !SEPARATE_ELEMENTS.includes(nodes[j].tagName?.toUpperCase())) {
                                            section.appendChild(nodes[j++]);
                                        }
                                    }
                                });
                                resolve({blob: e.data.url, link, sections});
                            });
                        else
                            resolve({blob: e.data.url, link});
                    } else
                        reject(new Error("No data received from worker!"));
                }
            };
            worker.addEventListener("message", handler);
            worker.postMessage({src: link.Href, mode: "FETCH", type: link.TypeLink});
        }))).then((dats => this.dats = dats));
    }

    onremove() {
        this.dats?.forEach(dat => URL.revokeObjectURL(dat.blob));
    }


    view({attrs}: CVnode<ReflowableSpineAttrs>) {
        const slider = attrs.slider;
        const binder = attrs.binder;
        if(!slider)
            return null;

        if(this.dats.length === 0) return m(Skeleton, {
            perPage: slider.perPage,
            margin: DEFAULT_MARGIN
        });
        const margin = slider.reflowableMargin;

        return m("div#br-spine.reflowable" + (slider.single ? ".single" : ".double"), {
            style: slider.properties,
            key: `reflowable-spine-${slider.perPage}`,
            onupdate: (vnode) => {
                slider.rlength = Math.max(1, Math.ceil(vnode.dom.scrollWidth / (vnode.dom as HTMLElement).offsetWidth));
            },
            ontouchstart: binder ? binder.touchstartHandler : null,
            ontouchend: binder ? binder.touchendHandler : null,
            onmouseup: binder ? binder.mouseupHandler : null,
            onmousedown: binder ? binder.mousedownHandler : null,
            "aria-label": t`Spine`
        }, m("div.br-content", {
            style: `height: 100%;
            width: 100%;
            overflow: visible;`
        }, this.dats.map((pdata, j) => {
            if(pdata.sections)
                return pdata.sections.map((d, i) => m("div.br-section", {
                    key: `${j}-${pdata.link.Href}#${i}`,
                    "aria-label": t`Section`,
                    style: {
                        breakAfter: "column",
                        "-webkit-column-break-after": "column",
                        width: slider.ttb ? `calc(100% - ${margin*2}px)` : "100%",
                        "--xb-margin": `${DEFAULT_MARGIN}px`,
                        "--xb-font-size": `${attrs.config.size*100}%`,
                        "--xb-font-family": attrs.config.font,
                        "--xb-line-height": `${attrs.config.height}em`,
                        "--xb-text-align": attrs.config.align,
                        "--xb-color": attrs.config.foreground,
                        "--xb-background": attrs.config.background,
                        padding: slider.ttb ? ( // TODO clean up this mess
                            hasTextContent(
                                getContentholder(d as HTMLElement) as HTMLElement
                            ) ? (slider.fit ? `${DEFAULT_MARGIN}px ${margin}px` : `${margin}px`)
                              : (
                                  SEPARATE_ELEMENTS.includes(getContentholder(d as HTMLElement).tagName?.toUpperCase())
                                  ? `${DEFAULT_MARGIN}px ${margin}px` : "0"
                                )
                        ) : "0"
                    }
                }, m.trust(d.innerHTML)));
            else return m("div.br-section", {"aria-label": t`Container`}, m(ReflowablePage, {
                    data: pdata.link,
                    // key: `${j}-${pdata.link.Href}`,
                    index: j,
                    slider: slider,
                    renderConfig: attrs.config.state.render as RenderConfig,
                    chooseCallback: attrs.config.state.onSource as unknown as chooserFunction,
                    binder: binder,
                    blank: false
                }));
        })));
    }
}