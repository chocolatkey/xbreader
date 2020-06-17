import m from "mithril";
import sML from "./sMLstub";
import Coordinator, { Point, BibiEvent, VerticalThird, HorizontalThird } from "./coordinator";
import Reader, { XBReadingDirection } from "xbreader/components/Reader";
import Slider from "xbreader/models/Slider";
import Ui from "xbreader/models/Ui";

const MAX_SCALE = 6; // 6x zoom

export enum WheelState {
    None,
    Start,
    Reverse,
    Serial
}

export interface Wheel {
    Distance: number;
    Delta: number;
    Accel: number;
    Wheeled: WheelState;
}

export interface DragTracker {
    startX: number;
    endX: number;
    startY: number;
    letItGo: boolean;
    preventClick: boolean;
    transformX: number;
    transformY: number;
}

export interface PinchTracker {
    startDistance: number;
    startOffset: Point;
    touchN: number;
}

export interface BibiKeyboardEvent extends KeyboardEvent {
    KeyName: string;
    BibiModifierKeys: string[];
}

export interface BibiWheelEvent extends WheelEvent {
    BibiSwiperWheel: Wheel;
}

export interface BibiMouseEvent extends MouseEvent {
    special: boolean;
}

export default class Peripherals {
    private readonly slider: Slider;
    private readonly ui: Ui;
    private readonly reader: Reader;
    private PreviousWheels: Wheel[] = [];
    private PreviousCoord: Point = {X: 0, Y: 0};
    isDragging = false;
    isPinching = false;
    private pointerDown = false;
    coordinator: Coordinator;
    private mtimer: number;
    private pdblclick: boolean;
    private dblDisabler: number;
    private disableDblClick: boolean;
    private dtimer: number;
    private Scrolling: boolean;
    private Timer_onscrolled: number;
    private Timer_cooldown: number;
    private onwheelTimer_stop: number;
    private onwheeled_hot: boolean;
    private drag: DragTracker;
    private pinch: PinchTracker;
    private mousePos: BibiEvent;
    private currentCursor: string;
    ignoreScrollFlag = false;

    private MovingParameters: { [keyName: string]: string | number } = {
        "Space": 1,
        "Backspace": -1,
        "Page Up": -1,
        "Page Down": 1,
        "End": "foot",
        "Home": "head",
        "SPACE": -1,
        "PAGE UP": "head",
        "PAGE DOWN": "foot",
        "END": "foot",
        "HOME": "head",
        "Plus": "zoom-in",
        "Minus": "zoom-out",
        "Zero": "zoom-reset",
        "Return": "menu"
    };
    private ActiveKeys: { [keyName: string]: number } = {};
    private KeyCodes: { [type: string]: Record<string, any> } = {
        keydown: {},
        keyup: {},
        keypress: {}
    };
    private observers = ["keydown", "keyup", "keypress", "wheel", "scroll", "touchmove", "message"];
    private handlers = [
        "touchstartHandler", "touchendHandler", "touchmoveHandler", "mousedownHandler", "mouseupHandler", "mousemoveHandler", "mousemoveUpdater", "mtimerUpdater", "onkeydown", "onkeyup", "onkeypress", "onwheel", "onscroll", "ontouchmove", "onpointermove", "onclick", "ondblclick", "onmessage"
    ];

