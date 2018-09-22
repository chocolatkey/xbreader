export default class Coordinator {
    constructor(peripherals) {
        this.p = peripherals;

        this.HTML  = document.documentElement;// O.HTML.className = sML.Environments.join(" ") + " bibi welcome";
        this.Head  = document.head;
        this.Body  = document.body;
    }

    getElementCoord(El) {
        var Coord = { X: El["offsetLeft"], Y: El["offsetTop"] };
        while(El.offsetParent) El = El.offsetParent, Coord.X += El["offsetLeft"], Coord.Y += El["offsetTop"];
        return Coord;
    }
    
    getBibiEventCoord(Eve) {
        var Coord = { X:0, Y:0 };
        if(/^touch/.test(Eve.type)) {
            Coord.X = Eve.changedTouches[0].pageX;
            Coord.Y = Eve.changedTouches[0].pageY;
        } else {
            Coord.X = Eve.pageX;
            Coord.Y = Eve.pageY;
        }
        if(Eve.target.ownerDocument.documentElement == this.HTML) {
            Coord.X -= this.HTML.scrollLeft;
            Coord.Y -= this.HTML.scrollTop;
        } else {
            /*
            var Item = Eve.target.ownerDocument.documentElement.Item;
            ItemCoord = this.getElementCoord(Item);
            if(!Item.PrePaginated && !Item.Outsourcing) ItemCoord.X += settings.S["item-padding-left"], ItemCoord.Y += settings.S["item-padding-top"];
            Coord.X = (Coord.X + ItemCoord.X - R.Main.scrollLeft) * R.Main.Transformation.Scale + R.Main.Transformation.Translation.X;
            Coord.Y = (Coord.Y + ItemCoord.Y - R.Main.scrollTop ) * R.Main.Transformation.Scale + R.Main.Transformation.Translation.Y;
            */
        }
        return Coord;
    }
    
    getBibiEvent(Eve) {
        if(!Eve) return {};
        var Coord = this.getBibiEventCoord(Eve);
        var FlipperWidth = 0.3; // TODO flipper-width
        var Ratio = {
            X: Coord.X / window.innerWidth,
            Y: Coord.Y / window.innerHeight
        };
        if(FlipperWidth < 1) { // Ratio
            var BorderL = BorderT =     FlipperWidth;
            var BorderR = BorderB = 1 - FlipperWidth;
        } else { // Pixel to Ratio
            var BorderL = FlipperWidth / window.innerWidth;
            var BorderT = FlipperWidth / window.innerHeight;
            var BorderR = 1 - BorderL;
            var BorderB = 1 - BorderT;
        }
        var Division = {
            X: "",
            Y: ""
        };
        if(Ratio.X < BorderL) Division.X = "left";
        else if(BorderR < Ratio.X) Division.X = "right";
        else                       Division.X = "center";
        if(Ratio.Y < BorderT) Division.Y = "top";
        else if(BorderB < Ratio.Y) Division.Y = "bottom";
        else                       Division.Y = "middle";
        return {
            Target: Eve.target,
            Coord: Coord,
            Ratio: Ratio,
            Division: Division
        };
    }
}