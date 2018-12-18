/**
    Inspired by Siema (https://github.com/pawelgrzybek/siema)
 */
import m from "mithril";

export default class Spine {
    constructor(vnode) {
        this.slider = vnode.attrs.model;
    }

    view(vnode) {
        const slider = vnode.attrs.slider;
        const binder = vnode.attrs.binder;
        if(!slider)
            return null;
        return m("div#br-slider", {
            style: slider.properties,
            ontouchstart: binder ? binder.touchstartHandler : null,
            ontouchend: binder ? binder.touchendHandler : null,
            onmouseup: binder ? binder.mouseupHandler : null,
            onmousedown: binder ? binder.mousedownHandler : null
        }, vnode.children.map((page) => {
            return m("div", {
                style: slider.ttb ? {
                    display: "contents"
                } : {
                    cssFloat: slider.rtl ? "right" : "left",
                    float: slider.rtl ? "right" : "left",
                    width: `${100 / slider.length * (page.attrs.data.properties.orientation === "landscape" || page.attrs.data.xbr.addBlank ? slider.perPage : 1)}%`
                },
                key: "container@" + page.attrs.key
            }, page);
        }));
    }
}