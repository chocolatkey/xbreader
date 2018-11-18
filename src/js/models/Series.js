import m from "mithril";

export default class Series {
    constructor(publication, series) {
        this.publication = publication;
        this.volumes = series ? series : (publication.pmetadata.xbr.volumes ? publication.pmetadata.xbr.volumes : []);
        this.autoSelect = null;

        this.chapters = this.buildChapterList();

    }

    setRelations() {
        if(this.exists)
            this.publication.setSpecial("series", {
                current: this.current,
                next: this.next,
                prev: this.prev
            });
    }

    isSelected(chapter) {
        return chapter.selected || chapter.uuid === this.autoSelect;
    }

    /**
     * Has a series been passed to XBReader
     */
    get exists() {
        return this.volumes.length > 0;
    }

    buildChapterList() {
        if(!this.exists)
            return;
        const chapters = [];
        let alreadySelected = false;
        this.volumes.forEach(volume => {
            volume.chapters.forEach(chapter => {
                if(chapter.selected)
                    if(alreadySelected)
                        console.warn("More than one 'selected' item in series!");
                    else
                        alreadySelected = true;
                chapters.push(chapter);
            });
        });
        return chapters;
    }

    /**
     * Get the current chapter's UUID
     */
    get current() {
        for (let i = 0; i < this.chapters.length; i++) {
            const currChapter = this.chapters[i];
            if(this.isSelected(currChapter))
                return currChapter;
            if(!this.autoSelect && currChapter.uuid === this.publication.uuid) {
                this.autoSelect = currChapter.uuid;
                return currChapter;
            }
        }
        console.error("Couldn't find the current chapter in the series! Make sure one is selected");
        return null;
    }

    /**
     * Get the UUID of the next chapter in the series relative to the current item
     */
    get next() {
        for (let i = 0; i < this.chapters.length; i++)
            if(this.isSelected(this.chapters[i]))
                return this.chapters[i + 1] ? this.chapters[i + 1] : null;
    }

    /**
     * Get the UUID of the previous chapter in the series relative to the current item
     */
    get prev() {
        for (let i = 0; i < this.chapters.length; i++)
            if(this.isSelected(this.chapters[i]))
                return this.chapters[i - 1] ? this.chapters[i - 1] : null;
    }

    /**
     * Create an HTML select element with the series' volumes and chapters
     */
    get selector() {
        if(!this.exists)
            if(this.publication.pmetadata.title)
                return m("span#br-chapter", this.publication.pmetadata.title);
            else
                return null;

        return m("select#br-chapter", {
            title: __("Chapter selection"),
            onchange: (e) => {
                const st = e.target;
                m.route.set("/:id", { id: st[st.selectedIndex].value, }, { replace: false });
            }
        }, this.volumes.map(volume => {
            const chapters = [];
            volume.chapters.forEach(chapter => {
                chapters.push(m("option", {
                    value: chapter.uuid,
                    selected: this.isSelected(chapter)
                }, chapter.title));
            });
            if(volume.title)
                return m("optgroup", {
                    label: volume.title
                }, chapters);
            else
                return chapters;
            
        }));
    }
}