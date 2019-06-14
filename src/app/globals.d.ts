interface Window {
    [key: string]: any;
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
    no: number;
    title: string;
    uuid: string;
    selected: boolean;
}

interface XBVolume {
    no: number;
    title: string;
    uuid: string;
    chapters: XBChapter[];
}

interface XBOption {
    label: string;
    description?: string;
    value: string;
}

interface XBSetting {
    title: string;
    description?: string;
    name: string;
    value: string;
    options: XBOption[];
}

interface XBConfig {
    [key: string]: any;
    brand: XBBrand;
    tabs: XBTab[];
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

