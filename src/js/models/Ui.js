export default class Ui {
    constructor(toggleCallback) {
        this.toggleCallback = toggleCallback;
        this.isHidden = false;
        this.menuShown = false;
        this.mousing = false;
    }

    toggleMenu(newState) {
        if (newState == null)
            this.menuShown = !this.menuShown;
        else if (this.menuShown != newState)
            this.menuShown = newState;
        else
            return;
    }

    toggle(newState) {
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