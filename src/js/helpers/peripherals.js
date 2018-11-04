import m from "mithril";
import sML from "./sMLstub";
import Coordinator from "./coordinator";
import Platform from "./platform";

export default class Peripherals {
    constructor(Reader) {
        this.slider = Reader.slider;
        this.ui = Reader.ui;
        this.reader = Reader;

        this.transformProperty = Platform.webkitOrNot();
        this.onwheel.PreviousWheels = [];
        this.PreviousCoord = {
            X: 0,
            Y: 0
        };
        this.isDragging = false;
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
            // What MD does maybe implement
            /*
            F for fit toggle
            G for spread toggle
            H for direction toggle
            */
        });

        this.updateMovingParameters(Reader.direction);
        this.observe(this.slider.selector);
        this.observe(window);
        const tx = document.documentElement;
        tx.addEventListener("pointermove", event => this.onpointermove(event));
        this.slider.selector.addEventListener("click", event => this.onclick(event));
        //this.slider.selector.addEventListener("dblclick", event => this.ondblclick(event));


        // Bind all event handlers for referencability
        ["touchstartHandler", "touchendHandler", "touchmoveHandler", "mousedownHandler", "mouseupHandler", "mousemoveHandler", "mousemoveUpdater", "mtimerUpdater"].forEach(method => {
            this[method] = this[method].bind(this);
        });
        this.attachEvents();
        // Mousemove applies to TTB view as well because it controls cursors.
        tx.addEventListener("mousemove", this.mousemoveUpdater);
        this.slider.selector.addEventListener("touchend", this.mtimerUpdater);
        this.slider.selector.addEventListener("mouseup", this.mtimerUpdater);
        this.slider.selector.addEventListener("mousedown", this.mtimerUpdater);
        this.slider.selector.addEventListener("mousemove", this.mousemoveHandler);

        console.log("Peripherals ready");
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

        // Touch events
        this.slider.selector.addEventListener("touchstart", this.touchstartHandler);
        this.slider.selector.addEventListener("touchend", this.touchendHandler);
        this.slider.selector.addEventListener("touchmove", this.touchmoveHandler);

        // Mouse events, only used for zoom moving
        this.slider.selector.addEventListener("mousedown", this.mousedownHandler);
        this.slider.selector.addEventListener("mouseup", this.mouseupHandler);
    }



    /**
     * Detaches listeners from required events.
     */
    detachEvents() {
        this.slider.selector.removeEventListener("touchstart", this.touchstartHandler);
        this.slider.selector.removeEventListener("touchend", this.touchendHandler);
        this.slider.selector.removeEventListener("touchmove", this.touchmoveHandler);
        this.slider.selector.removeEventListener("mousedown", this.mousedownHandler);
        this.slider.selector.removeEventListener("mouseup", this.mouseupHandler);
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

        if(e.touches.length === 3) { // Three or more fingers
            this.ui.toggle();
            m.redraw();
            return;
        }

        this.pointerDown = true;
        this.drag.startX = e.touches[0].pageX;
        this.drag.startY = e.touches[0].pageY;
        if (this.reader.zoomer) {
            this.drag.transformX = this.reader.zoomer.translate.X;
            this.drag.transformY = this.reader.zoomer.translate.Y;
        }
    }

    mtimerUpdater(e) {
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
        this.slider.enableTransition();
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

        if ((Math.abs(this.drag.startY - e.touches[0].pageY) + Math.abs(this.drag.startX - e.touches[0].pageX)) > 5 && this.pointerDown) {
            this.isDragging = true;
        }

        if (this.drag.letItGo === null) {
            this.drag.letItGo = Math.abs(this.drag.startY - e.touches[0].pageY) < Math.abs(this.drag.startX - e.touches[0].pageX);
        }

        if (this.isScaled && this.pointerDown) {
            e.preventDefault();
            const BibiEvent = this.coordinator.getBibiEvent(e);
            this.reader.zoomer.translate = {
                X: this.drag.transformX - (BibiEvent.Coord.X - this.drag.startX),
                Y: this.drag.transformY - (BibiEvent.Coord.Y - this.drag.startY)
            };

            if (this.reader.zoomer.translate.X < 0)
                this.reader.zoomer.translate.X = 0;
            if (this.reader.zoomer.translate.Y < 0)
                this.reader.zoomer.translate.Y = 0;

            if (this.reader.zoomer.translate.X > this.slider.selector.offsetWidth)
                this.reader.zoomer.translate.X = this.slider.selector.offsetWidth;
            if (this.reader.zoomer.translate.Y > this.slider.selector.offsetHeight)
                this.reader.zoomer.translate.Y = this.slider.selector.offsetHeight;

            m.redraw();
            return;
        }

        if (this.pointerDown && this.drag.letItGo) {
            e.preventDefault();
            this.drag.endX = e.touches[0].pageX;
            this.slider.sliderFrame.style.webkitTransition = `all 0ms ${this.slider.config.easing}`;
            this.slider.sliderFrame.style.transition = `all 0ms ${this.slider.config.easing}`;

            const currentSlide = this.slider.currentSlide;
            const currentOffset = currentSlide * (this.slider.selectorWidth / this.slider.perPage);
            const dragOffset = (this.drag.endX - this.drag.startX);
            const offset = this.slider.config.rtl ? currentOffset + dragOffset : currentOffset - dragOffset;
            this.slider.sliderFrame.style[this.transformProperty] = `translate3d(${(this.slider.config.rtl ? 1 : -1) * offset}px, 0, 0)`;
        }
    }

    get isScaled() {
        return this.reader.zoomer && this.reader.zoomer.scale > 1;
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
            clearTimeout(this.mtimer);
            const mouseIt = setTimeout(() => {
                this.ui.mousing = false; // Race!
            }, 50);
            this.mousePos = this.coordinator.getBibiEvent(e);
            if(this.mousePosOut) {
                clearTimeout(mouseIt); // Cancel override
                this.ui.mousing = true;
                this.ui.toggle(true);
                m.redraw();
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
            if (this.slider.config.ttb) { // Vertical controls
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
                const rtl = this.slider.config.rtl;
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
        }
    }

    changeCursor(newCursor) {
        if (newCursor == this.currentCursor)
            return;
        this.currentCursor = newCursor;
        m.redraw();
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
        const movement = (this.slider.config.rtl ? -1 : 1) * (this.drag.endX - this.drag.startX);
        const movementDistance = Math.abs(movement);
        const howManySliderToSlide = this.slider.perPage * (this.slider.config.multipleDrag ? Math.ceil(movementDistance / (this.slider.selectorWidth / this.slider.perPage)) : 1);

        const slideToNegativeClone = movement > 0 && this.slider.currentSlide - howManySliderToSlide < 0;
        const slideToPositiveClone = movement < 0 && this.slider.currentSlide + howManySliderToSlide > this.slider.innerElements.length - this.slider.perPage;

        if (movement > 0 && movementDistance > this.slider.config.threshold && this.slider.innerElements.length > this.slider.perPage) {
            this.slider.prev(howManySliderToSlide);
        } else if (movement < 0 && movementDistance > this.slider.config.threshold && this.slider.innerElements.length > this.slider.perPage) {
            this.slider.next(howManySliderToSlide);
        }
        this.ui.toggle(false);
        this.slider.slideToCurrent(true); // slideToNegativeClone || slideToPositiveClone
        m.redraw();
    }

    ////////

    updateSpecialParamters() { // TODO better naming
        if(this.slider.single)
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

    observe(item) {
        ["keydown", "keyup", "keypress", "wheel", "scroll", "touchmove"].forEach((EventName) => {
            item.addEventListener(EventName, (e) => this["on" + EventName](e), false);
        });
    }

    tryMoving(Eve) {
        if (!Eve.KeyName) return false;
        var MovingParameter = this.MovingParameters[!Eve.shiftKey ? Eve.KeyName : Eve.KeyName.toUpperCase()];
        if (!MovingParameter) {
            //Eve.target = this.slider.selector;
            this.slider.selector.focus();
            if(this.ui.toggle(false)) m.redraw();
            return false;
        }
        this.changeCursor("none");
        Eve.preventDefault();
        this.moveBy(MovingParameter);
    }

    // Master

    moveBy(MovingParameter) {
        // Move
        if (typeof MovingParameter == "number") {
            if (MovingParameter === 1) {
                this.slider.next(this.slider.perPage);
            } else if (MovingParameter === -1) {
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
                if (this.reader.zoomer.scale < 6)
                    this.reader.zoomer.scale += 0.5; // Gets slower as you zoom in more due to decreasing ratio impact
            } else if (MovingParameter === "zoom-out") {
                if (this.reader.zoomer.scale > 1)
                    this.reader.zoomer.scale -= 0.5;
            } else if (MovingParameter === "zoom-reset") {
                this.reader.zoomer.scale = 1;
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
        if (this.slider.config.ttb) { // Vertical controls
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
            const next = this.slider.config.rtl ? "left" : "right";
            const prev = this.slider.config.rtl ? "right" : "left";
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
        if (!this.reader.zoomer || this.disableDblClick)
            return;

        const BibiEvent = this.coordinator.getBibiEvent(Eve);
        this.reader.zoomer.scale = this.isScaled ? 1 : 2;
        if (this.isScaled)
            this.reader.zoomer.translate = {
                X: BibiEvent.Coord.X,
                Y: BibiEvent.Coord.Y
            };
        /*else
            this.reader.zoomer.translate = {
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
    }

    processVScroll() {
        if (!this.slider.config.ttb)
            return false;
        const pages = this.slider.selector.children;
        let totalHeight = 0;
        for (let index = 0; index < pages.length; index++) {
            if (Math.abs(document.documentElement.scrollTop + document.body.scrollTop - totalHeight) < (pages[index].clientHeight * 0.6)) {
                if (index != this.slider.currentSlide) {
                    if(!this.reader.binder) // before ready
                        return;
                    this.slider.currentSlide = index;
                    if(!this.ui.mousing)
                        this.ui.toggle(false); // Hide UI when changing pages
                    this.reader.guideHidden = true;
                    m.redraw();
                    this.slider.config.onChange.call(this);
                }
                return true;
            }
            totalHeight += pages[index].clientHeight;
        }
    }

    onwheel(Eve) {
        let CW = {},
            PWs = this.onwheel.PreviousWheels,
            PWl = PWs.length;
        if (Math.abs(Eve.deltaX) > Math.abs(Eve.deltaY)) { // Horizontal scrolling
            CW.Distance = (Eve.deltaX < 0 ? -1 : 1) * (this.slider.config.rtl ? -1 : 1);
            CW.Delta = Math.abs(Eve.deltaX);
        } else if (!this.slider.config.ttb && !this.slider.single) { // Vertical scrolling for horizontal view, only in spread view though
            CW.Distance = (Eve.deltaY < 0 ? -1 : 1);
            CW.Delta = Math.abs(Eve.deltaY);
        } else { // Single page scroll instantly hides interface
            if(!this.ui.isHidden && !this.slider.config.ttb) {
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
        clearTimeout(this.onwheel.Timer_stop);
        this.onwheel.Timer_stop = setTimeout(() => {
            this.onwheel.PreviousWheels = [];
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