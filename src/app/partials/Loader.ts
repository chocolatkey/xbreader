import { t } from "ttag";
import m, { CVnode } from "mithril";

export interface LoadingAttrs {
    readonly status: string;
}

export default {
    view: ({attrs}: CVnode<LoadingAttrs>) => m("div.br-loader__container", [
        m("div.spinner#br-loader__spinner"),
        m("span#br-loader__message", attrs.status)
    ])
};
