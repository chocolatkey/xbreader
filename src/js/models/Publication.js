import m from "mithril";
import Navigator from "../helpers/navigator";

export default class Publication {
    constructor() {
        this.metadata = {};
        this.spine = [];
        this.links = [];
        this.ready = false;
    }

    smartLoad(item) {
        if (typeof item === 'string' || item instanceof String)
            return this.loadFromPath(item + ".json");
        else
            return this.loadFromData(item);
        
    }

    loadFromPath(manifestPath) {
        return m.request({
            method: "GET",
            url: manifestPath
        }).then((manifest) => {
            return this.loadFromData(manifest);
        }).catch(error => {
            throw error;
        });
    }

    loadFromData(manifestData) {
        return new Promise((resolve, reject) => {
            if(manifestData){
                if(!this.isValidManifest(manifestData)) {
                    throw new Error("Invalid WebPub manifest!");
                }
                this.metadata = manifestData.metadata;
                this.spine = manifestData.readingOrder; // Legacy name
                this.links = manifestData.links;
                console.log("Publication loaded: " + this.metadata.title);
                this.navi = new Navigator(this);
                this.ready = true;
                resolve();
            } else {
                reject(new Error("Manifest data empty!"));
            }
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
            console.warn(`Deprecated WebPub naming scheme: Change '${oldKey}' to '${newKey}'`);
            container[newKey] = container[oldKey];
            delete container[oldKey];
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
        return this.pmetadata.readingProgression == "rtl" ? true : false;
    }

    get isReady() {
        return this.ready;
    }
}