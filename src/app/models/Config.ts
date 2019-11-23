import { t } from "ttag";
import Reader, { XBReadingDirection } from "../components/Reader";
import Series from "./Series";
import Link from "xbreader/models/Link";
import Publication from "./Publication";

const STORAGE_KEY = "xbconfig";
const BACKGROUND_GREY = "#404040";
const DEFAULT_SETTINGS: XBSetting[] = [
    {
        title: t`↔ Layout`,
        description: t`Override the reading format of spreads in horizontal reading`,
        name: "spread",
        value: "spread",
        options: [
            {
                label: t`Spread`,
                description: t`When appropriate, show two pages at a time like a book`,
                value: "spread"
            },
            {
                label: t`Single Page`,
                description: t`Only show one page at a time`,
                value: "single"
            }
        ]
    },
    {
        title: t`↕ Page Fit`,
        description: t`Override the fit of pages in vertical or single page reading`,
        name: "vfit",
        value: "width",
        options: [
            {
                label: t`Fit Width`,
                description: t`Fit page to width of screen, but don't go overboard`,
                value: "width"
            },
            {
                label: t`Fit Height`,
                description: t`Fit page to height of screen`,
                value: "height"
            }
        ]
    },
    {
        title: t`Animations`,
        name: "animations",
        value: "on",
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
        title: t`Background`,
        name: "background",
        value: "#404040",
        options: [
            {
                label: t`Gray`,
                value: "#404040"
            },
            {
                label: t`Black`,
                value: "#000"
            },
            {
                label: t`White`,
                value: "#fff"
            }
        ]
    }/*,
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

export default class Config {

    private readonly internalState: XBConfig;
    settings: XBSetting[];

    private internalAnimateSettingIndex: number = -2;
    private internalBackgroundSettingIndex: number = -2;
    private internalBackgroundValue: string = BACKGROUND_GREY;

    constructor(custom: XBConfig) {
        this.internalState = Config.makeConfig(custom);
        this.initializeSettings();
    }

    private initializeSettings() {
        this.settings = DEFAULT_SETTINGS;
        if(this.state.additionalSettings.length > 0)
            this.settings.concat(this.state.additionalSettings);
        const savedSettings = this.loadSettings();
        if(savedSettings)
            for (const key in savedSettings) {
                const relatedSetting = this.settings.find(s => s.name === key);
                if(!relatedSetting) continue;
                relatedSetting.value = savedSettings[key];
            }
        else 
            this.settings = DEFAULT_SETTINGS;
    }

    private loadSettings(): Record<string, string> {
        if(typeof this.state.onSettingsLoad === "function")
            return this.state.onSettingsLoad(__VERSION__);
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

    public saveSettings(): boolean {
        try {
            const exportedSettings: Record<string, string> = {};
            this.settings.forEach(setting => exportedSettings[setting.name] = setting.value);
            if(typeof this.state.onSettingsSave === "function")
                this.state.onSettingsSave(exportedSettings);
            else {
                window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exportedSettings));
                window.localStorage.setItem(STORAGE_KEY + ".version", __VERSION__);
            }
        } catch (error) {
            console.warn("Failed saving settings:", error);
            return false;
        }
        return true;
    }

    /**
     * Get the config value for enabling animations for reader elements
     * Setting index is cached, OK for vdom calculations
     */
    get animate() {
        if(!this.settings) return true;
        if(this.internalAnimateSettingIndex === -2) this.internalAnimateSettingIndex = this.settings.findIndex(s => s.name === "animations");
        if(this.internalAnimateSettingIndex === -1) return true;
        return this.settings[this.internalAnimateSettingIndex].value === "off" ? false : true;
    }

    private get backgroundValue() {
        if(!this.settings) return BACKGROUND_GREY;
        if(this.internalBackgroundSettingIndex === -2) this.internalBackgroundSettingIndex = this.settings.findIndex(s => s.name === "background");
        if(this.internalBackgroundSettingIndex === -1) return BACKGROUND_GREY;
        const v = this.settings[this.internalBackgroundSettingIndex].value;
        if(v) return v;
        return BACKGROUND_GREY;
    }


    /**
     * Get the current setting for the background color of the reader (and set it for the document)
     * Setting index and value are cached, OK for vdom calculations
     */
    get background() {
        const v = this.backgroundValue;
        if(v !== this.internalBackgroundValue) {
            this.internalBackgroundValue = v;
            document.documentElement.style.background = v;
        }
        return v;
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
     * Get the prefered page fitting setting for vertical reading
     * Setting index NOT cached, don't use in vdom calculation
     */
    get fit() {
        if(!this.settings) return false;
        const setting = this.settings.find(s => s.name === "vfit");
        if(setting === undefined) return false;
        switch (setting.value) {
            case "height":
                return true;
            default: // Includes "width"
                return false;
        }
    }

    /**
     * Get the preferred spread view option for horizontal reading
     * Setting index NOT cached, don't use in vdom calculation
     */
    get spread() { // TODO implement 3-way!!!
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

    get state() {
        return this.internalState;
    }

    static makeConfig(config: XBConfig) {
        return Object.assign({
            prefix: null,
            mount: document.body,
            preview: false,
            brand: {
                name: null,
                logo: null,
                embedded: false // Whether to show interface meant for embedding in apps
            },
            tabs: [{ // Tabs on right side of top bar
                title: "Settings",
                href: "javascript:window.postMessage('xbr:settings')",
                icon: "cog"
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
            onLastPage: (series: Series) => true, // When trying to go further after the last page. If returns true, auto-advance
            onToggleInterface: () => {}, // When interface is shown/hidden
            onLoad: (data: Link) => data.Href,
            onDraw: null, // (loader: any, source: any) => {} When images are protected, this function provides DRM and/or custom drawing capabilities

            // Settings provider - only need to implement for global settings
            // Could be localstorage, cookie, a server backend, whatever. Up to the developer. If not specified, is localstorage object
            onSettingsSave: null, // Save settings object
            onSettingsLoad: null // Load settings object
        }, config);
    }
}