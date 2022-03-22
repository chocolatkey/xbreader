/* eslint-disable @typescript-eslint/no-empty-function */
import { t } from "ttag";
import Reader from "xbreader/components/Reader";
import { canDrawBitmap } from "xbreader/helpers/platform";
import LazyLoader, { drawerFunction } from "xbreader/helpers/lazyLoader";
import Series from "./Series";
import Link from "./Link";

export enum XBOptionType {
    Hidden,
    Radio,
    Dropdown,
    Spinner,
    SpinnerPercentage
}

export enum XBOptionTypeSpinnerOptions {
    MIN,
    MAX,
    STEP
}

const DEFAULT_LINE_HEIGHT = 1.3;
const DEFAULT_FONT_SIZE = 1.0;
const DEFAULT_TEXT_ALIGN = "start";
const FALLBACK_FONT_FAMILY = "Roboto, sans-serif";

const STORAGE_KEY = "xbconfig";
const BACKGROUND_GREY = "#303030";
const DEFAULT_SETTINGS: XBSetting[] = [
    {
        title: t`Theme`,
        name: "background",
        value: "#303030",
        reflowable: false,
        type: XBOptionType.Radio,
        options: [
            {
                label: t`White`,
                value: "#fff"
            },
            {
                label: t`Sepia`,
                value: "#faf4e8"
            },
            {
                label: t`Gray`,
                value: "#303030"
            },
            {
                label: t`Black`,
                value: "#000"
            }
        ]
    },
    {
        title: t`Animations`,
        name: "animations",
        value: "on",
        reflowable: false,
        type: XBOptionType.Radio,
        options: [
            {
                label: t`On`,
                value: "on"
            },
            {
                label: t`Off`,
                value: "off"
            }
        ]
    },
    {
        title: t`Font`,
        name: "font",
        value: "Crimson Text",
        reflowable: true,
        type: XBOptionType.Dropdown,
        options: [
            {
                label: "Crimson Text",
                value: "\"Crimson Text\", serif"
            },
            {
                label: "Literata",
                value: "Literata, serif"
            },
            {
                label: "Vollkorn",
                value: "Vollkorn, serif"
            },
            {
                label: "Roboto",
                value: FALLBACK_FONT_FAMILY
            },
            {
                label: "Lato",
                value: "Lato, sans-serif"
            },
            {
                label: "Arbutus Slab",
                value: "\"Arbutus Slab\", serif"
            },
            {
                label: "Noto Sans",
                value: "\"Noto Sans\", \"Noto Sans JP\", sans-serif"
            },
            {
                label: "Andika",
                value: "Andika, sans-serif"
            }
        ]
    },
    {
        title: t`Font Size`,
        name: "size",
        value: 1.1,
        reflowable: true,
        type: XBOptionType.SpinnerPercentage,
        options: [
            {
                label: XBOptionTypeSpinnerOptions.MIN,
                value: 0.4
            },
            {
                label: XBOptionTypeSpinnerOptions.MAX,
                value: 5.0
            },
            {
                label: XBOptionTypeSpinnerOptions.STEP,
                value: 0.1
            }
        ]
    },
    {
        title: t`Line Spacing`,
        name: "spacing",
        reflowable: true,
        value: DEFAULT_LINE_HEIGHT,
        type: XBOptionType.Spinner,
        options: [
            {
                label: XBOptionTypeSpinnerOptions.MIN,
                value: 0.8
            },
            {
                label: XBOptionTypeSpinnerOptions.MAX,
                value: 4.0
            },
            {
                label: XBOptionTypeSpinnerOptions.STEP,
                value: 0.1
            }
        ]
    },
    {
        title: t`Alignment`,
        name: "alignment",
        reflowable: true,
        value: DEFAULT_TEXT_ALIGN,
        type: XBOptionType.Radio,
        options: [
            {
                label: t`Start`,
                value: "start"
            },
            {
                label: t`Justify`,
                value: "justify"
            }
        ]
    },
    {
        title: t`Spread`,
        name: "spread",
        reflowable: false,
        value: "spread",
        type: XBOptionType.Hidden,
        options: [
            {
                label: t`Spread`,
                value: "spread"
            },
            {
                label: t`Single`,
                value: "single"
            }
        ]
    },
    {
        title: t`Fit`,
        name: "fit",
        reflowable: false,
        value: "wide",
        type: XBOptionType.Hidden,
        options: [
            {
                label: t`Wide`,
                value: "wide"
            },
            {
                label: t`Thin`,
                value: "thin"
            }
        ]
    }
    /*,
    {
        title: "Direction",
        description: "Override the reading direction with one you prefer (vertical content will always be vertical)",
        name: "direction",
        value: "auto",
        options: [
            {
                label: "Auto",
                description: "As set by the publisher",
                value: "auto"
            },
            {
                label: "Horizontal",
                description: "Typically used for comics/manga",
                value: "horizontal"
            },
            {
                label: "Vertical",
                description: "Typically used for webtoons",
                value: "vertical"
            }
        ]
    }*/
];

