import { t } from "ttag";
import m, { Vnode, Child, Children } from "mithril";
import Publication from "./Publication";
import { Contributor } from "@r2-shared-js/models/metadata-contributor";

export default class Series {
    private readonly publication: Publication;
    private readonly metadata: Contributor[];
    private readonly chapters: XBChapter[] | null;
    private readonly volumes: XBVolume[] | null;
    private autoSelect: string = null;

    constructor(publication: Publication, series: XBVolume[]) {
        if(!publication) return;
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
        return this.volumes?.length > 0 || this.firstSeries !== null;
    }

    get isSolo() {
        return this.chapters?.length === 0 || !this.exists;
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
    get current(): XBChapter {
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

    set current(newChapter: XBChapter) {
        this.autoSelect = null;
        this.chapters?.forEach(chapter => {
            if(chapter.selected)
                chapter.selected = false;
            if(chapter.uuid === newChapter.uuid)
                chapter.selected = true;
        });
        this.volumes?.forEach(volume => {
            volume.chapters?.forEach(chapter => {
                if(chapter.selected)
                    chapter.selected = false;
                if(chapter.uuid === newChapter.uuid)
                    chapter.selected = true;
            });
        });
        this.setRelations();
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
    get selector(): Children {
        if(this.isSolo)
            if(this.publication.pmetadata.Title)
                return m("span.br-toolbar__ellipsis#br-chapter", {
                    title: this.publication.pmetadata.SubTitle ? this.publication.pmetadata.SubTitle : t`Chapter`
                }, this.publication.pmetadata.Title as Child);
            else
                return null;

        let selectedVolumeName = null;
        const select = m("select#br-chapter", {
            title: t`Chapter selection`, // TODO somehow incorporate the subtitle
            onchange: (e: Event) => {
                const st = e.target as HTMLSelectElement;
                const sv = decodeURI((st[st.selectedIndex] as HTMLOptionElement).value);
                if(sv === this.current?.uuid) return;
                m.route.set("/:id...", { id: sv }, { replace: false });
                this.current = this.chapters.find(c => c.uuid === sv);
            }
        }, this.volumes.map(volume => {
            const chaptersOptions: Vnode[] = [];
            volume.chapters.forEach(chapter => {
                const isSel = this.isSelected(chapter);
                if(isSel && volume.title && volume.title.trim()) selectedVolumeName = m("span#br-chapter__volume", {
                    // onhover: () => console.log("hover") // TODO?
                }, volume.title);
                chaptersOptions.push(m("option", {
                    value: chapter.uuid,
                    selected: isSel
                }, chapter.title));
            });
            if(volume.title)
                return m("optgroup", {
                    label: volume.title
                }, chaptersOptions);
            else
                return chaptersOptions;
            
        }));
        return m("span#br-chapter__group", [
            selectedVolumeName ? [
                selectedVolumeName,
                m("span.spacer", "›")
            ] : null,
            select
        ]);
    }
}