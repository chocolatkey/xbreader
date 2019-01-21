// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import m from "mithril";
import Navigator from "./Navigator";
import xbError from "./xbError";
import Link from "./Link";
import { LCP } from "@r2-lcp-js/parser/epub/lcp";
import { JsonStringConverter } from "@r2-utils-js/_utils/ta-json-string-converter";
// https://github.com/edcarroll/ta-json
import {
    JsonConverter,
    JsonElementType,
    JsonObject,
    JsonProperty,
    OnDeserialized,
    JSON as TAJSON
} from "ta-json-x";

import { IInternal } from "@r2-shared-js/models/internal";
import { Metadata } from "@r2-shared-js/models/metadata";
import { Contributor } from "@r2-shared-js/models/metadata-contributor";
import { parseDirection } from "xbreader/helpers/utils";
import { XBReadingDirection } from "xbreader/components/Reader";

@JsonObject()
export default class Publication { // extends ReadiumPublication
    ready: boolean;
    url: string;
    navi: Navigator;
    
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json#L6
    @JsonProperty("@context")
    @JsonElementType(String)
    @JsonConverter(JsonStringConverter)
    public Context!: string[];

    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json#L13
    @JsonProperty("metadata")
    @JsonElementType(Metadata)
    public Metadata!: Metadata;

    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json#L16
    @JsonProperty("links")
    @JsonElementType(Link)
    public Links!: Link[];

    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json#L44
    @JsonProperty("readingOrder")
    @JsonElementType(Link)
    public Spine2!: Link[];

    @JsonProperty("spine")
    @JsonElementType(Link)
    public Spine1!: Link[] | undefined;

    get Spine(): Link[] | undefined {
        return this.Spine2 ? this.Spine2 : this.Spine1;
    }
    set Spine(spine: Link[] | undefined) {
        if (spine) {
            this.Spine1 = undefined;
            this.Spine2 = spine;
        }
    }

    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json#L51
    @JsonProperty("resources")
    @JsonElementType(Link)
    public Resources!: Link[];

    // TODO: not in JSON Schema?? https://github.com/readium/webpub-manifest/issues/17
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json
    @JsonProperty("toc")
    @JsonElementType(Link)
    public TOC!: Link[];

    // TODO: not in JSON Schema?? https://github.com/readium/webpub-manifest/issues/17
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json
    @JsonProperty("page-list")
    @JsonElementType(Link)
    public PageList!: Link[];

    // TODO: not in JSON Schema?? https://github.com/readium/webpub-manifest/issues/17
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json
    @JsonProperty("landmarks")
    @JsonElementType(Link)
    public Landmarks!: Link[];

    // TODO: not in JSON Schema?? https://github.com/readium/webpub-manifest/issues/17
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json
    @JsonProperty("loi")
    @JsonElementType(Link)
    public LOI!: Link[];

    // TODO: not in JSON Schema?? https://github.com/readium/webpub-manifest/issues/17
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json
    @JsonProperty("loa")
    @JsonElementType(Link)
    public LOA!: Link[];

    // TODO: not in JSON Schema?? https://github.com/readium/webpub-manifest/issues/17
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json
    @JsonProperty("lov")
    @JsonElementType(Link)
    public LOV!: Link[];

    // TODO: not in JSON Schema?? https://github.com/readium/webpub-manifest/issues/17
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json
    @JsonProperty("lot")
    @JsonElementType(Link)
    public LOT!: Link[];

    // // OPDS2
    // @JsonProperty("images")
    // @JsonElementType(Link)
    // public Images!: Link[];

    // TODO subcollection?
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json#L65
    // tslint:disable-next-line:max-line-length
    // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/subcollection.schema.json
    // public OtherLinks: Link[];
    // public OtherCollections: IPublicationCollection[];

    public LCP: LCP | undefined;

    private Internal: IInternal[] | undefined;

    public findSpecial(key: string): IInternal | undefined {
        if (this.Internal) {
            const found = this.Internal.find((internal) => {
                return internal.Name === key;
            });
            if (found) {
                return found;
            }
        }
        return undefined;
    }

    public setSpecial(key: string, value: any) {
        const existing = this.findSpecial(key);
        if (existing) {
            existing.Value = value;
        } else {
            if (!this.Internal) {
                this.Internal = [];
            }

            const internal: IInternal = { Name: key, Value: value };
            this.Internal.push(internal);
        }
    }

    // public findLinKByHref(href: string): Link | undefined {
    //     if (this.Spine) {
    //         const ll = this.Spine.find((link) => {
    //             if (link.Href && href.indexOf(link.Href) >= 0) {
    //                 return true;
    //             }
    //             return false;
    //         });
    //         if (ll) {
    //             return ll;
    //         }
    //     }
    //     return undefined;
    // }

    public GetCover(): Link | undefined {
        return this.searchLinkByRel("cover");
    }

    public GetNavDoc(): Link | undefined {
        return this.searchLinkByRel("contents");
    }

    public searchLinkByRel(rel: string): Link | undefined {
        if (this.Resources) {
            const ll = this.Resources.find((link) => {
                return link.HasRel(rel);
            });
            if (ll) {
                return ll;
            }
        }

        if (this.Spine) {
            const ll = this.Spine.find((link) => {
                return link.HasRel(rel);
            });
            if (ll) {
                return ll;
            }
        }

        if (this.Links) {
            const ll = this.Links.find((link) => {
                return link.HasRel(rel);
            });
            if (ll) {
                return ll;
            }
        }

        return undefined;
    }

