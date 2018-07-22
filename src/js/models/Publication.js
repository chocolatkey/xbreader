import m from "mithril";
import Navigator from "../helpers/navigator";

export default class Publication {
    constructor() {
        this.metadata = {};
        this.spine = [];
        this.links = [];
        this.ready = false;
    }

    load(manifestPath) {
        return m.request({
            method: "GET",
            url: manifestPath
        }).then((manifest) => {
            if(manifest){
                this.metadata = manifest.metadata;
                this.spine = manifest.spine;
                this.links = manifest.links;
                //if(this.spine.length % 2) // Uneven number of pages, we good
                this.ready = true;
                this.navi = new Navigator(this.spine);
                console.log("Publication loaded: " + this.metadata.name);
                return true;
            } else {
                throw "Couldn't get manifest!";
            }
        }).catch(error => {
            throw error;
        });
    }

    get pmetadata() {
        return this.metadata ? this.metadata : false;
    }

    get direction() {
        if(this.pmetadata.direction == "auto" || !this.pmetadata.direction)
            return "ltr";
        else
            return this.pmetadata.direction;
    }

    get rtl() { // Right-to-left reading
        return this.pmetadata.direction == "rtl" ? true : false;
    }

    get isReady() {
        return this.ready;
    }
}