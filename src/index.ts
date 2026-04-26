import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from "axios";
import {
  type BlitzResponse,
  type Preferences,
  type Angle,
  type AngleInput,
  type AngleUpdate,
  type Connection,
  type ContentListResponse,
  type ContentItem,
  type ContentParams,
  type PostListResponse,
  type Post,
  type PostParams,
  type ScheduleContentBody,
  type ScheduleContentResponse,
  type CancelPostsResponse,
  type AnalyticsPostsResponse,
  type ApiResponse,
  type ContentType,
  type ContentStatus,
  type PostStatus,
  type Platform,
  type GenderFilter,
  type BlitzSuggestion,
  type Pagination,
  type ListResponse,
  type PostMetrics,
  type FastlaneError,
  type FastlaneErrorCode,
  FastlaneApiError,
  unwrapError,
} from "./types";

export {
  type BlitzResponse,
  type Preferences,
  type Angle,
  type AngleInput,
  type AngleUpdate,
  type Connection,
  type ContentListResponse,
  type ContentItem,
  type ContentParams,
  type PostListResponse,
  type Post,
  type PostParams,
  type ScheduleContentBody,
  type ScheduleContentResponse,
  type CancelPostsResponse,
  type AnalyticsPostsResponse,
  type ContentType,
  type ContentStatus,
  type PostStatus,
  type Platform,
  type GenderFilter,
  type BlitzSuggestion,
  type Pagination,
  type ListResponse,
  type PostMetrics,
  type FastlaneError,
  type FastlaneErrorCode,
  FastlaneApiError,
};

const DEFAULT_BASE_URL = "https://api.usefastlane.ai/api/v1";
const RATE_LIMIT_TOKENS = 20;
const RATE_LIMIT_WINDOW_MS = 60000;

interface RateLimiterOptions {
  maxTokens?: number;
  refillRate?: number;
}

class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(options: RateLimiterOptions = {}) {
    this.maxTokens = options.maxTokens ?? RATE_LIMIT_TOKENS;
    this.refillRate = options.refillRate ?? RATE_LIMIT_WINDOW_MS;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.refillRate) * this.maxTokens);
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  async acquire(tokenCost = 1): Promise<void> {
    this.refill();
    
    if (this.tokens >= tokenCost) {
      this.tokens -= tokenCost;
      return;
    }

    const waitTime = Math.ceil(((tokenCost - this.tokens) / this.maxTokens) * this.refillRate);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    this.refill();
    this.tokens -= tokenCost;
  }

  get availableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  get retryAfterMs(): number {
    if (this.tokens >= 1) return 0;
    return Math.ceil(((1 - this.tokens) / this.maxTokens) * this.refillRate);
  }
}

export type FastlaneClientOptions = {
  apiKey: string;
  baseURL?: string;
  axiosInstance?: AxiosInstance;
  rateLimiter?: RateLimiterOptions;
  onRateLimited?: (retryAfterMs: number) => void;
};

export class FastlaneClient {
  private client: AxiosInstance;
  private rateLimiter: TokenBucketRateLimiter;
  private onRateLimited?: (retryAfterMs: number) => void;

