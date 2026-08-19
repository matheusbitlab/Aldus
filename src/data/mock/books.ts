import { Book } from "@/src/domain/types/reader";

export const mockBook: Book = {
  id: "mock-book",
  title: "The Quiet Hour",
  author: "Mara Ellison",
  chapters: [
    { id: "chapter-1", title: "A Different Kind of Morning", characterCount: 8600, html: `<h1>A Different Kind of Morning</h1><p>There is a particular silence just before a city remembers itself. Mara noticed it first in the small hours, when the street lamps made islands of the pavement and every window kept its own private weather.</p><p>She opened the book beside the kettle and let the room become a place she could stay in. The page did not ask her to hurry. It only offered the next sentence.</p><h2>The room between things</h2><p>Outside, a bus sighed at the corner. Inside, the light gathered slowly across the table, touching the spine, the cup, and the loose thread of a bookmark.</p>` },
    { id: "chapter-2", title: "The Shape of Attention", characterCount: 9400, html: `<h1>The Shape of Attention</h1><p>Attention is not a spotlight so much as a door left open. It changes the room by deciding what may enter, and it gives ordinary things a chance to become precise.</p><p>By noon, Mara had read three pages and remembered an entire afternoon from ten years ago. This was the strange generosity of books: they made time feel less like a line and more like a landscape.</p>` },
    { id: "chapter-3", title: "A Small Weather", characterCount: 7200, html: `<h1>A Small Weather</h1><p>Rain began at dusk, soft enough to sound like someone turning pages in the next room. Mara marked her place and watched the glass gather its small, bright geography.</p><p>Tomorrow would have its own demands. For now, the chapter was enough.</p>` }
  ]
};
