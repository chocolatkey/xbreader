import m from "mithril";
// Components
import Reader from "../components/Reader";

export default class Read {
    constructor(config) {
        this.uuid = null;
        this.reader = new Reader(config);
        console.log(`${__NAME__} ${__VERSION__}`);
    }

    oninit(vnode) { // Welcome
        this.uuid = vnode.attrs.id;
        const uuidV4Regex = /^[A-F\d]{8}-[A-F\d]{4}-4[A-F\d]{3}-[89AB][A-F\d]{3}-[A-F\d]{12}$/i;
        if(!uuidV4Regex.test(this.uuid)) {
            console.error("Invalid content ID");
            this.uuid = null;
        }
    }

    oncreate() { // Initialize 

    }

    view() {
        return [
            m(this.reader, {uuid: this.uuid}),
            //m("div#bibi-sub]", this.publication.pmetadata.name),
            /*m("div#bibi-notifier", ""),
            m("div#bibi-veil", ""),
            m("div#bibi-panel", ""),
            m("div#bibi-shade", ""),
            m("div#bibi-help", ""),
            m("div#bibi-poweredby", ""),
            m("div#bibi-nombre", ""),
            m("div#bibi-slider", ""),
            m("div#bibi-spinner", ""),*/
        ];
    }
}