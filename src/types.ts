export type ContentType =
  | "slideshow"
  | "wall-of-text"
  | "green-screen"
  | "video-hook";

export type ContentStatus = "BUILDING" | "CREATED" | "FAILED";

export type PostStatus =
  | "BUILDING"
  | "CREATED"
  | "SCHEDULED"
  | "UPLOADING_TO_TIKTOK"
  | "IN_USER_INBOX"
  | "POSTED"
  | "FAILED"
  | "DELETED";

export type Platform = "tiktok" | "instagram" | "youtube" | "reddit";
export type GenderFilter = "man" | "woman" | null;

export interface BlitzSuggestion {
  contentType: ContentType;
  generatedText: string;
  aiExplanation: string;
  createdAt: number;
}

export interface BlitzResponse {
  contentId: string;
  suggestion: BlitzSuggestion;
  swipesRemaining: number;
}

export interface Preferences {
  slideshowWeight: number;
  wallOfTextWeight: number;
  greenScreenWeight: number;
  videoHookWeight: number;
  remixPercentage: number;
  ownMediaPercentage: number;
  mentionBusinessPercentage: number;
  genderFilter: GenderFilter;
  angleWeights: Record<string, number>;
}

export interface Angle {
  _id: string;
  title: string;
  description: string;
  targetAudience: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Connection {
  _id: string;
  platform: Platform;
  platformUserId: string;
  platformUsername: string;
  scopes: string[];
  tokenExpiry: number;
  createdAt: number;
  updatedAt: number;
}

export interface ContentItem {
  _id: string;
  type: ContentType;
  status: ContentStatus;
  files?: string[];
  thumbnailUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Pagination {
  cursor: string | null;
  hasMore: boolean;
}

export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}

export type ContentListResponse = ListResponse<ContentItem>;

export interface Post {
  _id: string;
  status: PostStatus;
  contentId?: string;
  platform?: Platform;
  scheduledAt?: number;
  postedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type PostListResponse = ListResponse<Post>;

export interface ScheduleContentBody {
  platform: Platform;
  utc_datetime: string;
  caption?: string;
  description?: string;
  connectionId?: string;
}

export interface ScheduleContentResponse {
  postId: string;
}

export interface CancelPostsResponse {
  cancelled: number;
}

export interface PostMetrics {
  _id: string;
  platform: Platform;
  status: PostStatus;
  views?: number;
  likes?: number;
  comments?: number;
  postUrl?: string;
  postedAt?: number;
  notFound?: boolean;
}

export interface AnalyticsPostsResponse {
  data: PostMetrics[];
}

export interface FastlaneError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data: T;
  error?: FastlaneError;
}

export class FastlaneApiError extends Error {
  constructor(
    message: string,
    public code = "unknown",
    public status = 0,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FastlaneApiError";
  }
}

export type AngleInput = Pick<Angle, "title" | "description" | "targetAudience">;
export type AngleUpdate = Partial<AngleInput & Pick<Angle, "isActive">>;

export type ContentParams = {
  limit?: number;
  cursor?: string;
  type?: ContentType;
  status?: ContentStatus;
};

export type PostParams = {
  limit?: number;
  cursor?: string;
  status?: PostStatus;
};

export const unwrapError = (
  data: unknown,
  fallbackMessage: string,
  fallbackStatus = 0
): FastlaneApiError => {
  const error = (data as ApiResponse<unknown> | undefined)?.error;

  return new FastlaneApiError(
    error?.message ?? fallbackMessage,
    error?.code ?? "request_failed",
    fallbackStatus,
    error?.details
  );
};