export interface RenderConfig {
    bitmap: boolean;
    onDraw: drawerFunction;
    lok: boolean;
}

const BG_TO_FG = new Map<string, string>([
    ["#fff", "#000"],
    ["#faf4e8", "#000"],
    ["#303030", "#fff"],
    ["#000", "#fff"]
]);

export default class Config {

    private readonly internalState: XBConfig;
    settings: XBSetting[];

    private internalAnimateSettingIndex = -2;
    private internalBackgroundSettingIndex = -2;

    constructor(custom: XBConfig) {
        this.internalState = Config.makeConfig(custom);
        this.initializeSettings();
    }

    private initializeSettings() {
        this.resetSettings();
        const savedSettings = this.loadSettings();
        if(savedSettings)
            for (const key in savedSettings) {
                const relatedSetting = this.settings.find(s => s.name === key);
                if(!relatedSetting) continue;
                relatedSetting.value = savedSettings[key];
            }
    }

    private loadSettings(): Record<string, string> {
        if(typeof this.state.onSettingsLoad === "function")
            if(!this.state.onSettingsLoad(__VERSION__)) return;
        try {
            const v = window.localStorage.getItem(STORAGE_KEY);
            if(!v) return null;
            try {
                return JSON.parse(v) as Record<string, string>;
            } catch (error) {
                console.error("Failed parsing settings:", error);
            }
        } catch (error) {
            console.warn("Failed loading settings:", error);
        }
        return null;
    }

    public setSetting(key: string, value: string | number): void {
        this.settings.find(s => s.name === key).value = value;
    }