    constructor(Reader: Reader) {
        this.slider = Reader.slider;
        this.ui = Reader.ui;
        this.reader = Reader;
        this.coordinator = new Coordinator(this);

        this.updateKeyCodes(["keydown", "keyup", "keypress"], {
            32: "Space"
        });

        this.updateKeyCodes(["keydown", "keyup"], {
            33: "Page Up",
            34: "Page Down",
            35: "End",
            36: "Home",
            37: "Left Arrow",
            38: "Up Arrow",
            39: "Right Arrow",
            40: "Down Arrow",
            65: "A",
            87: "W",
            68: "D",
            83: "S",
            27: "Esc",
            //9: "Tab",
            32: "Space",
            13: "Return",
            //13: "Enter",
            8: "Backspace",
            112: "F1",
            113: "F2",
            114: "F3",
            115: "F4",
            116: "F5",
            117: "F6",
            118: "F7",
            119: "F8",
            120: "F9",
            121: "F10",
            122: "F11",
            123: "F12",
            187: "Plus",
            189: "Minus",
            48: "Zero",
            // Numpad Keys
            107: "Plus",
            109: "Minus",
            45: "Zero",
            12: "Return",

            70: "F", // Fit toggle
            71: "G", // Spread toggle
            72: "H" // Direction toggle
        });
 
        this.updateMovingParameters(Reader.direction);

        // Bind all event handlers for referencability
        this.handlers.forEach(method => {
            (this as any)[method] = (this as any)[method].bind(this);
        });
        this.observe(window);
        const tx = document.documentElement;
        tx.addEventListener("pointermove", this.onpointermove);

        this.attachEvents();
        // Mousemove applies to TTB view as well because it controls cursors.
        tx.addEventListener("mousemove", this.mousemoveUpdater);

        console.log("Peripherals ready");
    }


    /**
     * Remove all event listeners and nullify
     */
    destroy() {
        this.unobserve(window);
        const tx = document.documentElement;
        tx.removeEventListener("pointermove", this.onpointermove);
        tx.removeEventListener("mousemove", this.mousemoveUpdater);

        this.coordinator = null;
    }

    onmessage(e: MessageEvent) { // TODO more messages
        if(!e.data || typeof(e.data) !== "string")
            return;
        if(e.data.indexOf("xbr:") !== 0)
            return;
        e.stopPropagation();
        const p = e.data.split(":"); // xbr:<action>:<data>
        const v = p[2]; // Data
        switch (p[1]) { // Action
            case "move": {
                this.moveBy(isNaN(v as any) ? v : parseInt(v));
                break;
            }
            case "goto": {
                this.slider.goTo(parseInt(v) - 1);
                break;
            }
            case "settings": {
                this.reader.ui.toggleSettings();
                m.redraw();
                break;
            }
            // TODO more
            default:
                break;
        }
        
    }

    /**
     * Attaches listeners to required events.
     */
    attachEvents() {
        // Keep track pointer hold and dragging distance
        this.pointerDown = false;
        this.drag = {
            startX: 0,
            endX: 0,
            startY: 0,
            letItGo: false,
            preventClick: false,
            transformX: 0,
            transformY: 0
        };

        this.pinch = {
            startDistance: 0,
            startOffset: null,
            touchN: 0
        };
    }

    /**
     * Clear drag after touchend and mouseup event
     */
    private clearDrag() {
        this.drag = {
            startX: 0,
            endX: 0,
            startY: 0,
            letItGo: false,
            preventClick: this.drag.preventClick,
            transformX: 0,
            transformY: 0
        };
        this.isDragging = false;
        this.isPinching = false;

        this.pinch = {
            startDistance: 0,
            startOffset: null,
            touchN: 0
        };
    }


    /**
     * touchstart event handler
     */
    touchstartHandler(e: TouchEvent) {
        // Prevent dragging / swiping on inputs, selects and textareas
        const ignoreSlider = ["TEXTAREA", "OPTION", "INPUT", "SELECT"].indexOf((e.target as Element).nodeName) !== -1;
        if (ignoreSlider)
            return;

        e.stopPropagation();

        switch (e.touches.length) {
            case 3:
                this.ui.toggle();
                return;
            case 2: {
                // Pinch
                e.preventDefault();
                this.clearDrag();
                if(this.pointerDown)
                    this.pinch.startOffset = {
                        X: this.slider.zoomer.translate.X && this.slider.zoomer.scale > 1 ? this.slider.zoomer.translate.X : e.touches[0].pageX,
                        Y: this.slider.zoomer.translate.Y && this.slider.zoomer.scale > 1 ? this.slider.zoomer.translate.Y : e.touches[0].pageY
                    };
                else
                    this.pinch.startOffset = this.coordinator.getTouchCenter(e);
                this.pinch.startDistance = this.coordinator.getTouchDistance(e);
                this.isPinching = true;
                this.pointerDown = true;
                return;
            }
        }

        this.pointerDown = true;
        this.drag.startX = e.touches[0].pageX;
        this.drag.startY = e.touches[0].pageY;
        if (this.slider.zoomer) {
            this.drag.transformX = this.slider.zoomer.translate.X;
            this.drag.transformY = this.slider.zoomer.translate.Y;
        }
    }

