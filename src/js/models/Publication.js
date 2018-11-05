import m from "mithril";
import Navigator from "../helpers/navigator";
import xbError from "../models/xbError";

export default class Publication {
    constructor() {
        this.metadata = {
            xbr: {} // Special attributes for internal use only, not part of WebPub
        };
        this.spine = [];
        this.links = [];
        this.ready = false;
        this.url = "";
    }

    setSpecial(attr, val) {
        this.metadata.xbr[attr] = val;
    }

    smartLoad(item) {
        if(typeof item === "function" || item instanceof Function) // Is a function
            return this.loadFromData(item());
        if(!!item && (typeof item === "object" || typeof item === "function") && typeof item.then === "function") { // Is a successful Promise
            return item.then(data => this.loadFromData(data)).catch(error => { throw error; });
        } if (typeof item === "string" || item instanceof String) // Is a string (URL we hope)
            return this.loadFromPath(item);
        else
            try { // We can't tell if the item is a rejected promise, so we try and catch it, and if that fails, assume it's an object
                return item.catch((err) =>
                    new Promise((_, reject) => {
                        reject(err);
                    })
                );
            } catch (error) {
                return this.loadFromData(item); // Object or other
            }
    }

    loadFromPath(manifestPath) {
        return m.request({
            method: "GET",
            url: manifestPath,
            background: true,
        }).then((manifest) => {
            this.url = manifestPath;
            return this.loadFromData(manifest);
        }).catch((error) => {
            if(error.message.indexOf("Invalid JSON") === 0)
                throw new xbError(404);
            throw new xbError(9400, error);
        });
    }

    loadFromData(manifestData) {
        return new Promise((resolve, reject) => {
            if(manifestData){
                if(!this.isValidManifest(manifestData)) {
                    throw new xbError(9400, __("Invalid WebPub manifest"));
                }
                const specialAttrs = this.metadata.xbr;
                this.metadata = manifestData.metadata;
                if(!this.metadata.xbr)
                    this.metadata.xbr = {};
                for (const attrname in specialAttrs) { // Merge new and old specials
                    this.metadata.xbr[attrname] = specialAttrs[attrname];
                }
                this.spine = manifestData.readingOrder;
                this.links = manifestData.links;
                if(!this.url && this.links.length)
                    this.url = this.links[0].href;
                console.log("Publication loaded: " + this.metadata.title);
                this.navi = new Navigator(this);
                this.ready = true;
                resolve();
            } else {
                reject(new xbError(9400, __("Manifest data empty")));
            }
        }, 100);
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

        if(!manifest.metadata.numberOfPages)
            manifest.metadata.numberOfPages = manifest.readingOrder.length;
        const requiredMetadataKeys = ["title", /*"belongsTo"*/];
        if(!this.keysInObj(requiredMetadataKeys, manifest.metadata))
            return false;

        return true;
    }

    get pmetadata() {
        return this.metadata ? this.metadata : false;
    }

    get uuid() {
        if(!this.pmetadata)
            return null;
        const uuidParts = this.pmetadata.identifier.split(":");
        return uuidParts[uuidParts.length - 1];
    }

    get isTtb() {
        return this.direction == "ttb";
    }

    get series() {
        if(this.pmetadata.belongsTo && this.pmetadata.belongsTo.series) {
            if(this.pmetadata.belongsTo.series[0])
                return this.pmetadata.belongsTo.series[0];
            return this.pmetadata.belongsTo.series;                    
        } else return {
            identifier: "",
        };
        
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