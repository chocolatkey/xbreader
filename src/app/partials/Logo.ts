import { t } from "ttag";
import m, { CVnode } from "mithril";

export interface LogoAttrs {
    readonly brand: XBBrand;
}

export default {
    view: ({attrs}: CVnode<LogoAttrs>) => {
        if(attrs.brand.embedded) {
            return m("button#br-embedded__back", {
                onclick: () => {
                    window.parent.postMessage("xbr:back", "*");
                },
                title: t`Back`
            }, [
                m("i", {
                    class: "br-i-arrow_back"
                })
            ]);
        }
        if(!attrs.brand.name || !attrs.brand.logo)
            return null;
        return m("a.logo", {
            target: "_parent",
            href: attrs.brand.href || "/"
        }, [
            m(`img[src=${attrs.brand.logo}]`, {"title": attrs.brand.name})
        ]);
    }
};