  constructor(options: FastlaneClientOptions);
  constructor(apiKey: string, axiosInstance?: AxiosInstance);
  constructor(optionsOrApiKey: FastlaneClientOptions | string, axiosInstance?: AxiosInstance) {
    let apiKey: string;
    let baseURL: string;
    let rateLimitOptions: RateLimiterOptions | undefined;
    let onRateLimited: ((retryAfterMs: number) => void) | undefined;
    
    if (typeof optionsOrApiKey === "object" && "apiKey" in optionsOrApiKey) {
      apiKey = optionsOrApiKey.apiKey;
      baseURL = optionsOrApiKey.baseURL ?? DEFAULT_BASE_URL;
      axiosInstance = optionsOrApiKey.axiosInstance;
      rateLimitOptions = optionsOrApiKey.rateLimiter;
      onRateLimited = optionsOrApiKey.onRateLimited;
    } else {
      apiKey = optionsOrApiKey;
      baseURL = DEFAULT_BASE_URL;
    }
    
    this.rateLimiter = new TokenBucketRateLimiter(rateLimitOptions);
    this.onRateLimited = onRateLimited;
    
    this.client =
      axiosInstance ??
      axios.create({
        baseURL,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        validateStatus: () => true,
      });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    await this.rateLimiter.acquire();
    
    try {
      const response = await this.client.request<ApiResponse<T>>(config);
      const { status, data } = response;

      if (status === 429) {
        const retryAfterMs = this.rateLimiter.retryAfterMs;
        if (this.onRateLimited) {
          this.onRateLimited(retryAfterMs);
        }
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
        return this.request<T>(config);
      }

      if (status >= 400 || data.error) {
        throw unwrapError(data, `HTTP ${status}`, status);
      }

      return data.data;
    } catch (error) {
      if (error instanceof FastlaneApiError) throw error;

      if (error instanceof AxiosError && error.response) {
        throw unwrapError(
          error.response.data,
          error.message,
          error.response.status
        );
      }

      throw error;
    }
  }

  popBlitz = () =>
    this.request<BlitzResponse>({
      method: "POST",
      url: "/blitz",
    });

  getPreferences = () =>
    this.request<Preferences>({
      method: "GET",
      url: "/blitz/preferences",
    });

  updatePreferences = (prefs: Partial<Preferences>) =>
    this.request<Preferences>({
      method: "PATCH",
      url: "/blitz/preferences",
      data: prefs,
    });

  getAngles = () =>
    this.request<Angle[]>({
      method: "GET",
      url: "/blitz/angles",
    });

  createAngle = (data: AngleInput) =>
    this.request<Angle>({
      method: "POST",
      url: "/blitz/angles",
      data,
    });

  updateAngle = (id: string, data: AngleUpdate) =>
    this.request<Angle>({
      method: "PATCH",
      url: `/blitz/angles/${id}`,
      data,
    });

  deleteAngle = (id: string) =>
    this.request<{ deleted: boolean; angleId: string }>({
      method: "DELETE",
      url: `/blitz/angles/${id}`,
    });

  getConnections = () =>
    this.request<Connection[]>({
      method: "GET",
      url: "/connections",
    });

  getContent = (params?: ContentParams) =>
    this.request<ContentListResponse>({
      method: "GET",
      url: "/content",
      params,
    });

  getContentById = (id: string) =>
    this.request<ContentItem>({
      method: "GET",
      url: `/content/${id}`,
    });

  deleteContent = (id: string) =>
    this.request<{ deleted: boolean; contentId: string }>({
      method: "DELETE",
      url: `/content/${id}`,
    });

  scheduleContent = (contentId: string, data: ScheduleContentBody) =>
    this.request<ScheduleContentResponse>({
      method: "POST",
      url: `/content/${contentId}/schedule`,
      data,
    });

  getPosts = (params?: PostParams) =>
    this.request<PostListResponse>({
      method: "GET",
      url: "/posts",
      params,
    });

  getPostById = (id: string) =>
    this.request<Post>({
      method: "GET",
      url: `/posts/${id}`,
    });

  cancelPosts = (postIds: string[]) =>
    this.request<CancelPostsResponse>({
      method: "POST",
      url: "/posts/cancel",
      data: { postIds },
    });

  getPostAnalytics = (postIds: string[]) =>
    this.request<AnalyticsPostsResponse>({
      method: "POST",
      url: "/analytics/posts",
      data: { postIds },
    });

  getRateLimitStatus() {
    return {
      availableTokens: this.rateLimiter.availableTokens,
      retryAfterMs: this.rateLimiter.retryAfterMs,
    };
  }
}

export default FastlaneClient;