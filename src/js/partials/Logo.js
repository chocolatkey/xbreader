import m from "mithril";
export default {
    view: (vnode) => {
        const brand = vnode.attrs;
        if(brand.embedded) {
            return m("button#br-embedded__back", {
                onclick: () => {
                    window.parent.postMessage("xbr:back", "*");
                },
                title: __("Back")
            }, [
                m("i", {
                    class: "br-i-arrow_back"
                })
            ]);
        }
        if(!brand.name || !brand.logo)
            return null;
        return m("a.logo[href=/]", [
            m(`img[src=${vnode.attrs.logo}]`, {"title": vnode.attrs.name})
        ]);
    }
};
