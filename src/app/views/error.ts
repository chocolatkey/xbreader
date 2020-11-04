import { t } from "ttag";
import m, { ClassComponent, CVnode } from "mithril";
import { isNumeric, intVal } from "xbreader/helpers/utils";
import Logo from "xbreader/partials/Logo";

const errorMappings: { [code: number]: string } = {
    400: t`Your client issued a bad request.`,
    403: t`You have been denied access to this content.`,
    404: t`The content you requested does not exist.`,
    410: t`This content has expired or is no longer available.`,
    500: t`The server has encountered an error.`,
    503: t`Content is temporarily unavailable.`
};

export interface ErrorAttrs {
    readonly message: string;
    readonly code: string;
}

export default class ErrorView implements ClassComponent<ErrorAttrs> {
    private readonly config: XBConfig;
    private errorCode: number;
    private errorMessage: string;

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
                this.errorMessage = t`Invalid error`;
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
                this.errorMessage = t`Invalid error`;
            }
        } else
            this.errorMessage = t`Unknown error`;
    }

    view({attrs}: CVnode<ErrorAttrs>) {
        const paddedErrorCode = new String(this.errorCode).padStart(4, "0");
        return [
            m("div.br-error__container", [
                (this.config.brand && this.config.brand.embedded) ? m("div.br__notifier", m(Logo, this.config.brand)) : null,
                m("h1", t`Error ${paddedErrorCode}`),
                m("p", this.errorMessage),
                m("span", `${__NAME__} ${__VERSION__}`)
            ])
        ];
    }
}