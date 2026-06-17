# Convex 데이터베이스 연동 및 관리 가이드 (Convex Guide)

이 문서는 실시간 반응형 백엔드 서비스인 **Convex**를 프로젝트에 연동하고, 데이터베이스 스키마 및 가입자 저장용 API(Clerk 소셜 인증 연동)를 세팅하고 관리하는 전체 과정을 초보자용 눈높이로 상세히 설명합니다.

---

## 📌 전체 일처리 순서 요약
1. [Step 1: Convex 로컬 환경 설치 및 초기화](#step-1-convex-로컬-환경-설치-및-초기화)
2. [Step 2: 데이터베이스 스키마 정의 (`schema.ts`)](#step-2-데이터베이스-스키마-정의-schemats)
3. [Step 3: Clerk JWT 템플릿 생성 및 연동 (Clerk 웹사이트)](#step-3-clerk-jwt-템플릿-생성-및-연동-clerk-웹사이트)
4. [Step 4: Convex 백엔드 인증 파일 작성 (`auth.config.ts`)](#step-4-convex-백엔드-인증-파일-작성-authconfigts)
5. [Step 5: 가입자 데이터베이스 동기화 API 구현 (`users.ts`)](#step-5-가입자-데이터베이스-동기화-api-구현-usersts)
6. [Step 6: 프론트엔드 자동 동기화 래핑 (`app/_layout.tsx`)](#step-6-프론트엔드-자동-동기화-래핑-app_layouttsx)
7. [Step 7: [고급] Clerk Webhook 연동 및 HTTP Action 구축 (`http.ts`)](#step-7-고급-clerk-webhook-연동-및-http-action-구축-httpts)

---

### Step 1: Convex 로컬 환경 설치 및 초기화
1. 터미널을 열고 프로젝트 루트 디렉토리에서 Convex 클라이언트 라이브러리를 설치합니다.
   ```bash
   npm install convex
   ```
2. 로컬 개발 서버와 클라우드 백엔드를 실시간 동기화 상태로 켭니다.
   ```bash
   npx convex dev
   ```
   * **최초 실행 시:** 브라우저 창이 열리며 Convex 로그인(GitHub 등)을 유도합니다.
   * 로그인이 완료되면 자동으로 현재 프로젝트의 클라우드 백엔드 인스턴스가 개설되고, 접속 주소 키가 [.env.local](file:///Users/guniluk/Desktop/CODING/webMobile-instagram/.env.local) 파일에 `EXPO_PUBLIC_CONVEX_URL`로 기록됩니다.
   * 개발 중 이 명령어를 터미널 창에 켜두면, `convex/` 내에 소스코드를 저장할 때마다 자동으로 빌드 검증을 거쳐 백엔드에 즉시 배포됩니다.

---

### Step 2: 데이터베이스 스키마 정의 (`schema.ts`)
Convex는 파일 기반으로 테이블 구조를 엄격하게 정의합니다. 아래 코드로 스키마를 선언합니다.

* **파일 경로:** `convex/schema.ts`
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    fullname: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    image: v.string(),
    followers: v.number(),
    following: v.number(),
    posts: v.number(),
    clerkId: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  posts: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    likes: v.number(),
    comments: v.number(),
  }).index("by_user", ["userId"]),

  comments: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    content: v.string(),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_both", ["followerId", "followingId"]),

  notifications: defineTable({
    receiverId: v.id("users"),
    senderId: v.id("users"),
    type: v.union(v.literal("like"), v.literal("comment"), v.literal("follow")),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
  }).index("by_receiver", ["receiverId"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_user", ["userId"])
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),
});
```

---

### Step 3: Clerk JWT 템플릿 생성 및 연동 (Clerk 웹사이트)
Convex 서버가 Clerk이 발급해 준 로그인 회원 토큰을 가로채어 안전하게 신원을 확인할 수 있도록 JWT 통신 경로를 뚫어줍니다.
1. [Clerk Dashboard](https://dashboard.clerk.com)에 로그인하고 프로젝트를 선택합니다.
2. 왼쪽 메뉴의 **Configure** > **JWT Templates**를 선택합니다.
3. **New Template** 버튼을 클릭하고 목록 중 **Convex**를 선택합니다.
4. 아래에 표시되는 **Issuer URL** 값을 복사합니다. (예: `https://your-clerk-issuer-domain.clerk.accounts.dev`)
5. **Create**를 눌러 템플릿 생성을 확정합니다.

---

### Step 4: Convex 백엔드 인증 파일 작성 (`auth.config.ts`)
Convex 서버가 Clerk 토큰을 복호화하고 신뢰할 수 있도록 설정 파일을 만듭니다.

* **파일 경로:** `convex/auth.config.ts`
```typescript
export default {
  providers: [
    {
      // Step 3에서 복사한 Clerk Issuer URL 주소를 여기에 대입합니다.
      domain: "https://your-clerk-issuer-domain.clerk.accounts.dev", 
      applicationID: "convex",
    },
  ],
};
```
> 💡 **Tip:** 만약 배포(Production)와 로컬 환경을 나눈다면, `domain: process.env.CLERK_JWT_ISSUER_DOMAIN!`과 같이 작성한 뒤 Convex Dashboard의 환경 변수 탭에서 주소값을 각 인스턴스별로 기입해 줍니다.

---

### Step 5: 가입자 데이터베이스 동기화 API 구현 (`users.ts`)
로그인한 유저가 데이터베이스의 `users` 테이블에 자동으로 보관되고 조회될 수 있도록 백엔드 비즈니스 로직(Mutation, Query)을 작성합니다.

* **파일 경로:** `convex/users.ts`
```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * 1. Clerk 인증 정보를 기반으로 현재 로그인한 사용자를 Convex DB에 저장/동기화합니다.
 * - 이미 존재하지 않는 유저라면 신규 데이터(insert) 생성
 * - 이미 존재하는 유저라면 최신 프로필 정보 갱신(patch)
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("인증되지 않은 요청입니다. 로그인 후 다시 시도해 주세요.");
    }

    // Clerk ID로 기존 사용자 조회
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const email = identity.email ?? "";
    const username = identity.nickname ?? email.split("@")[0] ?? "user";
    const fullname = identity.name ?? username;
    const image = identity.pictureUrl ?? "";

    if (user === null) {
      // 신규 유저 생성
      return await ctx.db.insert("users", {
        clerkId: identity.subject,
        email: email,
        username: username,
        fullname: fullname,
        image: image,
        followers: 0,
        following: 0,
        posts: 0,
      });
    }

    // 기존 유저 정보 동기화
    await ctx.db.patch(user._id, {
      email: email,
      username: username,
      fullname: fullname,
      image: image,
    });

    return user._id;
  },
});

/**
 * 2. Webhook을 이용한 유저 정보 동기화 Mutation (웹훅 호출 전용)
 */
export const createOrUpdateUserFromWebhook = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    username: v.string(),
    fullname: v.string(),
    image: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (user === null) {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        username: args.username,
        fullname: args.fullname,
        image: args.image,
        followers: 0,
        following: 0,
        posts: 0,
      });
    }

    await ctx.db.patch(user._id, {
      email: args.email,
      username: args.username,
      fullname: args.fullname,
      image: args.image,
    });

    return user._id;
  },
});

/**
 * 3. Clerk ID 기반 유저 단건 조회
 */
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});
```

---

### Step 6: 프론트엔드 자동 동기화 래핑 (`app/_layout.tsx`)
프론트엔드 모바일 앱이 기동할 때 Clerk 로그인을 완료하면 자동으로 위의 `storeUser` 백엔드 Mutation을 호출하여 사용자를 안전하게 디비에 저장하도록 구성합니다.
*(상세 코드는 [clerk.md](file:///Users/guniluk/Desktop/CODING/webMobile-instagram/clerk.md)의 **Step 5**를 참고하세요.)*

---

### Step 7: [고급] Clerk Webhook 연동 및 HTTP Action 구축 (`http.ts`)
클라이언트 측 앱에서 디비를 호출하는 대신, **Clerk 서버 ➡️ Convex 백엔드 서버**로 회원 이벤트를 실시간 백그라운드로 전달하도록 설정하는 고효율 연동 방법입니다.

#### ① Convex 웹훅 주소 확인
1. [Convex Dashboard](https://dashboard.convex.dev) > **Settings** > **URL & Deployments** 로 이동합니다.
2. **HTTP / Site URL** 영역의 주소(예: `https://your-app.convex.site`)를 복사합니다.
3. 최종 엔드포인트 수신 주소는 뒤에 `/clerk-webhook` 경로를 붙인 `https://your-app.convex.site/clerk-webhook` 이 됩니다.

#### ② Clerk Webhook 등록 및 시크릿 키 연동
1. [Clerk Dashboard](https://dashboard.clerk.com) > **Configure** > **Webhooks** 로 이동해 **Add Endpoint**를 누릅니다.
2. **Endpoint URL**에 위의 Convex Webhook 수신 주소를 기입합니다.
3. **Message Filtering**에서 `user.created`, `user.updated`, `user.deleted`를 체크하고 추가합니다.
4. 생성 완료 시 제공되는 **Signing Secret** (`whsec_...` 로 시작하는 문자열)을 복사합니다.
5. [Convex Dashboard](https://dashboard.convex.dev) > **Settings** > **Environment Variables**로 이동하여 변수를 등록합니다:
   * **Name:** `CLERK_WEBHOOK_SECRET`
   * **Value:** 복사한 `whsec_...` 문자열 키값

#### ③ 웹훅 처리 백엔드 코드 작성
웹훅 검증 라이브러리인 `svix`를 프로젝트에 설치합니다.
```bash
npm install svix @clerk/backend
```
그리고 웹훅을 수신 및 처리해줄 `http.ts` 파일을 생성합니다.

* **파일 경로:** `convex/http.ts`
```typescript
import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";

export const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET not set");
      return new Response("CLERK_WEBHOOK_SECRET not set in Convex environment", { status: 500 });
    }

    // headers 추출
    const svix_id = request.headers.get("svix-id");
    const svix_timestamp = request.headers.get("svix-timestamp");
    const svix_signature = request.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    // Svix 검증을 위해 반드시 원본 raw text body가 필요합니다.
    const body = await request.text();
    const webhook = new Webhook(webhookSecret);
    let evt: any;

    // webhook 서명 검증
    try {
      evt = webhook.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as any;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error verifying webhook", { status: 400 });
    }

    const eventType = evt.type;
    
    // user.created 와 user.updated 모두 동기화하도록 처리
    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;
      
      const email = email_addresses?.[0]?.email_address ?? "";
      if (!email) {
        return new Response("No email address provided", { status: 400 });
      }
      
      const name = `${first_name || ""} ${last_name || ""}`.trim() || username || email.split("@")[0] || "User";
      const userUsername = username || email.split("@")[0] || "user";

      try {
        // users.ts에 작성되어 있는 실제 Mutation 호출
        await ctx.runMutation(api.users.createOrUpdateUserFromWebhook, {
          clerkId: id,
          email: email,
          username: userUsername,
          fullname: name,
          image: image_url ?? "",
        });
      } catch (error) {
        console.error("Error syncing user to database:", error);
        return new Response("Error syncing user to database", { status: 500 });
      }
    }
    
    return new Response("Webhook processed successfully", { status: 200 });
  }),
});

// Convex HTTP 라우팅에 필수적인 default export 선언
export default http;
```

---

## 8. 핵심 CLI 명령어 요약

| 명령어 | 용도 | 설명 |
| :--- | :--- | :--- |
| `npx convex dev` | 로컬 개발 및 실시간 동기화 | 로컬 파일 변경 시 즉시 클라우드에 반영하며 대시보드 링크를 제공합니다. |
| `npx convex deploy` | 프로덕션 배포 | 실제 출시용 프로덕션 환경에 백엔드 함수를 배포합니다. |
| `npx convex dashboard` | 대시보드 열기 | 웹 대시보드 브라우저 창을 바로 엽니다. |
| `npx convex codegen` | 타입 및 바인딩 생성 | 배포를 켜지 않고 타입스크립트 코드와 API 바인딩만 로컬 생성합니다. |
