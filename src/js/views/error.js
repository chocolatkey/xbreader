import m from "mithril";

const errorMappings = {
    400: __("You issued a bad request."),
    403: __("You are not allowed to view this content."),
    404: __("The content you requested does not exist."),
    410: __("This content has expired or is no longer available."),
    500: __("The server has encountered an error."),
    503: __("Content is temporarily unavailable."),
};

export default class ErrorView {
    oninit(vnode) {
        this.errorCode = 666;
        if(vnode.attrs.message) {
            try {
                this.errorMessage = window.atob(decodeURIComponent(vnode.attrs.message));
            } catch(e) {
                console.error("Failed decoding error message", e);
                this.errorMessage = __("Invalid error");
            }
            this.errorCode = vnode.attrs.code;
        }
        else if(errorMappings[vnode.attrs.code]) {
            this.errorMessage = errorMappings[vnode.attrs.code];
            this.errorCode = vnode.attrs.code;
        } else if(isNaN(vnode.attrs.code)) {
            const errObj = JSON.parse(vnode.attrs.code);
            if(errObj.code && errObj.message) { // Is xbError
                this.errorCode = errObj.code;
                this.errorMessage = errObj.message;
            } else {
                this.errorMessage = __("Invalid error");
            }
        } else
            this.errorMessage = __("Unknown error");
    }

    view(vnode) {
        return [
            m("div.br-error__container", [
                m("h1", `Error ${new String(this.errorCode).padStart(4, "0")}`),
                m("p", this.errorMessage),
                m("span", `${__NAME__} ${__VERSION__}`)
            ]),
        ];
    }
}