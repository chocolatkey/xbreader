import m from "mithril";
export default {
    view: (vnode) => {
        const brand = vnode.attrs;
        if(!brand.name || !brand.logo)
            return null;
        return m(`img[src=${vnode.attrs.logo}]`, {"title": vnode.attrs.name});
    }
};
