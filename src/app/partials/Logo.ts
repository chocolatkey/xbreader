import { t } from "ttag";
import m, { CVnode } from "mithril";

export interface LogoAttrs {
    readonly embedded: boolean;
    readonly name: string;
    readonly logo: string;
}

export default {
    view: ({attrs}: CVnode<LogoAttrs>) => {
        if(attrs.embedded) {
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
        if(!attrs.name || !attrs.logo)
            return null;
        return m("a.logo[href=/]", {
            target: "_parent"
        }, [
            m(`img[src=${attrs.logo}]`, {"title": attrs.name})
        ]);
    }
};