    mtimerUpdater(e: MithrilEvent) { // TODO mithril event type
        e.redraw = false;
        window.setTimeout(() => {
            clearTimeout(this.mtimer);
        }, 100);
    }

    /**
     * touchend event handler
     */
    touchendHandler(e: TouchEvent) {
        e.stopPropagation();
        this.pointerDown = false;
        //this.slider.updateProperties(true);

        if (this.drag.endX) {
            this.updateAfterDrag();
        }
        window.setTimeout(() => {
            this.clearDrag();
        }, 50);
    }


    /**
     * touchmove event handler
     */
    touchmoveHandler(e: TouchEvent) {
        e.stopPropagation();

        if ((Math.abs(this.drag.startY - e.touches[0].pageY) + Math.abs(this.drag.startX - e.touches[0].pageX)) > 5 && this.pointerDown)
            this.isDragging = true;

        const currentDistance = this.coordinator.getTouchDistance(e);
        if(this.isPinching && currentDistance) {          
            this.pinch.touchN++;  
            if(this.pinch.touchN < 4) return;
            let newScale = currentDistance / this.pinch.startDistance * this.slider.zoomer.scale;
            if(newScale >= MAX_SCALE)
                newScale = MAX_SCALE;
            if(newScale <= 1.1)
                newScale = 1;
            const center = this.coordinator.getTouchCenter(e);
            this.slider.zoomer = {
                scale: newScale,
                translate: {
                    /*X: center.X,
                    Y: center.Y,*/
                    X: this.pinch.startOffset.X,
                    Y: this.pinch.startOffset.Y
                }
            };
            this.pinch.startDistance = currentDistance;
            return;
        }

        if (this.drag.letItGo === false) {
            this.drag.letItGo = Math.abs(this.drag.startY - e.touches[0].pageY) < Math.abs(this.drag.startX - e.touches[0].pageX);
        }

        if (this.isScaled && this.pointerDown) {
            const BibiEvent = this.coordinator.getBibiEvent(e);
            this.slider.zoomer.translate = {
                X: this.drag.transformX - (BibiEvent.Coord.X - this.drag.startX),
                Y: this.drag.transformY - (BibiEvent.Coord.Y - this.drag.startY)
            };

            if (this.slider.zoomer.translate.X < 0)
                this.slider.zoomer.translate.X = 0;
            if (this.slider.zoomer.translate.Y < 0)
                this.slider.zoomer.translate.Y = 0;

            if (this.slider.zoomer.translate.X > this.slider.width)
                this.slider.zoomer.translate.X = this.slider.width; 
            if (this.slider.zoomer.translate.Y > this.slider.height)
                this.slider.zoomer.translate.Y = this.slider.height;

            return;
        }

        if(this.slider.ttb) {
            this.ui.mousing = false;
            return;
        }

        if (this.pointerDown && this.drag.letItGo) {
            this.drag.endX = e.touches[0].pageX;
            this.slider.updateProperties(false);

            const currentSlide = this.slider.currentSlide;
            const currentOffset = currentSlide * (this.slider.width / this.slider.perPage);
            const dragOffset = (this.drag.endX - this.drag.startX);
            const offset = this.slider.rtl ? currentOffset + dragOffset : currentOffset - dragOffset;
            
            (this.slider.properties as any).transform = `translate3d(${(this.slider.rtl ? 1 : -1) * offset}px, 0, 0)`;
        }
    }

    private get isScaled() {
        return this.slider.zoomer && this.slider.zoomer.scale > 1;
    }

