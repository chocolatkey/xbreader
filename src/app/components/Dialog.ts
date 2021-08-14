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
        return m("div.br-dialog__container", {
            onclick: (e: UIEvent) => {
                if((e.target as HTMLElement).className !== "br-dialog__container")
                    return true;
                attrs.ui.toggleDialog(false);
                e.preventDefault();
            }
        }, m("div.br-dialog.nopad", [
            m("iframe", {
                scrolling: "no",
                src: attrs.ui.dialogSrc
            })
        ]));
    }
}