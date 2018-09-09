import cdn from "../helpers/cdn";

const HIGH_THRESHOLD = 5;
const LOW_THRESHOLD = 3;

export default class LazyLoader {
    constructor(imageData, imageIndex) {
        this.original = cdn.image(imageData, imageIndex);
        this.mime = imageData.mime;
        this.index = imageIndex;
        this.loaded = false;
        this.blob = null;

        this.canvas = document.createElement("canvas");
        this.canvas.height = imageData.height;
        this.canvas.width = imageData.width;
    }

    provoke(imageItem, currentIndex) {
        this.image = imageItem.dom;
        const diff = Math.abs(this.index - currentIndex); // Distance of this page from current page
        clearTimeout(this.highTime);

        // If index of this page close enough to current page index, load now
        if (diff <= LOW_THRESHOLD)
            this.prepare(); // Start loading the image

        // If index of page near current page, load after predicted end of transition
        else if(diff <= HIGH_THRESHOLD) {
            this.highTime = setTimeout(() => {
                this.prepare();
            }, 1000);

        // If still loading image but moved away from it in the meantime
        } else if (this.preloader && !this.loaded) {
            this.preloader.src = ""; // Cancels currently loading image
            this.preloader = null; // Reset the preloader
        }
    }

    toBlob(callback, type, quality) {
        if(this.loaded)
            return;
        if(HTMLCanvasElement.prototype.toBlob) {
            this.canvas.toBlob((blob) => {
                this.blob = URL.createObjectURL(blob);
                if(!this.loaded)
                    this.image.src = this.blob;
            });
        } else {
            let binStr = atob(this.canvas.toDataURL(type, quality).split(",")[1]),
                len = binStr.length;
            /*const hash = type + len;
            if(hash == this.chash) {
                console.log("ff");
                return;
            }
            else
                this.chash = hash;*/

            let arr = new Uint8Array(len);

            for (var i = 0; i < len; i++)
                arr[i] = binStr.charCodeAt(i);

            this.blob = URL.createObjectURL(new Blob([arr], {
                type: type || "image/png"
            }));
        }
    }

    draw(element) {
        clearTimeout(this.drawT);
        this.drawT = setTimeout(() => {
            const cd = this.canvas;
            if (!cd)
                return;
            const ctx = cd.getContext("2d");
            ctx.clearRect(0, 0, cd.width, cd.height);
            if (element instanceof HTMLImageElement) {
                ctx.drawImage(element, 0, 0, cd.width, cd.height);
            } else {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "grey";

                ctx.font = "normal bold 150px sans-serif";
                ctx.fillText(element, cd.width / 2, cd.height / 2);

                ctx.font = "normal 20px sans-serif";
                const fn = this.original.split("/");
                const fnnq = fn[fn.length - 1].split("?")[0];
                const infoString = `${__NAME__} ${__VERSION__} → ${fnnq}`;
                ctx.fillText(infoString, cd.width / 2, cd.height - 20);
            }
            this.drawAsSoon();
        });
    }

    drawAsSoon() {
        if(this.image) {
            if(this.loaded) {
                this.image.src = this.preloader.src;
                window.URL.revokeObjectURL(this.blob);
                return;
            } else {
                if(this.blob)
                    return;
                this.blob = "empty";
                this.toBlob(/*this.mime*/);
            }
        }
        window.requestAnimationFrame(this.drawAsSoon.bind(this));
    }

    prepare() {
        if (this.preloader)
            return;
        if (!this.loaded) {
            this.draw(__("Loading..."));
        }
        this.preloader = document.createElement("img");
        this.preloader.onload = () => {
            if (!this.preloader)
                return;
            this.loaded = true;
            this.drawAsSoon();
        };
        this.preloader.onerror = () => {
            this.draw(__("Error!"));
            /*setTimeout(() => {
                if(!this.loaded && this.preloader) {
                    console.error("Error loading page " + this.original);
                    this.draw(__("Error!"));
                }
            }, 1000);*/
        };
        this.preloader.src = this.original;
    }

    get preloaded() {
        return this.loaded && this.preloader;
    }

    get placeholderReady() {
        return this.placeholder.complete || this.placeholder.naturalWidth > 0;
    }
}