    private addTouch(e: any) {
        e.touches = [{
            pageX: e.pageX,
            pageY: e.pageY
        }];
    }

    /**
     * mousedown event handler
     */
    mousedownHandler(e: MouseEvent) {
        if (this.isScaled) {
            this.addTouch(e as any);
            this.touchstartHandler(e as any);
        }
    }


    /**
     * mouseup event handler
     */
    mouseupHandler(e: MouseEvent) {
        if (this.isScaled) {
            this.addTouch(e);
            this.touchendHandler(e as any);
        }
    }

    private get mousePosOut() {
        if(this.mousePos.Ratio.Y > 0.95 || this.mousePos.Ratio.Y < 0.05)
            return true;
        return false;
    }

    mousemoveUpdater(e: MouseEvent) {
        this.mousePos = this.coordinator.getBibiEvent(e);
        this.ui.mousing = true;
    }

    private cursorHandler() {
        const sliderLength = this.slider.length - 1;
        const atFirstSlide = this.slider.toon ? this.slider.percentage === 0 : Math.max(this.slider.currentSlide, 0) === 0;
        const atLastSlide = this.slider.toon ? this.slider.percentage > 99.9 : Math.min(this.slider.currentSlide, sliderLength) === sliderLength && !this.slider.series.next;
        if (this.slider.ttb) { // Vertical controls
            switch (this.mousePos.Division.Y) {
                case VerticalThird.Bottom:
                    this.changeCursor(atLastSlide ? "not-allowed" : "s-resize");
                    break;
                case VerticalThird.Top:
                    this.changeCursor(atFirstSlide ? "not-allowed" : "n-resize");
                    break;
                case VerticalThird.Middle:
                    this.changeCursor("context-menu");
                    break;
            }
        } else { // Horizontal controls
            const rtl = this.slider.rtl;
            switch (this.mousePos.Division.X) {
                case HorizontalThird.Left:
                    this.changeCursor((atFirstSlide && !rtl || atLastSlide && rtl) ? "not-allowed" : "w-resize");
                    break;
                case HorizontalThird.Right:
                    this.changeCursor((atFirstSlide && rtl || atLastSlide && !rtl) ? "not-allowed" : "e-resize");
                    break;
                case HorizontalThird.Center:
                    this.changeCursor("context-menu");
                    break;
            }
        }
    }

    /**
     * mousemove event handler
     */
    mousemoveHandler(e: BibiMouseEvent) {
        if (this.isScaled) {
            this.addTouch(e as any);
            this.touchmoveHandler(e as any);
        } else {
            if(!e.special) {
                clearTimeout(this.mtimer);
                const mouseIt = window.setTimeout(() => {
                    this.ui.mousing = false; // Race!
                }, 50);
                this.mousePos = this.coordinator.getBibiEvent(e);
                if(this.mousePosOut) {
                    clearTimeout(mouseIt); // Cancel override
                    this.ui.mousing = true;
                    this.ui.toggle(true);
                } else {
                    this.mtimer = window.setTimeout(() => {
                        if(this.mousePosOut || this.ui.mousing)
                            return;
                        this.ui.toggle(false);
                        m.redraw();
                    }, 500);
                }

                this.cursorHandler();
            } else {
                this.changeCursor(null);
                this.ui.toggle(true);
                m.redraw();
            }
        }
    }

    private changeCursor(newCursor: string) {
        if (newCursor === this.currentCursor)
            return;
        this.currentCursor = newCursor;
    }

    get cursor() {
        return this.currentCursor ? this.currentCursor : "pointer";
    }

    private updateKeyCodes(EventTypes: string[] | string, KeyCodesToUpdate: Record<string, any>) {
        if (typeof (EventTypes as string[]).join !== "function") EventTypes = [EventTypes as string];
        if (typeof KeyCodesToUpdate === "function") KeyCodesToUpdate = KeyCodesToUpdate();
        (EventTypes as string[]).forEach((EventType) => {
            this.KeyCodes[EventType] = sML.edit(this.KeyCodes[EventType], KeyCodesToUpdate);
        });
    }

