export class xbError {
    constructor(code, message) {
        this.errCode = code;
        this.errMessage = message;
    }

    get code() {
        return this.errCode ? this.errCode : 9500;
    }

    get message() {
        return this.errMessage ? this.errMessage : "Generic Error";
    }

    export() {
        return JSON.stringify({code: this.code, message: this.message});
    }
}