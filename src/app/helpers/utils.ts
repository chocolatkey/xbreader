import { XBReadingDirection } from "xbreader/components/Reader";

export function isNumeric(n: any) : n is number | string {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

export function intVal(n: number | string): number {
    return typeof n === "number" ? n : parseInt(n, 10);
}

export function parseDirection(d: XBReadingDirection | string): XBReadingDirection {
    if(typeof d === 'string')
        switch (d) {
            case "ltr":
                return XBReadingDirection.LTR;
            case "rtl":
                return XBReadingDirection.RTL;
            case "ttb":
                return XBReadingDirection.TTB
            default: // auto included
                return XBReadingDirection.LTR
        }
    else
        return d as XBReadingDirection;
}

export function directionToString(d: XBReadingDirection): string {
    switch(d) {
        case XBReadingDirection.LTR:
            return "ltr";
        case XBReadingDirection.RTL:
            return "rtl";
        case XBReadingDirection.TTB:
            return "ttb";
    }
}