    /**
     * Recalculate drag/swipe event and reposition the frame of a slider
     */
    private updateAfterDrag() {
        const movement = (this.slider.rtl ? -1 : 1) * (this.drag.endX - this.drag.startX);
        const movementDistance = Math.abs(movement);
        const howManySliderToSlide = this.slider.perPage;

        const slideToNegativeClone = movement > 0 && this.slider.currentSlide - howManySliderToSlide < 0;
        const slideToPositiveClone = movement < 0 && this.slider.currentSlide + howManySliderToSlide > this.slider.slength - this.slider.perPage;

        let changed = false;
        if (movement > 0 && movementDistance > this.slider.threshold && this.slider.slength > this.slider.perPage) {
            this.slider.prev(howManySliderToSlide);
            changed = true;
        } else if (movement < 0 && movementDistance > this.slider.threshold && this.slider.slength > this.slider.perPage) {
            this.slider.next(howManySliderToSlide);
            changed = true;
        }
        this.ui.toggle(false);
        this.slider.slideToCurrent(true, true, changed); // slideToNegativeClone || slideToPositiveClone
    }

    ////////

    updateSpecialParameters() { // TODO better naming
        if(this.slider.single || this.slider.ttb)
            sML.edit(this.MovingParameters, {
                "Page Up": 0,
                "Page Down": 0,
                "End": 0,
                "Home": 0
            });
        else
            sML.edit(this.MovingParameters, {
                "Page Up": -1,
                "Page Down": 1,
                "End": "foot",
                "Home": "head"
            });
    }

    updateMovingParameters(ARD: XBReadingDirection) {
        switch (ARD) {
            case XBReadingDirection.TTB:
                return sML.edit(this.MovingParameters, {
                    "Up Arrow": 0, // -1
                    "Right Arrow": 0,
                    "Down Arrow": 0, // 1
                    "Left Arrow": 0,
                    "W": -1,
                    "D": 0,
                    "S": 1,
                    "A": 0,
                    "UP ARROW": "head",
                    "RIGHT ARROW": "",
                    "DOWN ARROW": "foot",
                    "LEFT ARROW": "",
                    "Plus": 0,
                    "Minus": 0,
                    "Zero": 0
                });
            case XBReadingDirection.LTR:
                return sML.edit(this.MovingParameters, {
                    "Up Arrow": 0,
                    "Right Arrow": 1,
                    "Down Arrow": 0,
                    "Left Arrow": -1,
                    "W": 0,
                    "D": 1,
                    "S": 0,
                    "A": -1,
                    "UP ARROW": "",
                    "RIGHT ARROW": "foot",
                    "DOWN ARROW": "",
                    "LEFT ARROW": "head",
                    "Plus": "zoom-in",
                    "Minus": "zoom-out",
                    "Zero": "zoom-reset"
                });
            case XBReadingDirection.RTL:
                return sML.edit(this.MovingParameters, {
                    "Up Arrow": 0,
                    "Right Arrow": -1,
                    "Down Arrow": 0,
                    "Left Arrow": 1,
                    "W": 0,
                    "D": -1,
                    "S": 0,
                    "A": 1,
                    "UP ARROW": "",
                    "RIGHT ARROW": "head",
                    "DOWN ARROW": "",
                    "LEFT ARROW": "foot",
                    "Plus": "zoom-in",
                    "Minus": "zoom-out",
                    "Zero": "zoom-reset"
                });
            default:
                return sML.edit(this.MovingParameters, {
                    "Up Arrow": 0,
                    "Right Arrow": 0,
                    "Down Arrow": 0,
                    "Left Arrow": 0,
                    "W": 0,
                    "D": 0,
                    "S": 0,
                    "A": 0,
                    "UP ARROW": "",
                    "RIGHT ARROW": "",
                    "DOWN ARROW": "",
                    "LEFT ARROW": "",
                    "Plus": 0,
                    "Minus": 0,
                    "Zero": 0
                });
        }
    }