    public AddLink(typeLink: string, rel: string[], url: string, templated: boolean | undefined) {
        const link = new Link();
        link.AddRels(rel);
        link.Href = url;
        link.TypeLink = typeLink;

        if (typeof templated !== "undefined") {
            link.Templated = templated;
        }

        if (!this.Links) {
            this.Links = [];
        }
        this.Links.push(link);
    }

    @OnDeserialized()
    // tslint:disable-next-line:no-unused-variable
    // @ts-ignore: TS6133 (is declared but its value is never read.)
    protected _OnDeserialized() {
        // tslint:disable-next-line:max-line-length
        // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json#L60
        if (!this.Metadata) {
            console.warn("Publication.Metadata is not set!");
        }
        // tslint:disable-next-line:max-line-length
        // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json#L62
        if (!this.Spine) {
            console.warn("Publication.Spine/ReadingOrder is not set!");
        }
        // TODO: many EPUB publications do not have Links
        // tslint:disable-next-line:max-line-length
        // https://github.com/readium/webpub-manifest/blob/0ac78ab5c270a608c39b4b04fc90bd9b1d281896/schema/publication.schema.json#L61
        // if (!this.Links) {
        //     console.log("Publication.Links is not set!");
        // }
    }

    /////

    constructor() {
        this.ready = false;
        this.url = "";
    }

    get spine() {
        return this.Spine;
    }

    get links() {
        return this.Links;
    }

    smartLoad(item: any) {
        if(typeof item === "function" || item instanceof Function) // Is a function
            return this.loadFromData(this.parseManifest(item()));
        if(!!item && (typeof item === "object" || typeof item === "function") && typeof item.then === "function") { // Is a successful Promise
            return item.then((data: any) => this.loadFromData(this.parseManifest(data))).catch((error: Error) => { throw error; });
        } if (typeof item === "string" /* || item instanceof String*/) // Is a string (URL we hope)
            return this.loadFromPath(item);
        else
            try { // We can't tell if the item is a rejected promise, so we try and catch it, and if that fails, assume it's an object
                return item.catch((err: Error) =>
                    new Promise((_, reject) => {
                        reject(err);
                    })
                );
            } catch (error) {
                return this.loadFromData(item); // Object or other
            }
    }

    parseManifest(rawManifest: any) {
        if(!rawManifest)
            throw new xbError(9400, __("Manifest data empty"));
        if(rawManifest instanceof Publication)
            return rawManifest;
        let md;
        if(typeof rawManifest === "string")
            md = JSON.parse(rawManifest);
        else
            md = rawManifest;

        if(!this.isValidManifest(md))
            throw new xbError(9400, __("Invalid WebPub manifest"));
        for (const attrname in md.metadata.xbr) {
            this.setSpecial(attrname, md.metadata.xbr[attrname]);
        }
        return TAJSON.deserialize<Publication>(md, Publication);
    }

    loadFromPath(manifestPath: string) {
        return m.request<Publication>({
            method: "GET",
            url: manifestPath,
            background: true,
            extract: (xhr, _) => {
                const success = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 304 || (/^file:\/\//i).test(manifestPath);
                if(!success)
                    throw new xbError(xhr.status);
                const rawManifest = xhr.responseText;
                return this.parseManifest(rawManifest);
            }
        }).then((manifest) => {
            this.url = manifestPath;
            return this.loadFromData(manifest);
        }).catch((error) => {
            if(error instanceof xbError)
                throw error;
            throw new xbError(9400, error);
        });
    }

    loadFromData(manifestData: Publication) {
        return new Promise((resolve, reject) => {
            this.Metadata = manifestData.Metadata;
            this.Spine = manifestData.Spine;
            this.Links = manifestData.Links;
            if(!/^(?:[a-z]+:)?\/\//i.test(this.url) && this.links.length)
                this.url = this.searchLinkByRel("self").Href;
            console.log("Publication loaded: " + this.Metadata.Title);
            this.navi = new Navigator(this);
            this.ready = true;
            resolve();
        });
    }

    keysInObj(keys: string[], obj: any) {
        let ok = true;
        keys.forEach((key) => {
            if(key in obj === false)
                ok = false;
        });
        return ok;
    }

    static fixDeprecated(container: any, oldKey: string, newKey: string) {
        if(oldKey in container === true && newKey in container === false) {
            console.warn(`Deprecated WebPub naming scheme: Change '${oldKey}' to '${newKey}'`);
            container[newKey] = container[oldKey];
            delete container[oldKey];
        }
    }

    isValidManifest(manifest: any) { // TODO stricter
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

    get pmetadata() { // TODO deprecate
        return this.Metadata;// ? this.Metadata : false;
    }

    get uuid() {
        if(!this.pmetadata)
            return null;
        const uuidParts = this.pmetadata.Identifier.split(":");
        return uuidParts[uuidParts.length - 1];
    }

    get isTtb() {
        return this.direction == XBReadingDirection.TTB;
    }

    get series() {
        if(this.pmetadata.BelongsTo && this.pmetadata.BelongsTo.Series) {
            if(this.pmetadata.BelongsTo.Series[0])
                return this.pmetadata.BelongsTo.Series[0];
            //return this.pmetadata.BelongsTo.Series;                    
        } else return new Contributor;
        
    }

    get direction(): XBReadingDirection {
        return parseDirection(this.pmetadata.Direction)
    }

    get shift() {
        return this.navi.shift;
    }

    get rtl() { // Right-to-left reading
        return this.pmetadata.Direction == "rtl" ? true : false;
    }

    get isReady() {
        return this.ready;
    }
}