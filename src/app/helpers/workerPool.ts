
export default class WorkerPool {
    private readonly pool: Worker[] = [];
    private current = 0;
    private url: URL;
    public destroyed = false;
    private size: number;

    /**
     * Create a new WorkerPool
     * @param url URL source for the Worker(s)
     * @param size Pool size, defaults to *navigator.hardwareConcurrency*-1 or 1 if hardwareConcurrency is not available
     */
    constructor(url: string, size = (navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 1)) {
        this.size = size;
        this.create(url);
    }

    /**
     * Create the pool. Can be used to re-create it too
     * @param url URL source for the Worker(s)
     */
    create(url: string) {
        this.url = new URL(url);
        for (let i = 0; i < this.size; i++) {
            this.pool.push(new Worker(url));
        }
        this.destroyed = false;
    }

    /**
     * Destroy all workers in the pool
     */
    destroy() {
        while(this.pool.length > 0) // Remove workers from the pool...
            this.pool.pop().terminate(); //  and terminate them!
        if(this.url.protocol === "blob:")
            URL.revokeObjectURL(this.url.href);
        this.destroyed = true;
    }

    /**
     * Alias to destroy for Worker API
     */
    terminate() {
        this.destroy();
    }

    /**
     * The currently targeted worker in the pool
     */
    private get currentWorker() {
        return this.pool[this.current];
    }

    /**
     * Mimicks Worker API by adding an event listener to the *current* target worker. Do this before posting the message!
     * @param type The Event type
     * @param listener The Event listener
     */
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        this.currentWorker.addEventListener(type, listener);
    }

    /**
     * Mimicks Worker API by posting a message to the *current* target worker in the pool, and then increments the *current* target to the next worker in the pool
     * @param message Data to pass to the Worker
     * @param transfer Optional Transferable for the Worker
     */
    postMessage(message: any, transfer?: Transferable[]) {
        this.currentWorker.postMessage(message, transfer);
        this.current = (this.current + 1) % this.pool.length;
    }


}