    private getKeyName(Eve: KeyboardEvent) {
        const KeyName = (this.KeyCodes[Eve.type] as any)[Eve.keyCode];
        return KeyName ? KeyName : "";
    }

    private onEvent(Eve: BibiKeyboardEvent) {
        Eve.KeyName = this.getKeyName(Eve);
        Eve.BibiModifierKeys = [];
        if (Eve.shiftKey) Eve.BibiModifierKeys.push("Shift");
        if (Eve.ctrlKey) Eve.BibiModifierKeys.push("Control");
        if (Eve.altKey) Eve.BibiModifierKeys.push("Alt");
        if (Eve.metaKey) Eve.BibiModifierKeys.push("Meta");
        if (!Eve.KeyName) return false;
        //if (Eve.KeyName) Eve.preventDefault();
        return true;
    }

    onkeydown(Eve: BibiKeyboardEvent) {
        if (!this.onEvent(Eve)) return false;
        if (Eve.KeyName) {
            if (!this.ActiveKeys[Eve.KeyName]) {
                this.ActiveKeys[Eve.KeyName] = Date.now();
            } else {
                //E.dispatch("bibi:is-holding-key", Eve);
            }
        }
    }

    onkeyup(Eve: BibiKeyboardEvent) {
        clearTimeout(this.mtimer);
        if (!this.onEvent(Eve)) return false;
        if (this.ActiveKeys[Eve.KeyName] && Date.now() - this.ActiveKeys[Eve.KeyName] < 300) {
            this.updateSpecialParameters();
            this.tryMoving(Eve);
        }
        if (Eve.KeyName) {
            if (this.ActiveKeys[Eve.KeyName]) {
                delete this.ActiveKeys[Eve.KeyName];
            }
        }
    }

    onkeypress(Eve: KeyboardEvent) {
        if (!this.onEvent(Eve as BibiKeyboardEvent)) return false;
    }

    unobserve(item: EventTarget) {
        this.observers.forEach((EventName) => {
            if(item) item.removeEventListener(EventName, (this as any)["on" + EventName], false);
        });
    }

    observe(item: EventTarget) {
        this.observers.forEach((EventName) => {
            if(item) item.addEventListener(EventName, (this as any)["on" + EventName], false);
        });
    }

    private tryMoving(Eve: BibiKeyboardEvent) {
        if (!Eve.KeyName) return false;
        const MovingParameter = this.MovingParameters[!Eve.shiftKey ? Eve.KeyName : Eve.KeyName.toUpperCase()];
        if (!MovingParameter) {
            if(this.ui.toggle(false)) m.redraw();
            return false;
        }
        this.changeCursor("none");
        Eve.preventDefault();
        this.moveBy(MovingParameter);
    }

    attemptScrollTo(offset: number) {
        if(this.coordinator && this.coordinator.HTML && this.coordinator.HTML.scrollTo)
            this.coordinator.HTML.scrollTo({ // Scroll to bottom first
                top: offset,
                left: 0,
                behavior: "smooth"
            });
        else if(window.scrollTo)
            window.scrollTo(0, offset);
        else
            console.error("scrollTo not supported!");
    }

