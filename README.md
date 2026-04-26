# Fastlane API SDK

TypeScript SDK for the Fastlane AI content generation API.

## Installation

```bash
bun add usefastlane-api
# or
npm install usefastlane-api
```

## Quick Start

```typescript
import { FastlaneClient } from "usefastlane-api";

const client = new FastlaneClient("fsln_live_your_api_key");
```

## Examples

### Pop a Blitz (Content Generation)

```typescript
const blitz = await client.popBlitz();
console.log(blitz.contentId);
console.log(blitz.suggestion.contentType); // "slideshow" | "wall-of-text" | "green-screen" | "video-hook"
console.log(blitz.swipesRemaining);

// Poll for content readiness
let content = await client.getContentById(blitz.contentId);
while (content.status === "BUILDING") {
  await new Promise(r => setTimeout(r, 5000));
  content = await client.getContentById(blitz.contentId);
}

if (content.status === "CREATED") {
  console.log(content.files); // Array of URLs
  console.log(content.thumbnailUrl);
}
```

### Get/Update Preferences

```typescript
// Get current preferences
const prefs = await client.getPreferences();
console.log(prefs.slideshowWeight); // 25

// Update single field (no queue flush)
await client.updatePreferences({ ownMediaPercentage: 75 });

// Update content type weights (triggers queue flush)
await client.updatePreferences({
  slideshowWeight: 40,
  wallOfTextWeight: 30,
  greenScreenWeight: 20,
  videoHookWeight: 10,
  remixPercentage: 60,
});
```

### Manage Angles

```typescript
// List all angles
const angles = await client.getAngles();
angles.forEach(a => console.log(`${a.title}: ${a.description}`));

// Create new angle
const newAngle = await client.createAngle({
  title: "Behind the scenes",
  description: "Show how the product gets built day-to-day",
  targetAudience: "Engineers considering our toolchain",
});

// Update angle
await client.updateAngle(newAngle._id, { isActive: false });

// Delete angle
await client.deleteAngle(newAngle._id);
```

### List Connections

```typescript
const connections = await client.getConnections();
connections.forEach(conn => {
  console.log(`${conn.platform}: @${conn.platformUsername}`);
  console.log(`  Expires: ${new Date(conn.tokenExpiry).toISOString()}`);
});
```

### Content Library

```typescript
// List content with filtering
const content = await client.getContent({
  limit: 20,
  type: "slideshow",
  status: "CREATED",
});

content.data.forEach(c => {
  console.log(`${c._id} - ${c.type} - ${c.status}`);
});

if (content.pagination.hasMore) {
  const nextPage = await client.getContent({ cursor: content.pagination.cursor });
}

// Get single content item
const item = await client.getContentById("content_123");

// Delete content
await client.deleteContent("content_123");
```

### Schedule Content

```typescript
const post = await client.scheduleContent("content_123", {
  platform: "tiktok",
  utc_datetime: "2026-05-01T18:00:00Z",
  caption: "Check this out!",
  // connectionId optional if only one connection exists for platform
});

console.log(post.postId);
```

### Manage Posts

```typescript
// List posts
const posts = await client.getPosts({
  status: "SCHEDULED",
  limit: 10,
});

// Get single post
const post = await client.getPostById("post_123");

// Cancel scheduled posts
const result = await client.cancelPosts(["post_1", "post_2", "post_3"]);
console.log(`Cancelled ${result.cancelled} posts`);
```

### Analytics

```typescript
const metrics = await client.getPostAnalytics([
  "post_123",
  "post_456",
  "post_789",
]);

metrics.data.forEach(m => {
  if (m.notFound) {
    console.log(`${m._id}: Not found`);
  } else {
    console.log(`${m._id}: ${m.views} views, ${m.likes} likes, ${m.comments} comments`);
    console.log(`  Posted: ${new Date(m.postedAt!).toISOString()}`);
    console.log(`  URL: ${m.postUrl}`);
  }
});
```

## Error Handling

```typescript
import { FastlaneApiError } from "usefastlane-api";

try {
  const result = await client.popBlitz();
} catch (error) {
  if (error instanceof FastlaneApiError) {
    console.log(error.code);    // e.g., "not_found", "blitz_quota_exceeded", "rate_limited"
    console.log(error.status);  // HTTP status code
    console.log(error.message); // Human-readable message
    console.log(error.details);  // Optional details object
  }
  throw error;
}
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `unauthorized` | Invalid or revoked API key |
| `not_found` | Resource doesn't exist or queue empty |
| `bad_request` | Invalid request body or parameters |
| `blitz_quota_exceeded` | Daily swipe cap reached |
| `rate_limited` | Per-workspace rate limit exceeded |
| `connection_ambiguous` | Multiple connections - specify connectionId |
| `content_has_linked_posts` | Delete posts before deleting content |
| `content_still_building` | Wait for content to finish building |

## Using with Custom Axios Instance

```typescript
import axios from "axios";
import { FastlaneClient } from "usefastlane-api";

const customAxios = axios.create({
  timeout: 30000,
});

const client = new FastlaneClient("fsln_live_your_key", customAxios);
```

## TypeScript Types

All types are exported and can be imported directly:

```typescript
import type {
  BlitzResponse,
  Preferences,
  ContentItem,
  Post,
  PostMetrics,
  Platform,
  ContentType,
} from "usefastlane-api";
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# TypeScript check
bun run tsc --noEmit
```