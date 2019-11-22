import m from "mithril";

export default class xbError {
    private errCode: number;
    private errMessage: string;

    constructor(code: number, message?: string) {
        this.errCode = code;
        this.errMessage = message;
    }

    get code() {
        return this.errCode ? this.errCode : 9500;
    }

    get message() {
        return this.errMessage ? this.errMessage : null;
    }

    export() {
        return {code: this.code, message: this.message ? encodeURIComponent(window.btoa(this.message)) : null};
    }

    go() {
        const exp = this.export();
        if(exp.message)
            m.route.set("/error/:code/:message", exp, { replace: true });
        else
            m.route.set("/error/:code", { code: exp.code }, { replace: true });
    }
}