    moveBy(MovingParameter: any) {
        // Move
        if (typeof MovingParameter === "number") {
            if (MovingParameter === 1) {
                /* I don't think people like this behavior very much
                const bbEle = document.getElementById("br-book");
                if(this.slider.single && !this.slider.ttb && bbEle && (this.coordinator.HTML.scrollTop + window.innerHeight + 5) <= bbEle.clientHeight) {
                    this.attemptScrollTo(9999);
                    return;
                }
                */
                this.slider.next(this.slider.perPage);
                
            } else if (MovingParameter === -1) {
                if(this.slider.single && !this.slider.ttb && this.coordinator.HTML.scrollTop > 5) {
                    this.attemptScrollTo(0);
                    return;
                }

                this.slider.prev(this.slider.perPage);
            }
            // When rapidly navigating, ignore double clicks until cooldown
            this.disableDblClick = true;
            clearTimeout(this.dblDisabler);
            this.dblDisabler = window.setTimeout(() => {
                this.disableDblClick = false;
            }, 1000);
        } else if (typeof MovingParameter === "string") {
            if (MovingParameter === "head") {
                this.slider.goTo(0);
            } else if (MovingParameter === "foot") {
                this.slider.goTo(this.slider.length);
            }

            // Zoom
            if (MovingParameter === "zoom-in") {
                if (this.slider.zoomer.scale < MAX_SCALE)
                    this.slider.zoomer.scale += 0.5; // Gets slower as you zoom in more due to decreasing ratio impact
            } else if (MovingParameter === "zoom-out") {
                if (this.slider.zoomer.scale > 1)
                    this.slider.zoomer.scale -= 0.5;
            } else if (MovingParameter === "zoom-reset") {
                this.slider.zoomer.scale = 1;
            }
            // TODO: change zoomer position to center when zooming with keyboard

        }
        if (MovingParameter === "menu")
            this.ui.toggle();
        else
            this.ui.toggle(false);
        m.redraw();
    }

    // Pointer

    private evalPointer(event: MouseEvent, active: boolean) {
        if (!active)
            return;
        const ev = this.coordinator.getBibiEvent(event);
        if (this.slider.ttb) { // Vertical controls
            switch (ev.Division.Y) {
                case VerticalThird.Bottom:
                    this.moveBy(1);
                    break;
                case VerticalThird.Top:
                    this.moveBy(-1);
                    break;
                case VerticalThird.Middle:
                    this.ui.toggle();
                    m.redraw();
                    break;
            }
            this.cursorHandler();
        } else { // Horizontal controls
            const next = this.slider.rtl ? HorizontalThird.Left : HorizontalThird.Right;
            const prev = this.slider.rtl ? HorizontalThird.Right : HorizontalThird.Left;
            switch (ev.Division.X) {
                case next:
                    this.delayedMoveBy(1);
                    break;
                case prev:
                    this.delayedMoveBy(-1);
                    break;
                case HorizontalThird.Center:
                    this.delayedToggle();
                    break;
            }
        }
    }

    private delayedToggle() {
        if (!this.pdblclick) {
            this.ui.toggle();
            m.redraw();
        }
        this.pdblclick = false;
    }

    private delayedMoveBy(MovingParameter: any) {
        this.dtimer = window.setTimeout(() => {
            if (!this.pdblclick) {
                this.moveBy(MovingParameter);
                this.cursorHandler();
            }
            this.pdblclick = false;
        }, 200); // Unfortunately adds lag to interface elements :(
    }

    onclick(Eve: MouseEvent) {
        this.evalPointer(Eve, !this.isDragging);
    }

    ondblclick(Eve: MouseEvent) {
        clearTimeout(this.dtimer);
        this.pdblclick = true;

        this.ui.toggle(false);
        if (!this.slider.zoomer || this.disableDblClick)
            return;

        const BibiEvent = this.coordinator.getBibiEvent(Eve);
        this.slider.zoomer.scale = this.isScaled ? 1 : 2;
        if (this.isScaled)
            this.slider.zoomer.translate = {
                X: BibiEvent.Coord.X,
                Y: BibiEvent.Coord.Y
            };
        /*else
            this.slider.zoomer.translate = {
                X: 0,
                Y: 0
            };*/
    }

    onpointermove(Eve: BibiMouseEvent) {
        const CC = this.coordinator.getBibiEventCoord(Eve),
            PC = this.PreviousCoord;
        if (PC.X !== CC.X || PC.Y !== CC.Y) this.evalPointer(Eve, false); //E.dispatch("bibi:moved-pointer",   Eve);
        //else console.log("stopped moving");//E.dispatch("bibi:stopped-pointer", Eve);
        this.PreviousCoord = CC;
        if(Eve.special)
            this.ui.toggle(true);
    }

