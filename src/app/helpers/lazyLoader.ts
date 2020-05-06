import { t } from "ttag";
import Link from "xbreader/models/Link";
import { CVnodeDOM } from "mithril";
import WorkerPool from "./workerPool";
import m from "mithril";
import { canWebP, canDrawBitmap } from "./platform";
import { bestImage } from "./sizer";

const HIGH_THRESHOLD = 5;
const LOW_THRESHOLD = 3;

const BLANK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const BLANK_PAGE = "about:blank";

interface QueueElement {
    xhr: XMLHttpRequest;
    src: string;
}

type LoadableElement = HTMLImageElement | HTMLCanvasElement | HTMLIFrameElement;

const offscreenCanvasSupported = typeof(OffscreenCanvas) === "undefined" ? false : true;
const workerSupported = typeof(Worker) === "undefined" ? false : true;
let f: Function;
export let worker: WorkerPool;
if(workerSupported) {
    f = () => {
        const ctx: Worker = self as any;
        //const useFetch = typeof(fetch) !== "undefined" ? true : false;
        //const useFetch = false;
        const queued: QueueElement[] = [];
        const locate = (src: string) => queued.map((o) => o.src).indexOf(src);
        const isQueued = (src: string) => locate(src) !== -1;
        const deqeue = (src: string) => {
            const i = locate(src);
            if (i != -1)
                queued.splice(i, 1);
        };
        self.addEventListener("message", e => {
            const src = e.data.src;
            let xhr: XMLHttpRequest;
            switch (e.data.mode) {
                case "FETCH":
                    if(isQueued(src)) // If already queued
                        return; // Do nothing
    
                    /*
                     * I'm not going to consider using fetch until
                     * https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort
                     * is more widely supported, because you have browsers
                     * 1. With fetch and AbortController support (bleeding edge)
                     * 2. With fetch, but not AbortController
                     * 3. With neither, in which case we implement XHR instead of using fetch
                     * So why not just use XHR in all of them?
                     * 
                    if(useFetch) { // If fetch is supported by the browser
                        queued.push({src, xhr});
                        fetch(src, { mode: 'cors' })
                            .then(response => {
                                if(!isQueued(src)) // Stop because canceled
                                    return null;
                                return response.blob();
                            })
                            .then(blob => {
                                if(!isQueued(src) || !blob) // Stop because canceled
                                    return;
                                const url = URL.createObjectURL(blob);
                                self.postMessage({ src, url });
                                deqeue(src);
                            }).catch(err => {
                                self.postMessage({ src, error: new String(err) });
                                deqeue(src);
                            });
                        return;
                    }
                    // Fall back to using XHR when fetch is not supported
                    */
                    xhr = new XMLHttpRequest();
                    queued.push({src, xhr});
                    xhr.open("GET", src, true);
                    // xhr.setRequestHeader("Content-Type", "image/*"); would preflight request, which is unecessary for pub resources
                    if(e.data.modernImage)
                        xhr.setRequestHeader("Accept", "image/webp,image/*,*/*;q=0.8"); // Support WebP where available
                    else
                        xhr.setRequestHeader("Accept", e.data.type + ",image/*,*/*;q=0.8");
                    xhr.responseType = "blob";
                    xhr.onloadend = () => {
                        if(!isQueued(src)) // Stop because canceled
                            return;
                        if(xhr.status && xhr.status < 400) {
                            if(e.data.bitmap && canDrawBitmap) { // ImageBitmap supported
                                createImageBitmap(xhr.response as Blob).then((bitmap) => {
                                    if(e.data.needRaw) {
                                        let url: string;
                                        if (e.data.needRaw === true)
                                            url = URL.createObjectURL(xhr.response);
                                        else if(Array.isArray(e.data.needRaw)) {
                                            const dat = (e.data.needRaw) as number[];
                                            if(dat.length === 1)
                                                url = URL.createObjectURL(((xhr.response) as Blob).slice(dat[0]));
                                            else if(dat.length === 2)
                                                url = URL.createObjectURL(((xhr.response) as Blob).slice(dat[0], dat[1]));
                                        }
                                        ctx.postMessage({ src, bitmap, url }, [bitmap]);
                                    } else
                                        ctx.postMessage({ src, bitmap }, [bitmap]);
                                });
                            } else {
                                const url = URL.createObjectURL(xhr.response);
                                ctx.postMessage({ src, url });
                            }
                        } else {
                            // Warning: Do *not* send the error as an Error object, FF can't clone it!
                            ctx.postMessage({ src, error: `Failed to load item ${src}, status ${xhr.status}` });
                        }
                        deqeue(src);
                    };
                    xhr.send(null);
                    break;
                case "CANCEL": { // Cancel an item's loading
                    const item = queued[locate(src)];
                    if(!item)
                        return;
                    if(item.xhr)
                        item.xhr.abort();
                    deqeue(src);
                    break;
                }
            }
        });
    };

    // WorkerPool pretends to be a Worker by implementing all essential worker functions
    worker = new WorkerPool(URL.createObjectURL(new Blob([`(${f})()`])));
}

