import { t } from "ttag";
import m, {
    ClassComponent,
    CVnode
} from "mithril";
import Ui from "xbreader/models/Ui";
import Config, { XBOptionType, XBOptionTypeSpinnerOptions } from "xbreader/models/Config";
import xbError from "../models/xbError";
import Slider from "../models/Slider";

export interface SettingsAttrs {
    readonly config: Config;
    readonly ui: Ui;
    readonly slider: Slider;
}

const oval = ((o: XBOption) => o.value.toString().replace(/[ ,"'+#]+/g, "_"));

export default class Settings implements ClassComponent<SettingsAttrs> {
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
            m("form.br-form", attrs.config.settings.map((setting) => {
                if(!attrs.slider.reflowable && setting.reflowable) return null;
                switch (setting.type) {
                    case XBOptionType.Radio:
                        return m("div.br-form__input", [
                            m("div.br-form__input-label" + (setting.description ? ".br-help" : ""), {
                                title: setting.description
                            }, setting.title),
                            m("div.br-form__input-radio", {
                                role: "radiogroup"
                            }, setting.options.map((option) =>
                                [
                                    m("input.br-form__input-radio__input", {
                                        type: "radio",
                                        name: setting.name,
                                        value: option.value,
                                        checked: setting.value === option.value ? "checked" : null,
                                        tabindex: setting.value === option.value ? "0" : "-1",
                                        id: "xbsetting-" + setting.name + "-" + oval(option),
                                        onchange: (e: MithrilEvent) => {
                                            attrs.config.setSetting(setting.name, option.value);
                                            if(attrs.config.saveSettings())
                                                attrs.ui.notify(t`Settings saved!`);
                                            else
                                                attrs.ui.notify(t`Failed saving settings`);
                                        }
                                    }),
                                    m("label.br-form__input-radio__label", {
                                        for: "xbsetting-" + setting.name + "-" + oval(option),
                                        title: option.description
                                    }, option.label)
                                ]
                            ))
                        ]);
                    case XBOptionType.Dropdown:
                        return m("div.br-form__input", [
                            m("div.br-form__input-label" + (setting.description ? ".br-help" : ""), {
                                title: setting.description
                            }, setting.title),
                            m("select.br-form__input-dropdown", {
                                onchange: (e: MithrilEvent) => {
                                    setting.value = (e.target as HTMLSelectElement).value;
                                    if(attrs.config.saveSettings())
                                        attrs.ui.notify(t`Settings saved!`);
                                    else
                                        attrs.ui.notify(t`Failed saving settings`);
                                },
                                name: setting.name
                            }, setting.options.map(option =>
                                m("option", {
                                    key: option.value,
                                    value: option.value,
                                    selected: setting.value === option.value,
                                    id: "xbsetting-" + setting.name + "-" + oval(option)
                                }, option.label)
                            ))
                        ]);
                    case XBOptionType.Spinner:
                    case XBOptionType.SpinnerPercentage:
                        return m("div.br-form__input", [
                            m("div.br-form__input-label" + (setting.description ? ".br-help" : ""), {
                                title: setting.description
                            }, setting.title),
                            m("div.br-form__input-spinner.label", setting.type === XBOptionType.Spinner ? (setting.value as number).toFixed(1) : `${Math.floor((setting.value as number)*100)}%`),
                            m("div.br-form__input-spinner.buttons", [
                                m("button.br-form__input-spinner.negative", {
                                    type: "button",
                                    onclick: () => {
                                        (setting.value as number) -= (setting.options.find(o => o.label === XBOptionTypeSpinnerOptions.STEP).value as number) ?? 0.1;
                                        const minimum = setting.options.find(o => o.label === XBOptionTypeSpinnerOptions.MIN).value as number ?? -Infinity;
                                        if(setting.value < minimum) {
                                            setting.value = minimum;
                                            return;
                                        }
                                        if(attrs.config.saveSettings())
                                            attrs.ui.notify(t`Settings saved!`);
                                        else
                                            attrs.ui.notify(t`Failed saving settings`);
                                    }
                                }, "－"),
                                m("button.br-form__input-spinner.positive", {
                                    type: "button",
                                    onclick: () => {
                                        (setting.value as number) += (setting.options.find(o => o.label === XBOptionTypeSpinnerOptions.STEP).value as number) ?? 0.1;
                                        const maximum = setting.options.find(o => o.label === XBOptionTypeSpinnerOptions.MAX).value as number ?? Infinity;
                                        if(setting.value > maximum) {
                                            setting.value = maximum;
                                            return;
                                        }
                                        if(attrs.config.saveSettings())
                                            attrs.ui.notify(t`Settings saved!`);
                                        else
                                            attrs.ui.notify(t`Failed saving settings`);
                                    }
                                }, "＋")
                            ])
                        ]);

                }
            }
            )),
            m("span", [
                m("button.br-dialog__action", {
                    onclick: () => {
                        attrs.config.resetSettings();
                        attrs.config.saveSettings();
                        attrs.ui.notify(t`Settings reset!`);
                    }
                }, t`Reset`),
                m("button.br-dialog__action", {
                    onclick: () => attrs.ui.toggleSettings(false)
                }, t`Close`)
            ])]
        ));
    }

}