import m from "mithril";
import sML from "./sMLstub";
import Coordinator from "./coordinator";

const MAX_SCALE = 6;

export default class Peripherals {
    constructor(Reader) {
        this.slider = Reader.slider;
        this.ui = Reader.ui;
        this.reader = Reader;

        this.PreviousWheels = [];
        this.PreviousCoord = {
            X: 0,
            Y: 0
        };
        this.isDragging = false;
        this.isPinching = false;
        this.coordinator = new Coordinator(this);
        this.ActiveKeys = {};
        this.KeyCodes = {
            "keydown": {},
            "keyup": {},
            "keypress": {}
        };
        this.MovingParameters = {
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

        this.observers = ["keydown", "keyup", "keypress", "wheel", "scroll", "touchmove", "message"];

        this.handlers = [
            "touchstartHandler", "touchendHandler", "touchmoveHandler", "mousedownHandler", "mouseupHandler", "mousemoveHandler", "mousemoveUpdater", "mtimerUpdater", "onkeydown", "onkeyup", "onkeypress", "onwheel", "onscroll", "ontouchmove", "onpointermove", "onclick", "ondblclick", "onmessage"
        ];

        // Bind all event handlers for referencability
        this.handlers.forEach(method => {
            this[method] = this[method].bind(this);
        });
        //this.observe(this.slider.selector);
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
        //this.unobserve(this.slider.selector);
        this.unobserve(window);
        const tx = document.documentElement;
        tx.removeEventListener("pointermove", this.onpointermove);
        tx.removeEventListener("mousemove", this.mousemoveUpdater);
        /*this.slider.selector.removeEventListener("touchend", this.mtimerUpdater);
        this.slider.selector.removeEventListener("mouseup", this.mtimerUpdater);
        this.slider.selector.removeEventListener("mousedown", this.mtimerUpdater);
        this.slider.selector.removeEventListener("mousemove", this.mousemoveHandler);*/

        this.coordinator = null;
    }

    onmessage(e) { // TODO more messages
        if(!e.data)
            return;
        if(e.data.indexOf("xbr:move:") !== 0)
            return;
        e.stopPropagation();
        const p = e.data.split(":");
        const v = p[p.length - 1];
        this.moveBy(isNaN(v) ? v : parseInt(v));
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
            letItGo: null,
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
    clearDrag() {
        this.drag = {
            startX: 0,
            endX: 0,
            startY: 0,
            letItGo: null,
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
    touchstartHandler(e) {
        // Prevent dragging / swiping on inputs, selects and textareas
        const ignoreSlider = ["TEXTAREA", "OPTION", "INPUT", "SELECT"].indexOf(e.target.nodeName) !== -1;
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

    mtimerUpdater(e) {
        e.redraw = false;
        setTimeout(() => {
            clearTimeout(this.mtimer);
        }, 100);
    }

    /**
     * touchend event handler
     */
    touchendHandler(e) {
        e.stopPropagation();
        this.pointerDown = false;
        //this.slider.updateProperties(true);

        if (this.drag.endX) {
            this.updateAfterDrag();
        }
        setTimeout(() => {
            this.clearDrag();
        }, 50);
    }


    /**
     * touchmove event handler
     */
    touchmoveHandler(e) {
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
                    Y: this.pinch.startOffset.Y,
                },
            };
            this.pinch.startDistance = currentDistance;
            return;
        }

        if (this.drag.letItGo === null) {
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
            
            this.slider.properties.transform = `translate3d(${(this.slider.rtl ? 1 : -1) * offset}px, 0, 0)`;
        }
    }

    get isScaled() {
        return this.slider.zoomer && this.slider.zoomer.scale > 1;
    }

    addTouch(e) {
        e.touches = [{
            pageX: e.pageX,
            pageY: e.pageY
        }];
    }

    /**
     * mousedown event handler
     */
    mousedownHandler(e) {
        if (this.isScaled) {
            this.addTouch(e);
            this.touchstartHandler(e);
        }
    }


    /**
     * mouseup event handler
     */
    mouseupHandler(e) {
        if (this.isScaled) {
            this.addTouch(e);
            this.touchendHandler(e);
        }
    }

    get mousePosOut() {
        if(this.mousePos.Ratio.Y > 0.95 || this.mousePos.Ratio.Y < 0.05)
            return true;
        return false;
    }

    mousemoveUpdater(e) {
        this.mousePos = this.coordinator.getBibiEvent(e);
        this.ui.mousing = true;
    }

    /**
     * mousemove event handler
     */
    mousemoveHandler(e) {
        if (this.isScaled) {
            this.addTouch(e);
            this.touchmoveHandler(e);
        } else {
            if(!e.special) {
                clearTimeout(this.mtimer);
                const mouseIt = setTimeout(() => {
                    this.ui.mousing = false; // Race!
                }, 50);
                this.mousePos = this.coordinator.getBibiEvent(e);
                if(this.mousePosOut) {
                    clearTimeout(mouseIt); // Cancel override
                    this.ui.mousing = true;
                    this.ui.toggle(true);
                } else {
                    this.mtimer = setTimeout(() => {
                        if(this.mousePosOut || this.ui.mousing)
                            return;
                        this.ui.toggle(false);
                        m.redraw();
                    }, 500);
                }

                const sliderLength = this.slider.length - 1;
                const atFirstSlide = Math.max(this.slider.currentSlide, 0) == 0;
                const atLastSlide = Math.min(this.slider.currentSlide, sliderLength) == sliderLength;
                if (this.slider.ttb) { // Vertical controls
                    switch (this.mousePos.Division.Y) {
                    case "bottom":
                        this.changeCursor(atLastSlide ? "not-allowed" : "s-resize");
                        break;
                    case "top":
                        this.changeCursor(atFirstSlide ? "not-allowed" : "n-resize");
                        break;
                    case "middle":
                        this.changeCursor("pointer");
                        break;
                    }
                } else { // Horizontal controls
                    const rtl = this.slider.rtl;
                    switch (this.mousePos.Division.X) {
                    case "left":
                        this.changeCursor((atFirstSlide && !rtl || atLastSlide && rtl) ? "not-allowed" : "w-resize");
                        break;
                    case "right":
                        this.changeCursor((atFirstSlide && rtl || atLastSlide && !rtl) ? "not-allowed" : "e-resize");
                        break;
                    case "center":
                        this.changeCursor("pointer");
                        break;
                    }
                }
            } else {
                this.changeCursor(null);
                this.ui.toggle(true);
                m.redraw();
            }
        }
    }

    changeCursor(newCursor) {
        if (newCursor == this.currentCursor)
            return;
        this.currentCursor = newCursor;
    }

    get cursor() {
        return this.currentCursor ? this.currentCursor : "pointer";
    }

    updateKeyCodes(EventTypes, KeyCodesToUpdate) {
        if (typeof EventTypes.join != "function") EventTypes = [EventTypes];
        if (typeof KeyCodesToUpdate == "function") KeyCodesToUpdate = KeyCodesToUpdate();
        EventTypes.forEach((EventType) => {
            this.KeyCodes[EventType] = sML.edit(this.KeyCodes[EventType], KeyCodesToUpdate);
        });
    }


    /**
     * Recalculate drag/swipe event and reposition the frame of a slider
     */
    updateAfterDrag() {
        const movement = (this.slider.rtl ? -1 : 1) * (this.drag.endX - this.drag.startX);
        const movementDistance = Math.abs(movement);
        const howManySliderToSlide = this.slider.perPage;

        const slideToNegativeClone = movement > 0 && this.slider.currentSlide - howManySliderToSlide < 0;
        const slideToPositiveClone = movement < 0 && this.slider.currentSlide + howManySliderToSlide > this.slider.slength - this.slider.perPage;

        if (movement > 0 && movementDistance > this.slider.threshold && this.slider.slength > this.slider.perPage) {
            this.slider.prev(howManySliderToSlide);
        } else if (movement < 0 && movementDistance > this.slider.threshold && this.slider.slength > this.slider.perPage) {
            this.slider.next(howManySliderToSlide);
        }
        this.ui.toggle(false);
        this.slider.slideToCurrent(true); // slideToNegativeClone || slideToPositiveClone
    }

    ////////

    updateSpecialParamters() { // TODO better naming
        if(this.slider.single || this.slider.ttb)
            sML.edit(this.MovingParameters, {
                "Page Up": 0,
                "Page Down": 0,
                "End": 0,
                "Home": 0,
            });
        else
            sML.edit(this.MovingParameters, {
                "Page Up": -1,
                "Page Down": 1,
                "End": "foot",
                "Home": "head",
            });
    }

    updateMovingParameters(ARD) {
        switch (ARD) {
        case "ttb":
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
                "Zero": 0,
            });
        case "ltr":
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
                "Zero": "zoom-reset",
            });
        case "rtl":
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
                "Zero": "zoom-reset",
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
                "Zero": 0,
            });
        }
    }

    getKeyName(Eve) {
        var KeyName = this.KeyCodes[Eve.type][Eve.keyCode];
        return KeyName ? KeyName : "";
    }

    onEvent(Eve) {
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

    onkeydown(Eve) {
        if (!this.onEvent(Eve)) return false;
        if (Eve.KeyName) {
            if (!this.ActiveKeys[Eve.KeyName]) {
                this.ActiveKeys[Eve.KeyName] = Date.now();
            } else {
                //E.dispatch("bibi:is-holding-key", Eve);
            }
        }
    }

    onkeyup(Eve) {
        clearTimeout(this.mtimer);
        if (!this.onEvent(Eve)) return false;
        if (this.ActiveKeys[Eve.KeyName] && Date.now() - this.ActiveKeys[Eve.KeyName] < 300) {
            this.updateSpecialParamters();
            this.tryMoving(Eve);
        }
        if (Eve.KeyName) {
            if (this.ActiveKeys[Eve.KeyName]) {
                delete this.ActiveKeys[Eve.KeyName];
            }
        }
    }

    onkeypress(Eve) {
        if (!this.onEvent(Eve)) return false;
    }

    unobserve(item) {
        this.observers.forEach((EventName) => {
            item.removeEventListener(EventName, this["on" + EventName], false);
        });
    }

    observe(item) {
        this.observers.forEach((EventName) => {
            item.addEventListener(EventName, this["on" + EventName], false);
        });
    }

    tryMoving(Eve) {
        if (!Eve.KeyName) return false;
        var MovingParameter = this.MovingParameters[!Eve.shiftKey ? Eve.KeyName : Eve.KeyName.toUpperCase()];
        if (!MovingParameter) {
            //Eve.target = this.slider.selector;
            // this.slider.selector.focus(); // TODO!
            if(this.ui.toggle(false)) m.redraw();
            return false;
        }
        this.changeCursor("none");
        Eve.preventDefault();
        this.moveBy(MovingParameter);
    }

    attemptScrollTo(offset) {
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

    moveBy(MovingParameter) {
        // Move
        if (typeof MovingParameter == "number") {
            if (MovingParameter === 1) {
                const bbEle = document.getElementById("br-book");
                if(this.slider.single && !this.slider.ttb && bbEle && (this.coordinator.HTML.scrollTop + window.innerHeight + 5) <= bbEle.clientHeight) {
                    this.attemptScrollTo(9999);
                    return;
                }
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
            this.dblDisabler = setTimeout(() => {
                this.disableDblClick = false;
            }, 1000);
        } else if (typeof MovingParameter == "string") {
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
        }
        if (MovingParameter === "menu")
            this.ui.toggle();
        else
            this.ui.toggle(false);
        m.redraw();
    }

    // Pointer

    evalPointer(event, active) {
        if (!active)
            return;
        const ev = this.coordinator.getBibiEvent(event);
        if (this.slider.ttb) { // Vertical controls
            switch (ev.Division.Y) {
            case "bottom":
                this.moveBy(1);
                break;
            case "top":
                this.moveBy(-1);
                break;
            case "middle":
                this.ui.toggle();
                m.redraw();
                break;
            }
        } else { // Horizontal controls
            const next = this.slider.rtl ? "left" : "right";
            const prev = this.slider.rtl ? "right" : "left";
            switch (ev.Division.X) {
            case next:
                this.delayedMoveBy(1);
                break;
            case prev:
                this.delayedMoveBy(-1);
                break;
            case "center":
                this.delayedToggle();
                break;
            }
        }
    }

    delayedToggle() {
        if (!this.pdblclick) {
            this.ui.toggle();
            m.redraw();
        }
        this.pdblclick = false;
    }

    delayedMoveBy(MovingParameter) {
        this.dtimer = setTimeout(() => {
            if (!this.pdblclick) {
                this.moveBy(MovingParameter);
            }
            this.pdblclick = false;
        }, 200); // Unfortunately adds lag to interface elements :(
    }

    ontap(Eve) {}

    onclick(Eve) {
        this.evalPointer(Eve, !this.isDragging);
    }

    ondblclick(Eve) {
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

    onpointermove(Eve) {
        var CC = this.coordinator.getBibiEventCoord(Eve),
            PC = this.PreviousCoord;
        if (PC.X != CC.X || PC.Y != CC.Y) this.evalPointer(Eve, false); //E.dispatch("bibi:moved-pointer",   Eve);
        //else                             console.log("stopped moving");//E.dispatch("bibi:stopped-pointer", Eve);
        this.PreviousCoord = CC;
        if(Eve.special)
            this.ui.toggle(true);
    }

    processVScroll() {
        if (!this.slider.ttb)
            return false;
        const pages = document.getElementById("br-slider").children;
        let totalHeight = 0;
        for (let index = 0; index < pages.length; index++) {
            const cheight = pages[index].children[0].clientHeight;
            if (Math.abs(document.documentElement.scrollTop + document.body.scrollTop - totalHeight) < (cheight * 0.6)) {
                if (index != this.slider.currentSlide) {
                    this.slider.currentSlide = index;
                    if(!this.ui.mousing)
                        this.ui.toggle(false); // Hide UI when changing pages
                    this.reader.guideHidden = true;
                    m.redraw();
                    this.slider.onChange();
                }
                return true;
            }
            totalHeight += cheight;
        }
    }

    onwheel(Eve) {
        let CW = {},
            PWs = this.PreviousWheels,
            PWl = PWs.length;
        if (Math.abs(Eve.deltaX) > Math.abs(Eve.deltaY)) { // Horizontal scrolling
            CW.Distance = (Eve.deltaX < 0 ? -1 : 1) * (this.slider.rtl ? -1 : 1);
            CW.Delta = Math.abs(Eve.deltaX);
        } else if (!this.slider.ttb && !this.slider.single) { // Vertical scrolling for horizontal view, only in spread view though
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
            CW.Accel = 1, CW.Wheeled = "start";
        } else if (CW.Distance != PWs[PWl - 1].Distance) {
            CW.Accel = 1;
            if (PWl >= 3 && PWs[PWl - 2].Distance != CW.Distance && PWs[PWl - 3].Distance != CW.Distance) CW.Wheeled = "reverse";
        } else if (CW.Delta > PWs[PWl - 1].Delta) {
            CW.Accel = 1;
            if (PWl >= 3 && PWs[PWl - 1].Accel == -1 && PWs[PWl - 2].Accel == -1 && PWs[PWl - 3].Accel == -1) CW.Wheeled = "serial";
        } else if (CW.Delta < PWs[PWl - 1].Delta) {
            CW.Accel = -1;
        } else {
            CW.Accel = PWs[PWl - 1].Accel;
        }
        if (CW.Wheeled) {
            Eve.BibiSwiperWheel = CW;
            clearTimeout(this.Timer_cooldown);
            this.Timer_cooldown = setTimeout(() => this.onwheeled_hot = false, 300);
            if (!this.onwheeled_hot && !this.processVScroll()) {
                Eve.preventDefault();
                this.onwheeled_hot = true;
                this.moveBy(Eve.BibiSwiperWheel.Distance);
            }
        }
        if (PWl >= 3) PWs.shift();
        PWs.push(CW);
        clearTimeout(this.onwheelTimer_stop);
        this.onwheelTimer_stop = setTimeout(() => {
            this.PreviousWheels = [];
        }, 192);
    }

    onscroll(Eve) {
        this.processVScroll();
        if (!this.Scrolling) {
            this.Scrolling = true;
            Eve.BibiScrollingBegun = true;
        }
        //E.dispatch("bibi:scrolls", Eve);
        clearTimeout(this.Timer_onscrolled);
        this.Timer_onscrolled = setTimeout(() => {
            this.Scrolling = false;
        }, 123);
    }

    ontouchmove(Eve) {
        this.onscroll(Eve);
    }
}