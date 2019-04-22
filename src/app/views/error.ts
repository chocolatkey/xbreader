import m, { ClassComponent, CVnode } from "mithril";
import { isNumeric, intVal } from "../helpers/utils";
import Logo from "../partials/Logo";

const errorMappings: { [code: number]: string } = {
    400: __("You issued a bad request."),
    403: __("You are not allowed to view this content."),
    404: __("The content you requested does not exist."),
    410: __("This content has expired or is no longer available."),
    500: __("The server has encountered an error."),
    503: __("Content is temporarily unavailable.")
};

export interface ErrorAttrs {
    message: string;
    code: string;
}

export default class ErrorView implements ClassComponent<ErrorAttrs> {
    config: XBConfig;
    errorCode: number;
    errorMessage: string;

    constructor(config: XBConfig) {
        this.config = config;
    }

    oninit({attrs}: CVnode<ErrorAttrs>) {
        this.errorCode = 666;
        const civ = intVal(attrs.code);
        if(attrs.message) {
            try {
                this.errorMessage = window.atob(decodeURIComponent(attrs.message));
            } catch(e) {
                console.error("Failed decoding error message", e);
                this.errorMessage = __("Invalid error");
            }
            this.errorCode = civ;
        }
        else if(isNumeric(attrs.code) && errorMappings[intVal(attrs.code)]) {
            this.errorMessage = errorMappings[civ];
            this.errorCode = civ;
        } else if(!isNumeric(attrs.code)) {
            const errObj = JSON.parse(attrs.code);
            if(errObj.code && errObj.message) { // Is xbError
                this.errorCode = errObj.code;
                this.errorMessage = errObj.message;
            } else {
                this.errorMessage = __("Invalid error");
            }
        } else
            this.errorMessage = __("Unknown error");
    }

    view() {
        return [
            m("div.br-error__container", [
                (this.config.brand && this.config.brand.embedded) ? m("div.br__notifier", m(Logo, this.config.brand)) : null,
                m("h1", `Error ${new String(this.errorCode).padStart(4, "0")}`),
                m("p", this.errorMessage),
                m("span", `${__NAME__} ${__VERSION__}`)
            ])
        ];
    }
}