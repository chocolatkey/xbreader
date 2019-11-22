import { t } from "ttag";
import m, {
    ClassComponent,
    CVnode
} from "mithril";
import Ui from "xbreader/models/Ui";
import Config from "../models/Config";

export interface SettingsAttrs {
    readonly config: Config;
    readonly ui: Ui;
}

export default class Settings implements ClassComponent <SettingsAttrs> {
    view({attrs}: CVnode <SettingsAttrs> ) {
        return m("div.br-dialog__container", {
            onclick: (e: UIEvent) => {
                if((e.target as HTMLElement).className !== "br-dialog__container")
                    return true;
                attrs.ui.toggleSettings(false);
                e.preventDefault();
            }
        }, m("div.br-dialog", [
            m("h1", t`Global Settings`),
            m("form.br-form", attrs.config.settings.map((setting) => 
                m("div.br-form__input", [
                    m("div.br-form__input__label.br-help", {
                        title: setting.description
                    }, setting.title),
                    m("div.br-form__input__options", {
                        role: "radiogroup"
                    }, setting.options.map((option) =>
                        [
                            m("input.br-form__input__options__input", {
                                type: "radio",
                                name: setting.name,
                                value: option.value,
                                checked: setting.value === option.value ? "checked" : null,
                                tabindex: setting.value === option.value ? "0" : "-1",
                                id: "xbsetting-" + setting.name + "-" + option.value,
                                onchange: (e: MithrilEvent) => {
                                    attrs.config.settings.find(s => s.name === setting.name).value = option.value;
                                    if(attrs.config.saveSettings())
                                        attrs.ui.notify(t`Settings saved!`);
                                    else
                                        attrs.ui.notify(t`Failed saving settings`);
                                }
                            }),
                            m("label.br-form__input__options__label", {
                                for: "xbsetting-" + setting.name + "-" + option.value,
                                title: option.description
                            }, option.label)
                        ]
                    ))
                ])
            )),
            m("span", [
                /*m("button", {
                    onclick: () => {
                        // apply
                    }
                }, t`Apply`),*/
                m("button", {
                    onclick: () => {
                        attrs.ui.toggleSettings(false);
                    }
                }, t`Close`)
            ])]
        ));
    }

}