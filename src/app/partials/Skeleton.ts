import { t } from "ttag";
import m, { CVnode } from "mithril";

export interface SkeletonAttrs {
    readonly perPage: number;
    readonly margin: number;
}

export default {
    view: ({attrs}: CVnode<SkeletonAttrs>): m.Vnode => m("div.br-skeleton", {
        style: {
            "--xb-margin": `${attrs.margin}px`
        }
    }, Array.apply(null, Array(attrs.perPage)).map((n: number) => m(attrs.perPage > 1 ? ".half" : "", {
        key: n
    }, "")))
};