export default class LazyLoader {
    private best: Link;
    private href: string;
    private readonly data: Link;
    private index: number;
    private loaded = false;
    public reloader = true;
    private already = false;
    private blob: string = null;
    private readonly drawer: Function;
    private canvas: HTMLCanvasElement;
    private element: LoadableElement;
    private highTime: number;
    private preloader: HTMLImageElement | Record<string, any>;
    private drawT: number;
    private readonly chooser: Function;

    constructor(itemData: Link, indx: number, drawCallback: Function, chooseCallback: Function) {
        this.best = itemData;
        this.href = itemData.Href;

        this.data = itemData;
        this.index = indx;
        this.drawer = canDrawBitmap ? LazyLoader.drawBitmap : null;
        this.chooser = chooseCallback ? chooseCallback : null;

        if(drawCallback) {
            this.drawer = drawCallback;
        } else if(itemData.Height && itemData.Width) {
            this.canvas = document.createElement("canvas");
        }

        if(!itemData.findFlag("isImage"))
            this.drawer = null; // No drawer for non-images (e.g. iframe)
    }

    get source() {
        let best: Link;
        if(this.chooser !== null) // Give custom func a chance to choose the best link
            best = this.chooser(this.data) as Link;
        if(!best) best = bestImage(this.data);
        if(best !== this.best) {
            this.best = best;
            this.href = best.Href;
        }
        return this.href;
    }

    provoke(imageItem: CVnodeDOM<LoadableElement>, currentIndex: number) {
        this.element = imageItem.dom as LoadableElement;
        if(this.drawer && this.data.findFlag("isImage"))
            this.canvas = this.element as HTMLCanvasElement; // C
        const diff = Math.abs(this.index - currentIndex); // Distance of this page from current page
        clearTimeout(this.highTime);

        // If index of this page close enough to current page index, load now
        if (diff <= LOW_THRESHOLD)
            this.prepare(); // Start loading the image

        // If index of page near current page, load after predicted end of transition
        else if(diff <= HIGH_THRESHOLD) {
            this.highTime = window.setTimeout(() => {
                this.prepare();
            }, 1000);

        // If image is loaded on canvas and > HIGH_THRESHOLD away from the image
        // Especially needed on iOS where canvas memory is constrained
        } else if(this.loaded) {
            this.already = true;
            if(this.drawer && this.canvas) {
                const ctx = this.canvas.getContext("2d", {desynchronized: true}) as CanvasRenderingContext2D;
                if(ctx)
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.canvas.height = this.canvas.width = 0;
            } else {
                if(this.data.findFlag("isImage"))
                    (this.element as HTMLImageElement).src = BLANK_IMAGE;
                else
                    (this.element as HTMLIFrameElement).src = BLANK_PAGE;                
            }
            this.loaded = false;
            this.reloader = true;
            m.redraw();
        // If still loading image but moved away from it in the meantime
        } else if (this.preloader && !this.loaded) {
            if(workerSupported)
                worker.postMessage({src: this.href, mode: "CANCEL"});
            else
                (this.preloader as HTMLImageElement).src = ""; // Cancels currently loading image
            this.preloader = null; // Reset the preloader
        }
    }

