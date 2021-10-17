import m, {
    ClassComponent,
    CVnode
} from "mithril";
import Config from "../models/Config";
import Slider from "../models/Slider";
import Ui from "../models/Ui";


export interface DialogAttrs {
    readonly config: Config;
    readonly ui: Ui;
    readonly slider: Slider;
}

export default class Dialog implements ClassComponent<DialogAttrs> {
    view({attrs}: CVnode<DialogAttrs>) {
        const iframeStyle = (attrs.ui.dialogData.minWidth > 0 ? `min-width: ${attrs.ui.dialogData.minWidth};` : "") +
        (attrs.ui.dialogData.maxWidth > 0 ? `max-width: ${attrs.ui.dialogData.maxWidth};` : "") +
        (attrs.ui.dialogData.minHeight > 0 ? `min-height: ${attrs.ui.dialogData.minHeight};` : "") +
        (attrs.ui.dialogData.maxHeight > 0 ? `max-height: ${attrs.ui.dialogData.maxHeight};` : "");
        console.log("IFS", iframeStyle);
        return m("div.br-dialog__container", {
            onclick: (e: UIEvent) => {
                if((e.target as HTMLElement).className !== "br-dialog__container")
                    return true;
                attrs.ui.toggleDialog(false);
                e.preventDefault();
            }
        }, m("div.br-dialog.nopad", [
            m("iframe", {
                style: iframeStyle,
                scrolling: "no",
                src: attrs.ui.dialogData.src
            })
        ]));
    }
}