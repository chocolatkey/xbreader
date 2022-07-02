interface Window {
    [key: string]: any;
    xbreader: any;
    // xbconfig: XBConfig; DEPRECATED
}

interface MithrilEvent extends Event {
    redraw: boolean;
    special: boolean;
}

interface XBTab {
    title: string;
    href: string;
    icon: string;
    target?: string;
    prefix: boolean;
}

interface XBBrand {
    name: string;
    logo: string;
    titled: boolean;
    embedded: boolean;
    href: string;
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
    label: string | number;
    description?: string;
    value: string | number;
}

interface XBSetting {
    title: string;
    description?: string;
    reflowable: boolean; // TODO better way of separating the settings, maybe an array?
    name: string;
    value: string | number;
    type: number;
    options: XBOption[];
}

interface XBRenderConfig {
    bitmap: boolean;
    // eslint-disable-next-line @typescript-eslint/ban-types
    onDraw: Function;
    lok: boolean;
}

interface XBConfig {
    //[key: string]: any;
    settings: XBSetting[];
    brand: XBBrand;
    tabs: XBTab[];
    prefix: string;
    mount: HTMLElement;
    guideHidden: boolean;
    // preview: boolean;
    link: string;
    series: XBVolume[];
    loader(identifier: string): Record<string, unknown>; // TODO Object -> WebPub

    // Reader callbacks
    onMount(reader: any): void;
    onInit(reader: any): void;
    onPublicationLoad(reader: any): void;
    onBeforeReady(reader: any): void;
    onReady(reader: any): void;
    onPageChange(pnum: number, direction: string, isSpread: boolean): void;
    onLastPage(series: any, pnum: number): boolean; // TODO Series type
    onToggleInterface(): void;

    // Page callbacks
    onSource(link: unknown): unknown;
    onError(link: unknown): unknown; // TODO add reader or something
    render: XBRenderConfig;

    // Settings
    additionalSettings: XBSetting[];
    onSettingsSave(settings: Record<string, string | number>): boolean;
    onSettingsLoad(version: string): Record<string, string>;
}

declare const __NAME__: string;
declare const __VERSION__: string;

/// WebPub