    private toBlob(type?: string, quality?: number) {
        if(this.loaded)
            return;
        if(HTMLCanvasElement.prototype.toBlob) {
            this.canvas.toBlob((blob) => {
                this.blob = URL.createObjectURL(blob);
                if(!this.loaded)
                    (this.element as HTMLImageElement).src = this.blob;
            });
        } else {
            // eslint-disable-next-line no-var
            var binStr = atob(this.canvas.toDataURL(type, quality).split(",")[1]),
                len = binStr.length,
                arr = new Uint8Array(len);

            // eslint-disable-next-line no-var
            for (var i = 0; i < len; i++)
                arr[i] = binStr.charCodeAt(i);

            this.blob = URL.createObjectURL(new Blob([arr], {
                type: type || "image/png"
            }));
        }
    }

    private draw(element: HTMLElement | string) {
        cancelAnimationFrame(this.drawT);
        this.drawT = requestAnimationFrame(() => {
            const cd = this.canvas;
            if (!cd)
                return;
            let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
            let tempCanvas: HTMLCanvasElement | OffscreenCanvas;
            let dctx: ImageBitmapRenderingContext;

            try {
                // We *have* to initialize the context for the first time as a bitmaprenderer if we want to use the same context in the future
                if(canDrawBitmap)
                    dctx = cd.getContext("bitmaprenderer") as ImageBitmapRenderingContext;

                // Fall back to 2d
                if (!dctx) {
                    ctx = cd.getContext("2d", {desynchronized: true}) as CanvasRenderingContext2D;
                } else {
                    // Or prepare a temporary canvas for 2d drawing
                    if(offscreenCanvasSupported)
                        tempCanvas = new OffscreenCanvas(cd.width, cd.height);
                    else {
                        tempCanvas = document.createElement("canvas");
                        tempCanvas.width = cd.width;
                        tempCanvas.height = cd.height;
                    }
                    // Do NOT add {desynchronized: true} here! https://bugs.chromium.org/p/chromium/issues/detail?id=1072214#c14
                    ctx = tempCanvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
                }
            } catch (error) {}

            if(ctx && !this.loaded) {
                ctx.clearRect(0, 0, cd.width, cd.height);
                if (element instanceof HTMLImageElement) {
                    ctx.drawImage(element, 0, 0, cd.width, cd.height);
                } else {
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "grey";
    
                    ctx.font = "normal bold 150px sans-serif";
                    ctx.fillText(element as string, cd.width / 2, cd.height / 2);
    
                    ctx.font = "normal 20px sans-serif";
                    const fn = this.href.split("/");
                    const fnnq = fn[fn.length - 1].split("?")[0];
                    const infoString = `${__NAME__} ${__VERSION__} → ${fnnq}`;
                    ctx.fillText(infoString, cd.width / 2, cd.height - 20);
                }
                if(dctx && !this.loaded) { // Needs to be transferred to the real canvas
                    createImageBitmap(tempCanvas).then((ib: ImageBitmap) => {
                        if(!this.loaded)
                            dctx.transferFromImageBitmap(ib);
                        ib.close();
                        tempCanvas.width = tempCanvas.height = 0;
                        tempCanvas = null;
                        this.drawAsSoon();
                    });
                    return;
                }
            } else {
                // console.warn("No canvas context!", ctx, dctx, element, cd);
            }
            this.drawAsSoon();
        });
    }

    private drawAsSoon(first = false) {
        if(this.element && !first) {
            if(this.loaded) {
                if(!workerSupported && !this.drawer) // C
                    (this.element as HTMLImageElement).src = (this.preloader as HTMLImageElement).src;
                if(this.blob)
                    URL.revokeObjectURL(this.blob);
                return;
            } else {
                if(this.blob || this.drawer) // C
                    return;
                this.blob = "empty";
                this.toBlob();
            }
        }
        requestAnimationFrame(this.drawAsSoon.bind(this));
    }

