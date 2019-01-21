interface Window {
    [key:string]: any;
    xbreader: any;
    xbconfig: XBConfig;
}

interface MithrilEvent extends Event {
    redraw: boolean;
    special: boolean;
}

interface XBTab {
    title: string;
    href: string;
    icon: string;
}

interface XBBrand {
    name: string;
    logo: string;
    embedded: boolean;
}

interface XBChapter {
    no: Number;
    title: string;
    uuid: string;
    selected: Boolean;
}

interface XBVolume {
    no: Number;
    title: string;
    uuid: string;
    chapters: XBChapter[];
}

interface XBConfig {
    [key:string]: any;
    brand: XBBrand;
    tabs: Array<XBTab>;
    prefix: string;
    mount: HTMLElement;
    guideHidden: boolean;
    cdn: string | boolean;
    preview: boolean;
    loader(identifier: string): Object; // TODO Object -> WebPub
    onPublicationLoad(reader: any): void;
    onBeforeReady(reader: any): void;
    onReady(reader: any): void;
    onPageChange(pnum: number, direction: string, isSpread: boolean): void;
    onLastPage(series: any): boolean; // TODO Series type
    onToggleInterface(): void;
    onDRM(loader: any, mixedSrc: any): void;
}

declare const __NAME__: string;
declare const __VERSION__: string;
declare function __(langstring: string): string; // i18n

/// WebPub

