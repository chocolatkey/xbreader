import m from "mithril";

export interface DialogData {
    src: string;
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
}

export default class Ui {
    private readonly toggleCallback: Function;
    isHidden = false;
    menuShown = false;
    settingsShown = false;
    dialogShown = false;
    dialogData = {
        src: "about:blank",
        minWidth: 350,
        minHeight: 350,
        maxWidth: 0,
        maxHeight: 0
    } as DialogData;
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

    toggleDialog(newState?: boolean, data?: DialogData) {
        this.dialogShown = newState;
        if(data) this.dialogData = data;
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
            this.toggleDialog(false);
            this.toggleMenu(false);
        }
        if(this.toggleCallback)
            this.toggleCallback(!this.isHidden);
        return true;
    }
}