    public saveSettings(): boolean {
        try {
            const exportedSettings: Record<string, string | number> = {};
            this.settings.forEach(setting => exportedSettings[setting.name] = setting.value);
            let storeLocal = true;
            if(typeof this.state.onSettingsSave === "function")
                storeLocal = this.state.onSettingsSave(exportedSettings);
            if(storeLocal) {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exportedSettings));
                window.localStorage.setItem(STORAGE_KEY + ".version", __VERSION__);
            }
        } catch (error) {
            console.warn("Failed saving settings:", error);
            return false;
        }
        return true;
    }

    public resetSettings(): void {
        this.settings = DEFAULT_SETTINGS.map(a => ({...a}));
        if(this.state.additionalSettings.length > 0)
            this.settings.concat(this.state.additionalSettings);
    }

    /**
     * Get the config value for enabling animations for reader elements
     * Setting index is cached, OK for vdom calculations
     */
    get animate(): boolean {
        if(!this.settings) return true;
        if(this.internalAnimateSettingIndex === -2) this.internalAnimateSettingIndex = this.settings.findIndex(s => s.name === "animations");
        if(this.internalAnimateSettingIndex === -1) return true;
        return this.settings[this.internalAnimateSettingIndex].value === "off" ? false : true;
    }

    /**
     * Get the current setting for the background color of the reader
     * Setting index and value are cached, OK for vdom calculations
     */
    get background(): string {
        if(!this.settings) return BACKGROUND_GREY;
        if(this.internalBackgroundSettingIndex === -2) this.internalBackgroundSettingIndex = this.settings.findIndex(s => s.name === "background");
        if(this.internalBackgroundSettingIndex === -1) return BACKGROUND_GREY;
        const v = this.settings[this.internalBackgroundSettingIndex].value;
        if(v) return v as string;
        return BACKGROUND_GREY;
    }

    get foreground(): string {
        const fg = BG_TO_FG.get(this.background);
        if(fg === "") return "#fff";
        return fg;
    }

    /*overrideDirection(direction: XBReadingDirection): XBReadingDirection {
        if(!this.settings) return direction;
        const setting = this.settings.find(s => s.name === "direction");
        if(setting === undefined) return direction;
        
        switch (setting.value) {
            case "horizontal":
                return direction;
            case "vertical":
                return XBReadingDirection.TTB;
            default: // Includes "auto"
                return direction;
        }
    }*/

    /**
     * Get the prefered page fitting setting for vertical reading or reflowable single page reading
     * Setting index NOT cached, don't use in vdom calculation
     */
    get fit(): boolean {
        if(!this.settings) return false;
        const setting = this.settings.find(s => s.name === "fit");
        if(setting === undefined) return false;
        switch (setting.value) {
            case "thin":
                return true;
            default: // Includes "wide"
                return false;
        }
    }

    /**
     * Get the preferred spread view option for horizontal reading
     * Setting index NOT cached, don't use in vdom calculation
     */
    get spread(): boolean {
        if(!this.settings) return true;
        const setting = this.settings.find(s => s.name === "spread");
        if(setting === undefined) return true;
        switch (setting.value) {
            case "single":
                return false;
            default: // Includes "spread"
                return true;
        }
    }

    /// Reflowable Settings ///

    /**
     * Get the preferred CSS font size fraction (1.0 == 100%)
     */
    get size(): number {
        if(!this.settings) return DEFAULT_FONT_SIZE;
        const setting = this.settings.find(s => s.name === "size");
        if(setting === undefined) return DEFAULT_FONT_SIZE;
        const s = parseFloat(setting.value as string);
        return s ? s : DEFAULT_FONT_SIZE;
    }

    get height(): number {
        if(!this.settings) return DEFAULT_LINE_HEIGHT;
        const setting = this.settings.find(s => s.name === "spacing");
        if(setting === undefined) return DEFAULT_LINE_HEIGHT;
        const s = parseFloat(setting.value as string);
        return s ? s : DEFAULT_LINE_HEIGHT;
    }

    get align(): string {
        if(!this.settings) return DEFAULT_TEXT_ALIGN;
        const setting = this.settings.find(s => s.name === "alignment");
        if(setting === undefined) return DEFAULT_TEXT_ALIGN;
        return (setting.value as string) ?? DEFAULT_TEXT_ALIGN;
    }

    get font(): string {
        if(!this.settings) return FALLBACK_FONT_FAMILY;
        const setting = this.settings.find(s => s.name === "font");
        if(setting === undefined) return FALLBACK_FONT_FAMILY;
        return (setting.value as string) ?? FALLBACK_FONT_FAMILY;
    }

    /// End of Reflowable Settings ///

    get state(): XBConfig {
        return this.internalState;
    }

    static makeConfig(config: XBConfig) {
        return Object.assign({
            prefix: null,
            mount: document.body,
            // preview: false,
            brand: {
                name: null,
                logo: null,
                titled: true,
                embedded: false // Whether to show interface meant for embedding in apps
            },
            tabs: [{ // Tabs on the top bar
                title: "Settings",
                href: "javascript:window.postMessage('xbr:settings', '*')",
                icon: "cog",
                prefix: true
            }],
            additionalSettings: [],
            guideHidden: false, // Skip showing the reading direction guide
            //transitions: true, // Animate page transitions. Can introduce lag at large page sizes
            link: null, // WebPub URL to pass directly and load
            series: null, // Volume/Chapter data

            // Callback/Hooks
            loader: (identifier: string) => { return null; }, // Custom loader for the webpub. Can return a URL, WebPub Object or Promise
            onMount: (reader: Reader) => {}, // As soon as this component is mounted
            onPublicationLoad: (reader: Reader) => {}, // Right after the publication is fully loaded
            onBeforeReady: (reader: Reader) => {}, // Right before final preparations are carried out
            onReady: (reader: Reader) => {}, // When redrawing has finished
            onPageChange: (pnum: number, direction: string, isSpread: boolean) => {}, // When page is changed
            onLastPage: (series: Series, pnum: number) => true, // When trying to go further after the last page. If returns true, auto-advance
            onToggleInterface: () => {}, // When interface is shown/hidden

            onSource: (link: Link) => false, // Link When you want to overrride the logic choosing the appropriate link object or inject/modify links
            onDrew: null,
            onError: null, // (TODO)
            render: {
                bitmap: canDrawBitmap,
                onDraw: null, // (loader: any, source: any) => {} When necessary, this function provides DRM and/or custom drawing capabilities
                lok: false
            } as RenderConfig,

            // Settings provider - only need to implement for global settings
            // Could be localstorage, cookie, a server backend, whatever. Up to the developer. If not specified, is localstorage object
            // If save/load returns true, settings are still saved in localstorage
            onSettingsSave: null, // Save settings object
            onSettingsLoad: null // Load settings object
        }, config);
    }
}