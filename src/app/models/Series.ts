import m, { Vnode, Child } from "mithril";
import Publication from "./Publication";
import { Contributor } from "@r2-shared-js/models/metadata-contributor";

export default class Series {
    publication: Publication;
    metadata: Contributor[];
    chapters: XBChapter[];
    autoSelect: string;
    volumes: XBVolume[]; // TODO type

    constructor(publication: Publication, series: XBVolume[]) {
        this.publication = publication;
        const pvols = publication.findSpecial("volumes");
        this.volumes = series ? series : (pvols ? pvols.Value : []);
        this.autoSelect = null;
        this.metadata = (publication.pmetadata.BelongsTo && publication.pmetadata.BelongsTo.Series) ? publication.pmetadata.BelongsTo.Series : [];
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

    isSelected(chapter: XBChapter) {
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
        const chapters: XBChapter[] = [];
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
        if(!this.chapters) return null;
        for (let i = 0; i < this.chapters.length; i++)
            if(this.isSelected(this.chapters[i]))
                return this.chapters[i + 1] ? this.chapters[i + 1] : null;
    }

    /**
     * Get the UUID of the previous chapter in the series relative to the current item
     */
    get prev() {
        if(!this.chapters) return null;
        for (let i = 0; i < this.chapters.length; i++)
            if(this.isSelected(this.chapters[i]))
                return this.chapters[i - 1] ? this.chapters[i - 1] : null;
    }

    /**
     * Create an HTML select element with the series' volumes and chapters
     */
    get selector() {
        if(!this.exists)
            if(this.publication.pmetadata.Title)
                return m("span#br-chapter", <Child>this.publication.pmetadata.Title);
            else
                return null;

        return m("select#br-chapter", {
            title: __("Chapter selection"),
            onchange: (e: Event) => {
                const st = <HTMLSelectElement>e.target;
                m.route.set("/:id", { id: (<HTMLOptionElement>st[st.selectedIndex]).value, }, { replace: false });
            }
        }, this.volumes.map(volume => {
            const chaptersOptions: Vnode<any, any>[] = [];
            volume.chapters.forEach(chapter => {
                chaptersOptions.push(m("option", {
                    value: chapter.uuid,
                    selected: this.isSelected(chapter)
                }, <Child>chapter.title));
            });
            if(volume.title)
                return m("optgroup", {
                    label: volume.title
                }, chaptersOptions);
            else
                return chaptersOptions;
            
        }));
    }
}