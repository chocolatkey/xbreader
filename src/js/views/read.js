import m from "mithril";
// Components
import Reader from "../components/Reader";

export default class Read {
    constructor(config) {
        this.config = config;
        this.cid = null; // Content ID
        this.reader = null;
    }

    oninit(vnode) { // Welcome
        this.reader = new Reader(this.config);
        if(vnode.attrs.id) {
            this.cid = vnode.attrs.id;
            const xRegex = /^[@-Za-z(-;=\\_!]+$/i;
            if(!xRegex.test(this.cid)) {
                console.error("Invalid content ID");
                m.route.set("/error/:code/:message", { code: 400, message: "Invalid content ID" }, { replace: true });
                this.cid = null;
            }
        }
    }

    view(vnode) {
        return [
            m(this.reader, {cid: vnode.attrs.id}),
        ];
    }
}