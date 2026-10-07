import { SearchPlugin, ScrapedLink } from "@/src/domain/types/search";
import { SearchBooksUseCase } from "@/src/domain/usecases/SearchBooksUseCase";
export class SearchCatalogsUseCase { constructor(private readonly createPlugins: () => Promise<SearchPlugin[]>, private readonly search: SearchBooksUseCase) {} async execute(query: string): Promise<ScrapedLink[]> { return this.search.execute(query); } }
