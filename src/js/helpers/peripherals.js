import m from "mithril";
import sML from "./sMLstub";
import Coordinator from "./coordinator";
import Platform from "./platform";

export default class Peripherals {
    constructor(Reader) {
        this.slider = Reader.slider;
        this.interface = Reader.interface;

        this.transformProperty = Platform.webkitOrNot();
        this.onwheel.PreviousWheels = [];
        this.PreviousCoord = {
            X: 0,
            Y: 0
        };
        this.coordinator = new Coordinator(this);
        this.ActiveKeys = {};
        this.KeyCodes = {
            "keydown": {},
            "keyup": {},
            "keypress": {}
        };
        this.MovingParameters = {
            "Space": 1,
            "Page Up": -1,
            "Page Down": 1,
            "End": "foot",
            "Home": "head",
            "SPACE": -1,
            "PAGE UP": "head",
            "PAGE DOWN": "foot",
            "END": "foot",
            "HOME": "head"
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
            //TODO:
            /*
            F for fit toggle
            G for spread toggle
            H for direction toggle
            */
        });

        //E.add("bibi:updated-settings", (   ) => { this.updateMovingParameters(); });
        this.updateMovingParameters(Reader.direction);
        //E.add("bibi:opened",           (   ) => { this.updateMovingParameters(); this.observe(); });
        this.observe(this.slider.selector);
        this.observe(document.body);
        let tx = document.documentElement;
        tx.addEventListener("pointermove", event => this.onpointermove(event));
        this.slider.selector.addEventListener("click", event => this.onpointerdown(event));
        this.slider.selector.addEventListener("click", event => this.onpointerup(event));


        // Bind all event handlers for referencability
        ["touchstartHandler", "touchendHandler", "touchmoveHandler"].forEach(method => {
            this[method] = this[method].bind(this);
        });
        this.attachEvents();

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
        };

        // Touch events
        this.slider.selector.addEventListener("touchstart", this.touchstartHandler);
        this.slider.selector.addEventListener("touchend", this.touchendHandler);
        this.slider.selector.addEventListener("touchmove", this.touchmoveHandler);
    }



    /**
     * Detaches listeners from required events.
     */
    detachEvents() {
        this.slider.selector.removeEventListener("touchstart", this.touchstartHandler);
        this.slider.selector.removeEventListener("touchend", this.touchendHandler);
        this.slider.selector.removeEventListener("touchmove", this.touchmoveHandler);
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
            preventClick: this.drag.preventClick
        };
    }


    /**
     * touchstart event handler
     */
    touchstartHandler(e) {
        // Prevent dragging / swiping on inputs, selects and textareas
        const ignoreSlider = ["TEXTAREA", "OPTION", "INPUT", "SELECT"].indexOf(e.target.nodeName) !== -1;
        if (ignoreSlider) {
            return;
        }

        e.stopPropagation();
        this.pointerDown = true;
        this.drag.startX = e.touches[0].pageX;
        this.drag.startY = e.touches[0].pageY;
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
        this.clearDrag();
    }


    /**
     * touchmove event handler
     */
    touchmoveHandler(e) {
        e.stopPropagation();

        if (this.drag.letItGo === null) {
            this.drag.letItGo = Math.abs(this.drag.startY - e.touches[0].pageY) < Math.abs(this.drag.startX - e.touches[0].pageX);
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
        this.interface.toggle(false);
        this.slider.slideToCurrent(true); // slideToNegativeClone || slideToPositiveClone

    }

    ////////

    updateMovingParameters(ARD) {
        switch (ARD) {
        case "ttb":
            return sML.edit(this.MovingParameters, {
                "Up Arrow": -1,
                "Right Arrow": 0,
                "Down Arrow": 1,
                "Left Arrow": 0,
                "W": -1,
                "D": 0,
                "S": 1,
                "A": 0,
                "UP ARROW": "head",
                "RIGHT ARROW": "",
                "DOWN ARROW": "foot",
                "LEFT ARROW": ""
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
                "LEFT ARROW": "head"
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
                "LEFT ARROW": "foot"
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
                "LEFT ARROW": ""
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
        //if(!Eve.KeyName) return false;
        if (Eve.KeyName) Eve.preventDefault();
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
        if (!this.onEvent(Eve)) return false;
        if (this.ActiveKeys[Eve.KeyName] && Date.now() - this.ActiveKeys[Eve.KeyName] < 300) {
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
        if (!MovingParameter) return false;
        Eve.preventDefault();
        this.moveBy(MovingParameter);
    }

    // Master

    moveBy(MovingParameter) {
        if (typeof MovingParameter == "number") {
            if (MovingParameter === 1) {
                this.slider.next(this.slider.perPage);
            } else if (MovingParameter === -1) {
                this.slider.prev(this.slider.perPage);
            }
        } else if (typeof MovingParameter == "string") {
            if (MovingParameter === "head") {
                this.slider.goTo(0);
            } else if (MovingParameter === "foot") {
                this.slider.goTo(this.slider.getLength());
            }
        }
        this.interface.toggle(false);
    }

    // Pointer

    evalPointer(event, active) {
        if (!active)
            return;
        let ev = this.coordinator.getBibiEvent(event);
        if (this.slider.config.ttb) { // Vertical controls
            switch (ev.Division.Y) {
            case "bottom":
                this.moveBy(1);
                break;
            case "top":
                this.moveBy(-1);
                break;
            case "middle":
                this.interface.toggle();
                break;
            }
        } else { // Horizontal controls
            const next = this.slider.config.rtl ? "left" : "right";
            const prev = this.slider.config.rtl ? "right" : "left";
            switch (ev.Division.X) {
            case next:
                this.moveBy(1);
                break;
            case prev:
                this.moveBy(-1);
                break;
            case "center":
                this.interface.toggle();
                break;
            }
        }
    }

    ontap(Eve) {}

    onpointerdown(Eve) {
        this.PointerIsDowned = true;
        this.evalPointer(Eve, false);
    }

    onpointerup(Eve) {
        this.PointerIsDowned = false;
        this.evalPointer(Eve, true);
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
            if(Math.abs(this.slider.selector.scrollTop - totalHeight) < (pages[index].clientHeight * 0.6)) {
                if(index != this.slider.currentSlide) {
                    this.slider.currentSlide = index;
                    this.interface.toggle(false);
                    m.redraw();
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
        } else if(!this.slider.config.ttb) { // Vertical scrolling for horizontal view
            CW.Distance = (Eve.deltaY < 0 ? -1 : 1);
            CW.Delta = Math.abs(Eve.deltaY);
        } else {
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