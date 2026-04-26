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
  FastlaneApiError,
};

const BASE_URL = "https://api.usefastlane.ai/api/v1";

export class FastlaneClient {
  private client: AxiosInstance;

  constructor(apiKey: string, axiosInstance?: AxiosInstance) {
    this.client =
      axiosInstance ??
      axios.create({
        baseURL: BASE_URL,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        validateStatus: () => true,
      });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config);
      const { status, data } = response;

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
}

export default FastlaneClient;