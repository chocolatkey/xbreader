import m from "mithril";

export default class Ui {
    private readonly toggleCallback: Function;
    isHidden = false;
    menuShown = false;
    settingsShown = false;
    notifierShown = false;
    public notification: string;
    private notifierTimeout: number;
    mousing = false;

    constructor(toggleCallback: Function) {
        this.toggleCallback = toggleCallback;
    }

    notify(message: string) {
        this.notification = message;
        window.clearTimeout(this.notifierTimeout);
        this.notifierTimeout = window.setTimeout(() => {
            this.notifierShown = false;
            m.redraw();
        }, 1500);
        this.notifierShown = true;
    }

    toggleMenu(newState?: boolean) {
        if (newState === undefined)
            this.menuShown = !this.menuShown;
        else if (this.menuShown !== newState)
            this.menuShown = newState;
    }

    toggleSettings(newState?: boolean) {
        if (newState === undefined)
            this.settingsShown = !this.settingsShown;
        else if (this.settingsShown !== newState)
            this.settingsShown = newState;
        else
            return;

        if(this.settingsShown)
            this.toggleMenu(false);
    }

    toggle(newState?: boolean) {
        if (newState === undefined)
            this.isHidden = !this.isHidden;
        else if (!!this.isHidden === newState) {
            this.isHidden = !newState;
        } else {
            return false;
        }
        if(this.isHidden) {
            this.toggleSettings(false);
            this.toggleMenu(false);
        }
        if(this.toggleCallback)
            this.toggleCallback(!this.isHidden);
        return true;
    }
}