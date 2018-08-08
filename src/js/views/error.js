import m from "mithril";

const errorMappings = {
    400: __("You issued a bad request."),
    403: __("You are not allowed to view this content."),
    404: __("The content you requested does not exist."),
    410: __("This content has expired or is no longer available."),
    500: __("The server has encountered an error."),
    503: __("Content is temporarily unavailable."),
};

export default class Error {
    constructor(config) {
        
    }

    oninit(vnode) {
        if(vnode.attrs.message)
            this.errorMessage = vnode.attrs.message;
        else if(errorMappings[vnode.attrs.code])
            this.errorMessage = errorMappings[vnode.attrs.code];
        else
            this.errorMessage = __("Unknown error");
    }

    view(vnode) {
        const ecode = vnode.attrs.code;
        return [
            m("div.br-error__container", [
                m("h1", `Error ${ecode.padStart(4, "0")}`),
                m("p", this.errorMessage),
                m("span", `${__NAME__} ${__VERSION__}`)
            ]),
        ];
    }
}