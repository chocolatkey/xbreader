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
                if(!this.isValidManifest(manifest)) {
                    throw new Error("Invalid WebPub manifest!");
                }
                this.metadata = manifest.metadata;
                this.spine = manifest.readingOrder; // Legacy name
                this.links = manifest.links;
                this.ready = true;
                console.log("Publication loaded: " + this.metadata.title);
                this.navi = new Navigator(this);
                return true;
            } else {
                throw new Error("Manifest data empty!");
            }
        }).catch(error => {
            throw error;
        });
    }

    keysInObj(keys, obj) {
        let ok = true;
        keys.forEach((key) => {
            if(key in obj === false)
                ok = false;
        });
        return ok;
    }

    static fixDeprecated(container, oldKey, newKey) {
        if(oldKey in container === true && newKey in container === false) {
            console.warn(`Deprecated WebPub format: Change '${oldKey}' to '${newKey}'`);
            container[newKey] = container[oldKey];
        }
    }

    isValidManifest(manifest) {
        Publication.fixDeprecated(manifest, "spine", "readingOrder");
        const requiredRootKeys = ["metadata", "links", "readingOrder"];
        if(!this.keysInObj(requiredRootKeys, manifest))
            return false;
        
        Publication.fixDeprecated(manifest.metadata, "belongs_to", "belongsTo");
        Publication.fixDeprecated(manifest.metadata, "direction", "readingProgression");
        const requiredMetadataKeys = ["title", "numberOfPages", "belongsTo"];
        if(!this.keysInObj(requiredMetadataKeys, manifest.metadata))
            return false;

        return true;
    }

    get pmetadata() {
        return this.metadata ? this.metadata : false;
    }

    get isTtb() {
        return this.direction == "ttb";
    }

    get series() {
        if(this.pmetadata.belongsTo.series[0])
            return this.pmetadata.belongsTo.series[0];
        return this.pmetadata.belongsTo.series;
    }

    get direction() {
        if(this.pmetadata.readingProgression == "auto" || !this.pmetadata.readingProgression)
            return "ltr";
        else
            return this.pmetadata.readingProgression;
    }

    get shift() {
        return this.navi.shift;
    }

    get rtl() { // Right-to-left reading
        return this.pmetadata.direction == "rtl" ? true : false;
    }

    get isReady() {
        return this.ready;
    }
}