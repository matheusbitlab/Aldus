export type Privacy = "PUBLIC" | "FOLLOWERS" | "PRIVATE";
export interface CommunityIdentity { userId: string; username: string; displayName: string; avatar: string | null }
export interface ReadingGoal { year: number; books: number }
export interface LiteraryProfile extends CommunityIdentity {
  bio: string;
  favoriteGenres: string[];
  favoriteAuthors: string[];
  favoriteBooks: string[];
  readingGoal: ReadingGoal | null;
  privacy: Privacy;
  activityPrivacy: Privacy;
  createdAt: number;
  updatedAt: number;
}
export type ReadingStatus = "unread" | "reading" | "completed" | "interrupted" | "abandoned";
/** null means unavailable, never an estimated zero. Dates are actual events, not last-opened dates. */
export interface CommunityBook {
  id: string; title: string; author: string; status: ReadingStatus;
  progress: number | null; genres: string[] | null;
  startedAt: number | null; completedAt: number | null;
  pagesRead: number | null; readingSeconds: number | null;
}
export interface ReadingSnapshot {
  scope: "device" | "account";
  userId: string | null;
  books: CommunityBook[];
  history: ReadingEvent[];
  /** A complete session-day history is required to calculate a streak. */
  readingDays: string[] | null;
}
export interface ReadingStats {
  total: number; started: number; completed: number; abandoned: number;
  interrupted: number; reading: number; unread: number;
  pagesRead: number | null; readingSeconds: number | null; streak: number | null;
  booksByMonth: Record<string, number> | null;
  booksByYear: Record<string, number> | null;
  mostReadGenres: Array<{ genre: string; books: number }> | null;
}
export type ReadingEventType = "BOOK_STARTED" | "BOOK_COMPLETED" | "READING_STREAK";
export interface ReadingEvent {
  id: string; userId: string; type: ReadingEventType;
  bookId: string | null; bookTitle: string | null;
  /** Only a trusted future source may supply a rereading completion identity. */
  completionId: string | null;
  streakDay: string | null;
  occurredAt: number | null;
}
export type ActivityType = "started_book" | "finished_book" | "reading_streak" | "rated_book" |
  "updated_progress" | "achievement_unlocked" | "level_reached" | "joined_club" | "created_discussion";
export interface ReadingActivity {
  id: string; userId: string; type: ActivityType; bookId: string | null;
  bookTitle: string | null; label: string | null;
  occurredAt: number | null; recordedAt: number; privacy: Privacy;
}
export interface LiteraryLevel { rank: number; name: string; threshold: number; nextThreshold: number | null }
export interface Achievement { id: string; name: string; description: string; unlockedAt: number | null }
export interface Progression { points: number; level: LiteraryLevel; fraction: number }
export interface Follow { followerId: string; followingId: string; createdAt: number }
export interface ClubReading { bookId: string; startDate: string | null; endDate: string | null; discussionId: string | null }
export interface BookClub {
  id: string; name: string; description: string; genre: string | null; cover: string | null;
  ownerId: string; memberCount: number | null; privacy: Privacy;
  currentBook: string | null; currentReading: ClubReading | null; createdAt: number;
}
export type SpoilerScope = { type: "chapter"; chapter: string } | { type: "percentage"; percentage: number } | { type: "book" };
export interface DiscussionThread {
  id: string; authorId: string; title: string;
  subject: "work" | "theory" | "character" | "chapter" | "theme" | "genre" | "club";
  subjectId: string | null; clubId: string | null; privacy: Privacy;
  containsSpoilers: boolean; spoilerScope: SpoilerScope | null; createdAt: number;
}
export interface CommunityPost { id: string; threadId: string; authorId: string; body: string; containsSpoilers: boolean; spoilerScope: SpoilerScope | null; createdAt: number }
export interface Comment extends CommunityPost { postId: string }
export interface CommunityState {
  version: 1; userId: string; revision: number; profile: LiteraryProfile | null;
  includeDeviceLibrary: boolean;
  /** Award keys are retained even if books disappear. */
  awards: Array<{ key: string; points: number }>;
  activities: ReadingActivity[];
}
