import { t } from "ttag";
import m, { ClassComponent, Vnode } from "mithril";
import Reader from "xbreader/components/Reader";

export interface ReadAttrs {
    readonly id: string;
    readonly nav: string;
}

export default class ReadView implements ClassComponent<ReadAttrs> {
    config: XBConfig;
    cid: string;

    constructor(config: XBConfig) {
        this.config = config;
        this.cid = null; // Content ID
    }

    oninit({attrs}: Vnode<ReadAttrs, this>) { // Welcome
        if(attrs.id) {
            this.cid = attrs.id;
            const xRegex = /^[@-Za-z(-;=\\_!]+$/i;
            if(!xRegex.test(this.cid)) {
                console.error("Invalid content ID");
                m.route.set("/error/:code/:message", { code: 400, message: t`Invalid content ID` }, { replace: true });
                this.cid = null;
            }
        }
    }

    view({attrs}: Vnode<ReadAttrs, this>) {
        return [
            m(Reader as any as Reader, {cid: attrs.id, config: this.config})
        ];
    }
}