    private processVScroll() {
        if(this.ui.settingsShown)
            return true;
        if (!this.slider.ttb)
            return false;
        const br_spine = this.slider.selector;
        if(!br_spine) return false;
        const pages = br_spine.children;
        let totalHeight = 0;
        for (let index = 0; index < pages.length; index++) {
            const cpage = pages[index];
            if(!cpage) return false;
            const cheight = cpage.children[0].clientHeight; // TODO this is a perf hog
            if (Math.abs(document.documentElement.scrollTop + document.body.scrollTop - totalHeight) < (cheight * 0.6)) {
                if (index !== this.slider.currentSlide || this.slider.toon) {
                    this.slider.currentSlide = index;
                    if(!this.ui.mousing)
                        this.ui.toggle(false); // Hide UI when changing pages
                    this.reader.guideHidden = true;
                    this.slider.onChange();
                }
                return true;
            }
            totalHeight += cheight;
        }
    }

    onwheel(Eve: BibiWheelEvent) {
        const CW: Wheel = {} as any as Wheel,
            PWs = this.PreviousWheels,
            PWl = PWs.length;
        if (Math.abs(Eve.deltaX) > Math.abs(Eve.deltaY)) { // Horizontal scrolling
            CW.Distance = (Eve.deltaX < 0 ? -1 : 1) * (this.slider.rtl ? -1 : 1);
            CW.Delta = Math.abs(Eve.deltaX);
        } else if (!this.slider.ttb && this.slider.spread) { // Vertical scrolling for horizontal view when not in single page mode
            CW.Distance = (Eve.deltaY < 0 ? -1 : 1);
            CW.Delta = Math.abs(Eve.deltaY);
        } else { // Single page scroll instantly hides interface
            if(!this.ui.isHidden && !this.slider.ttb) {
                this.ui.toggle(false);
                m.redraw();
            }
            return;
        }
        if (!PWs[PWl - 1]) {
            CW.Accel = 1, CW.Wheeled = WheelState.Start;
        } else if (CW.Distance !== PWs[PWl - 1].Distance) {
            CW.Accel = 1;
            if (PWl >= 3 && PWs[PWl - 2].Distance !== CW.Distance && PWs[PWl - 3].Distance !== CW.Distance) CW.Wheeled = WheelState.Reverse;
        } else if (CW.Delta > PWs[PWl - 1].Delta) {
            CW.Accel = 1;
            if (PWl >= 3 && PWs[PWl - 1].Accel === -1 && PWs[PWl - 2].Accel === -1 && PWs[PWl - 3].Accel === -1) CW.Wheeled = WheelState.Serial;
        } else if (CW.Delta < PWs[PWl - 1].Delta) {
            CW.Accel = -1;
        } else {
            CW.Accel = PWs[PWl - 1].Accel;
        }
        if (CW.Wheeled !== WheelState.None) {
            Eve.BibiSwiperWheel = CW;
            clearTimeout(this.Timer_cooldown);
            this.Timer_cooldown = window.setTimeout(() => this.onwheeled_hot = false, 300);
            if (!this.onwheeled_hot && !this.processVScroll()) {
                // Eve.preventDefault(); Causes console error
                this.onwheeled_hot = true;
                this.moveBy(Eve.BibiSwiperWheel.Distance);
            }
        }
        if (PWl >= 3) PWs.shift();
        PWs.push(CW);
        clearTimeout(this.onwheelTimer_stop);
        this.onwheelTimer_stop = window.setTimeout(() => {
            this.PreviousWheels = [];
        }, 192);
    }

    onscroll(Eve: Event) {
        if(this.ignoreScrollFlag) {
            this.ignoreScrollFlag = false;
            return false;
        }
        this.processVScroll();
        if (!this.Scrolling) {
            this.Scrolling = true;
        }
        //E.dispatch("bibi:scrolls", Eve);
        clearTimeout(this.Timer_onscrolled);
        this.Timer_onscrolled = window.setTimeout(() => {
            this.Scrolling = false;
        }, 123);
    }

    ontouchmove(Eve: TouchEvent) {
        this.onscroll(Eve);
    }
}