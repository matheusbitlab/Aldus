import { StoredChapter } from "@/src/domain/entities/LibraryBook";
import { TextReadingAnchor } from "@/src/domain/types/readingAnchor";
import { Highlight } from "@/src/domain/repositories/HighlightRepository";

export interface ReaderStudyRequest { id: number; type: "studyCapture" | "studyNavigate" | "studySelection"; anchor?: TextReadingAnchor; enabled?: boolean }
export interface ReaderStudyResult { id: number; type: "study"; status: "captured" | "exact" | "relocated" | "ambiguous" | "missing" | "error" | "rendered" | "unsupported"; anchor?: TextReadingAnchor; pageNumber?: number; message?: string; missing?: number; ambiguous?: number }

export interface EpubPageInfo {
  pageNumber: number;
  totalPages: number;
  chapterIndex: number;
  chapterTitle: string;
  layoutReady?: boolean;
  chapterLocations?: Array<{ chapterIndex: number; pageNumber: number; title: string }>;
}

export interface EpubNavigationRequest {
  id: number;
  direction: -1 | 1;
}

export interface EpubPageViewerProps {
  chapters: StoredChapter[];
  pageNumber: number;
  initialRestorePending?: boolean;
  restoreTargetReady?: boolean;
  navigationRequest?: EpubNavigationRequest | null;
  fontSize: number;
  fontFamily: string;
  marginSize: number;
  lineHeight?: number;
  paragraphSpacing?: number;
  maxWidth?: number;
  alignment?: "left" | "justify";
  allowTextSelection?: boolean;
  searchTerm?: string;
  onSearchResult?: (found: boolean) => void;
  textColor: string;
  backgroundColor: string;
  onPageInfo: (info: EpubPageInfo) => void;
  studyRequest?: ReaderStudyRequest | null;
  onStudyResult?: (result: ReaderStudyResult) => void;
  studyHighlights?: Highlight[];
}
