import m from "mithril";

export default class Series {
    constructor(publication, series) {
        this.publication = publication;
        this.volumes = series ? series : (publication.pmetadata.xbr.volumes ? publication.pmetadata.xbr.volumes : []);

        this.chapters = this.buildChapterList();

    }

    setRelations() {
        if(this.exists)
            this.publication.setSpecial("series", {
                next: this.next,
                prev: this.prev,
                current: this.current
            });
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
        this.volumes.forEach(volume => {
            volume.chapters.forEach(chapter => {
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
            if(currChapter.selected)
                return currChapter;
        }
        console.error("Couldn't find the current chapter in the series! Make sure one is selected");
        return null;
    }

    /**
     * Get the UUID of the next chapter in the series relative to the current item
     */
    get next() {
        for (let i = 0; i < this.chapters.length; i++)
            if(this.chapters[i].selected)
                return this.chapters[i + 1] ? this.chapters[i + 1] : null;
    }

    /**
     * Get the UUID of the previous chapter in the series relative to the current item
     */
    get prev() {
        for (let i = 0; i < this.chapters.length; i++)
            if(this.chapters[i].selected)
                return this.chapters[i - 1] ? this.chapters[i - 1] : null;
    }

    /**
     * Create an HTML select element with the series' volumes and chapters
     */
    get selector() {
        if(!this.exists)
            return this.publication.pmetadata ? this.publication.pmetadata.title : null;

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
                    selected: chapter.selected
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