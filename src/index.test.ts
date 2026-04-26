import { describe, test, expect, beforeEach } from "bun:test";
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { FastlaneClient } from "./index";
import { FastlaneApiError } from "./types";

const API_KEY = "fsln_live_test12345678901234567890123";
const BASE_URL = "https://api.usefastlane.ai/api/v1";

type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

type ApiResponse<T = unknown> =
  | { data: T }
  | { error: ApiError };

function createMockClient() {
  const axiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });

  let next:
    | {
        url: string;
        status: number;
        body: ApiResponse;
      }
    | undefined;

  const reply = (url: string, status: number, body: ApiResponse) => {
    next = { url, status, body };
  };

  axiosInstance.request = async <T,>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    const url = config.url?.split("?")[0] ?? "";

    if (!next || next.url !== url) {
      throw new AxiosError(`No mock registered for ${url}`);
    }

    const response = next;
    next = undefined;

    return {
      data: response.body as T,
      status: response.status,
      statusText: response.status >= 400 ? "Error" : "OK",
      headers: {},
      config: config as any,
    };
  };

  return {
    axiosInstance,
    ok: <T,>(url: string, data: T, status = 200) =>
      reply(url, status, { data }),
    fail: (
      url: string,
      code = "bad_request",
      message = "Bad request",
      status = 400,
      details?: Record<string, unknown>
    ) => reply(url, status, { error: { code, message, details } }),
  };
}

const fx = {
  preferences: {
    slideshowWeight: 25,
    wallOfTextWeight: 25,
    greenScreenWeight: 25,
    videoHookWeight: 25,
    remixPercentage: 50,
    ownMediaPercentage: 50,
    mentionBusinessPercentage: 50,
    genderFilter: null,
    angleWeights: { angle1: 60 },
  },

  angle: {
    _id: "angle_123",
    title: "Product education",
    description: "Explain how the product solves problem X",
    targetAudience: "Small business owners",
    isActive: true,
    createdAt: 1713400000000,
    updatedAt: 1713400000000,
  },

  connection: {
    _id: "conn_123",
    platform: "tiktok",
    platformUserId: "user123",
    platformUsername: "@testuser",
    scopes: ["video.upload"],
    tokenExpiry: 1713400000000,
    createdAt: 1713000000000,
    updatedAt: 1713300000000,
  },

  content: {
    _id: "content_123",
    type: "slideshow",
    status: "CREATED",
    files: ["https://example.com/slide1.jpg"],
    thumbnailUrl: "https://example.com/thumb.jpg",
    createdAt: 1713400000000,
    updatedAt: 1713400000000,
  },

  post: {
    _id: "post_123",
    status: "SCHEDULED",
    contentId: "content_123",
    platform: "tiktok",
    scheduledAt: 1713400000000,
    createdAt: 1713000000000,
    updatedAt: 1713000000000,
  },

  page<T>(items: T[]) {
    return {
      data: items,
      pagination: {
        cursor: null,
        hasMore: false,
      },
    };
  },
} as const;

