import m, { CVnode } from "mithril";

export interface LogoAttrs {
    embedded: boolean;
    name: string;
    logo: string;
}

export default {
    view: ({attrs}: CVnode<LogoAttrs>) => {
        if(attrs.embedded) {
            return m("button#br-embedded__back", {
                onclick: () => {
                    window.parent.postMessage("xbr:back", "*");
                },
                title: __("Back")
            }, [
                m("i", {
                    class: "br-i-arrow_back"
                })
            ]);
        }
        if(!attrs.name || !attrs.logo)
            return null;
        return m("a.logo[href=/]", [
            m(`img[src=${attrs.logo}]`, {"title": attrs.name})
        ]);
    }
};
