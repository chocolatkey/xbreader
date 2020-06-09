import { t } from "ttag";
import m, { Vnode, Child } from "mithril";
import Publication from "./Publication";
import { Contributor } from "@r2-shared-js/models/metadata-contributor";

export default class Series {
    private readonly publication: Publication;
    private readonly metadata: Contributor[];
    private readonly chapters: XBChapter[];
    private autoSelect: string = null;
    volumes: XBVolume[];

    constructor(publication: Publication, series: XBVolume[]) {
        this.publication = publication;
        const pvols = publication.findSpecial("volumes");
        this.volumes = series ? series : (pvols ? pvols.Value : []);
        this.metadata = publication.series ? publication.series : [];
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

    get firstSeries() {
        if(this.metadata.length > 0) return this.metadata[0];
        return null;
    }

    isSelected(chapter: XBChapter) {
        return chapter.selected || chapter.uuid === this.autoSelect;
    }

    /**
     * Has a series been passed to XBReader
     */
    get exists() {
        return this.volumes.length > 0 || this.firstSeries !== null;
    }

    get isSolo() {
        return this.chapters.length === 0 || !this.exists;
    }

    private buildChapterList() {
        if(!this.exists)
            return [];
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
        return null;
    }

    /**
     * Get the UUID of the previous chapter in the series relative to the current item
     */
    get prev() {
        if(!this.chapters) return null;
        for (let i = 0; i < this.chapters.length; i++)
            if(this.isSelected(this.chapters[i]))
                return this.chapters[i - 1] ? this.chapters[i - 1] : null;
        return null;
    }

    /**
     * Create an HTML select element with the series' volumes and chapters
     */
    get selector() {
        if(this.isSolo)
            if(this.publication.pmetadata.Title)
                return m("span.br-toolbar__ellipsis#br-chapter", {
                    title: this.publication.pmetadata.SubTitle ? this.publication.pmetadata.SubTitle : t`Chapter`
                }, this.publication.pmetadata.Title as Child);
            else
                return null;

        return m("select#br-chapter", {
            title: t`Chapter selection`, // TODO somehow incorporate the subtitle
            onchange: (e: Event) => {
                const st = e.target as HTMLSelectElement;
                m.route.set("/:id", { id: (st[st.selectedIndex] as HTMLOptionElement).value }, { replace: false });
            }
        }, this.volumes.map(volume => {
            const chaptersOptions: Vnode<any, any>[] = [];
            volume.chapters.forEach(chapter => {
                chaptersOptions.push(m("option", {
                    value: chapter.uuid,
                    selected: this.isSelected(chapter)
                }, chapter.title as Child));
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