describe("FastlaneClient", () => {
  let client: FastlaneClient;
  let api: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    api = createMockClient();
    client = new FastlaneClient(API_KEY, api.axiosInstance as AxiosInstance);
  });

  const successCases = [
    {
      name: "popBlitz",
      url: "/blitz",
      status: 202,
      data: {
        contentId: "content_123",
        suggestion: {
          contentType: "slideshow",
          generatedText: "Test caption",
          aiExplanation: "AI chose this because...",
          createdAt: 1713400000000,
        },
        swipesRemaining: 42,
      },
      call: () => client.popBlitz(),
      expect: (result: any) => {
        expect(result.contentId).toBe("content_123");
        expect(result.swipesRemaining).toBe(42);
      },
    },
    {
      name: "getPreferences",
      url: "/blitz/preferences",
      data: fx.preferences,
      call: () => client.getPreferences(),
      expect: (result: any) => {
        expect(result.slideshowWeight).toBe(25);
      },
    },
    {
      name: "updatePreferences",
      url: "/blitz/preferences",
      data: { ...fx.preferences, slideshowWeight: 40 },
      call: () => client.updatePreferences({ slideshowWeight: 40 }),
      expect: (result: any) => {
        expect(result.slideshowWeight).toBe(40);
      },
    },
    {
      name: "getAngles",
      url: "/blitz/angles",
      data: [fx.angle],
      call: () => client.getAngles(),
      expect: (result: any) => {
        expect(result[0]._id).toBe("angle_123");
      },
    },
    {
      name: "createAngle",
      url: "/blitz/angles",
      data: fx.angle,
      call: () =>
        client.createAngle({
          title: fx.angle.title,
          description: fx.angle.description,
          targetAudience: fx.angle.targetAudience,
        }),
      expect: (result: any) => {
        expect(result.isActive).toBe(true);
      },
    },
    {
      name: "updateAngle",
      url: "/blitz/angles/angle_123",
      data: { ...fx.angle, title: "Updated title" },
      call: () => client.updateAngle("angle_123", { title: "Updated title" }),
      expect: (result: any) => {
        expect(result.title).toBe("Updated title");
      },
    },
    {
      name: "deleteAngle",
      url: "/blitz/angles/angle_123",
      data: { deleted: true, angleId: "angle_123" },
      call: () => client.deleteAngle("angle_123"),
      expect: (result: any) => {
        expect(result.deleted).toBe(true);
      },
    },
    {
      name: "getConnections",
      url: "/connections",
      data: [fx.connection],
      call: () => client.getConnections(),
      expect: (result: any) => {
        expect(result[0].platform).toBe("tiktok");
      },
    },
    {
      name: "getContent",
      url: "/content",
      data: fx.page([fx.content]),
      call: () => client.getContent({ limit: 20 }),
      expect: (result: any) => {
        expect(result.data[0]._id).toBe("content_123");
      },
    },
    {
      name: "getContentById",
      url: "/content/content_123",
      data: fx.content,
      call: () => client.getContentById("content_123"),
      expect: (result: any) => {
        expect(result.status).toBe("CREATED");
      },
    },
    {
      name: "deleteContent",
      url: "/content/content_123",
      data: { deleted: true, contentId: "content_123" },
      call: () => client.deleteContent("content_123"),
      expect: (result: any) => {
        expect(result.deleted).toBe(true);
      },
    },
    {
      name: "scheduleContent",
      url: "/content/content_123/schedule",
      data: { postId: "post_123" },
      call: () =>
        client.scheduleContent("content_123", {
          platform: "tiktok",
          utc_datetime: "2026-05-01T18:00:00Z",
          caption: "Test caption",
        }),
      expect: (result: any) => {
        expect(result.postId).toBe("post_123");
      },
    },
    {
      name: "getPosts",
      url: "/posts",
      data: fx.page([fx.post]),
      call: () => client.getPosts(),
      expect: (result: any) => {
        expect(result.data[0].status).toBe("SCHEDULED");
      },
    },
    {
      name: "getPostById",
      url: "/posts/post_123",
      data: fx.post,
      call: () => client.getPostById("post_123"),
      expect: (result: any) => {
        expect(result._id).toBe("post_123");
      },
    },
    {
      name: "cancelPosts",
      url: "/posts/cancel",
      data: { cancelled: 2 },
      call: () => client.cancelPosts(["post_1", "post_2"]),
      expect: (result: any) => {
        expect(result.cancelled).toBe(2);
      },
    },
    {
      name: "getPostAnalytics",
      url: "/analytics/posts",
      data: {
        data: [
          {
            _id: "post_123",
            platform: "tiktok",
            status: "POSTED",
            views: 1234,
          },
          {
            _id: "post_456",
            notFound: true,
          },
        ],
      },
      call: () => client.getPostAnalytics(["post_123", "post_456"]),
      expect: (result: any) => {
        expect(result.data[0].views).toBe(1234);
        expect(result.data[1].notFound).toBe(true);
      },
    },
  ];

  test.each(successCases)("$name succeeds", async ({ url, data, status, call, expect }) => {
    api.ok(url, data, status);

    const result = await call();

    expect(result);
  });

  const errorCases = [
    {
      name: "popBlitz 404",
      url: "/blitz",
      call: () => client.popBlitz(),
      status: 404,
      code: "not_found",
      message: "Queue is empty",
    },
    {
      name: "popBlitz quota exceeded",
      url: "/blitz",
      call: () => client.popBlitz(),
      status: 429,
      code: "blitz_quota_exceeded",
      message: "Daily cap reached",
    },
    {
      name: "updatePreferences bad request",
      url: "/blitz/preferences",
      call: () => client.updatePreferences({ slideshowWeight: 40 }),
      status: 400,
      code: "bad_request",
      message: "Partial content-type weights",
    },
    {
      name: "scheduleContent ambiguous connection",
      url: "/content/content_123/schedule",
      call: () =>
        client.scheduleContent("content_123", {
          platform: "tiktok",
          utc_datetime: "2026-05-01T18:00:00Z",
        }),
      status: 400,
      code: "connection_ambiguous",
      message: "Multiple connections",
      details: { candidates: [] },
    },
    {
      name: "getContentById not found",
      url: "/content/999",
      call: () => client.getContentById("999"),
      status: 404,
      code: "not_found",
      message: "Content not found",
    },
  ];

  test.each(errorCases)(
    "$name throws FastlaneApiError",
    async ({ url, call, status, code, message, details }) => {
      api.fail(url, code, message, status, details);

      try {
        await call();
        throw new Error("Expected request to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(FastlaneApiError);

        if (error instanceof FastlaneApiError) {
          expect(error.code).toBe(code);
          expect(error.status).toBe(status);
          expect(error.message).toBe(message);
        }
      }
    }
  );
});