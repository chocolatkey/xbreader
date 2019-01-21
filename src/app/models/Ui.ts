export default class Ui {
    toggleCallback: Function;
    isHidden: boolean;
    menuShown: boolean;
    mousing: boolean;

    constructor(toggleCallback: Function) {
        this.toggleCallback = toggleCallback;
        this.isHidden = false;
        this.menuShown = false;
        this.mousing = false;
    }

    toggleMenu(newState?: boolean) {
        if (newState == null)
            this.menuShown = !this.menuShown;
        else if (this.menuShown != newState)
            this.menuShown = newState;
        else
            return;
    }

    toggle(newState?: boolean) {
        if (newState == null)
            this.isHidden = !this.isHidden;
        else if (!!this.isHidden == newState) {
            this.isHidden = !newState;
        } else {
            return false;
        }
        if(this.isHidden)
            this.toggleMenu(false);
        if(this.toggleCallback)
            this.toggleCallback(!this.isHidden);
        return true;
    }
}