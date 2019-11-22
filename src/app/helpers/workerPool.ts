
export default class WorkerPool {
    private readonly pool: Worker[];
    private current: number = 0;

    /**
     * Create a new WorkerPool
     * @param url URL source for the Worker(s)
     * @param size Pool size, defaults to *navigator.hardwareConcurrency*-1 or 1 if hardwareConcurrency is not available
     */
    constructor(url: string, size = (navigator.hardwareConcurrency ? navigator.hardwareConcurrency - 1 : 1)) {
        this.pool = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(new Worker(url));    
        }
    }

    /**
     * Destroy all workers in the pool
     */
    destroy() {
        this.pool.forEach(worker => worker.terminate());
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