    static drawBitmap(loader: LazyLoader, source: ImageBitmap, blob?: string) {
        const c = loader.canvas;
        c.height = loader.best.Height;
        c.width = loader.best.Width;
        let ctx: CanvasRenderingContext2D | ImageBitmapRenderingContext = c.getContext("bitmaprenderer", { alpha: false }) as ImageBitmapRenderingContext;
        if(!ctx) {
            ctx = c.getContext("2d", {desynchronized: true}) as CanvasRenderingContext2D;
            if(ctx)
                ctx.drawImage(source, 0, 0);
            else
                console.warn("No canvas context!", ctx, source);
        } else {
            ctx.transferFromImageBitmap(source);
        }
        source.close();
        // console.log("drawBitmap", c.getAttribute("aria-label"), ctx, source);

        loader.loaded = true;
    }

    private lazyWorker(src: string) {
        return new Promise((resolve: Function, reject: Function) => {
            function handler(e: MessageEvent) {
                if (e.data.src === src) {
                    (e.target as Worker).removeEventListener("message", handler);
                    if (e.data.error) {
                        reject(new Error(e.data.error));
                    }
                    if(e.data.bitmap)
                        if(e.data.url)
                            resolve([e.data.bitmap, e.data.url]);
                        else
                            resolve([e.data.bitmap]);
                    else if(e.data.url)
                        resolve([e.data.url]);
                    else
                        reject("No data received from worker!");
                }
            }
            worker.addEventListener("message", handler);
            if(this.data.findFlag("isImage") && !this.data.Properties.Encrypted)
                worker.postMessage({src, mode: "FETCH", modernImage: canWebP, bitmap: this.drawer ? true : false, needRaw: this.data.findSpecial("rawRange") ? this.data.findSpecial("rawRange").Value : false});
            else
                worker.postMessage({src, mode: "FETCH", type: this.data.TypeLink});
        });
    }

    prepare() {
        const source = this.source;
        if(this.reloader) {
            if(this.canvas) {
                this.canvas.height = this.best.Height;
                this.canvas.width = this.best.Width;
            }
            this.reloader = false;
        } else if(this.preloader)
            return;

        if (!this.loaded && !this.already) {
            this.draw(t`Loading...`);
        }
        if (!workerSupported) {
            this.preloader = document.createElement("img");
            (this.preloader as HTMLImageElement).onload = () => {
                if (!this.preloader)
                    return;
                if(this.drawer)
                    this.drawer(this, (this.preloader as HTMLImageElement).src);
                else {
                    this.loaded = true;
                    requestAnimationFrame(() => this.drawAsSoon());
                }
            };
            (this.preloader as HTMLImageElement).onerror = () => {
                window.setTimeout(() => {
                    if(!this.loaded && this.preloader) {
                        console.error("Error loading page " + source);
                        this.blob = null;
                        this.draw(t`Error!`);
                    }
                }, 1000);
            };
            (this.preloader as HTMLImageElement).src = source;
        } else {
            this.preloader = {
                src: null
            };
            this.lazyWorker(source).then((params: any[]) => {
                if (!this.preloader)
                    return;
                if(this.drawer)
                    this.drawer(this, params[0] as string, params.length > 1 ? params[1] as string : undefined);
                else {
                    this.loaded = true;
                    (this.element as HTMLImageElement).onload = () => {
                        URL.revokeObjectURL(params[0] as string);
                    };
                    (this.element as HTMLImageElement).src = params[0] as string;
                }
                // this.blob = img;
            }).catch((err: Error) => {
                window.setTimeout(() => {
                    if(!this.loaded && this.preloader) {
                        console.error(`Error fetching page ${source}\n${err}`);
                        this.blob = null;
                        this.draw(t`Error!`);
                    }
                }, 1000);
            });
        }
    }

    private get preloaded() {
        return this.loaded && this.preloader;
    }
}