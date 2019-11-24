/**
 * sizer.ts
 *
 * This helper checks divina links of mimetype image/* for alternate versions
 * and selects the most appropriate one based on the browsing environment
 */
import Link from "../models/Link";
import { Link as ReadiumLink } from "@r2-shared-js/models/publication-link";
import { canWebP, networkType } from "./platform";
import sML from "./sMLstub";

const HEIGHT_LOW = 1280;
const WIDTH_LOW = 900;
const HEIGHT_MEDIUM = 1536;
const WIDTH_MEDIUM = 1080;
const HEIGHT_HIGH = 2048;
const WIDTH_HIGH = 1440;
const HEIGHT_ULTRA = 2560;
const WIDTH_ULTRA = 1800;
// Larger than ^ "ultra" is not really feasible on the web, you start to reach
// a point of diminishing return due to lag, size, canvas limits on certain
// browsers etc. For "4K" and higher res, it's better to go with a real app.

const getDimension = (link: ReadiumLink, width: boolean) => width ? (link.Width ? link.Width : 0) : (link.Height ? link.Height : 0);
const closestResolution = (choices: Link[], ideal: number, width: boolean) => choices.reduce((prev: Link, curr: Link) => Math.abs(getDimension(curr, width) - ideal) < Math.abs(getDimension(prev, width) - ideal) ? curr : prev);

/**
 * Create an array out of the item and its alternates (assuming alternates aren't nested more than a level down)
 * @param item Manifest item pointing to a page
 */
function gatherImages(item: Link): Link[] {
    const allVersions: Link[] = item.Alternates.slice(0); // Copy the array!
    if(!allVersions) return [item];

    allVersions.unshift(item); // Insert link itself at beginning for default

    // Only include WebP links if the platform supports WebP images
    return allVersions.filter(link => (!canWebP && link.TypeLink === "image/webp") ? false : true);
}

/**
 * Select the best image to be loaded based on the current reading environment
 * @param item DiViNa manifest item
 */
export function bestImage(item: Link): Link {
    if(!item) return null;
    if(!item.findFlag("isImage")) return item;
    const links = gatherImages(item);
    if(links.length === 1) return item;

    const ratio = window.devicePixelRatio || 1;
    let width = false; // Use width (not height) to determine best image
    let toonMode = false;

    // TODO override based on presentation hints for toon
    if((item.Height / item.Width) > 2) // Very tall image, most likely a toon image
        toonMode = true;

    let dimension = window.innerHeight * ratio; // Landscape
    if(toonMode || window.innerHeight > window.innerWidth) { // Portrait or Toon
        width = true;
        dimension = window.innerWidth * ratio;
    }

    // Optional network type of device
    const nType = networkType();
    switch (nType) {
        case 1: // Medium network, cap dimension
            dimension = Math.min(dimension, width ? WIDTH_MEDIUM : HEIGHT_MEDIUM);
            break;
        case 2: // Slow network, cap dimension even lower
            dimension = Math.min(dimension, width ? WIDTH_LOW : HEIGHT_LOW);
            break;
    }

    return links.reduce((prev: Link, curr: Link) => {
        const cDim = getDimension(curr, width);
        const pDim = getDimension(prev, width);

        if(!sML.Mobile && nType === 0 && !toonMode) { // If not mobile and on "best" network, try not to go under LOW
            const lo = (width ? WIDTH_LOW : HEIGHT_LOW) + 25; // 25 accounts for slight aspect ratio variances
            if(cDim < pDim && cDim <= lo)
                return prev;
            if(pDim < cDim && pDim <= lo)
                return curr;
        }

        // Both are larger or smaller than ideal, pick the one closer to the ideal
        if((cDim >= dimension && pDim >= dimension) || (cDim <= dimension && pDim <= dimension))
            return closestResolution([prev, curr], dimension, width);

        if(pDim >= dimension) return prev;
        return curr;
    });
}