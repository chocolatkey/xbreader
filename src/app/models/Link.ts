import { IInternal } from "@r2-shared-js/models/internal";
import { Link as ReadiumLink } from "@r2-shared-js/models/publication-link";
import { JsonObject, JsonProperty,JsonElementType, OnDeserialized } from "ta-json-x";

@JsonObject()
export default class Link extends ReadiumLink {

    @JsonElementType(Object)
    @JsonProperty("xbr")
    Xbr: any;

    @OnDeserialized()
    protected _OnDeserialized() {
        if(!this.Xbr)
            return;
        for(const attr in this.Xbr)
            this.setSpecial(attr, this.Xbr[attr]);
    }

    private Internal: IInternal[] | undefined;

    public findFlag(key: string): boolean {
        if (this.Internal) {
            const found = this.Internal.find((internal) => {
                return internal.Name === key;
            });
            if (found) {
                return found.Value ? true : false;
            }
        }
        return false;
    }

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
}