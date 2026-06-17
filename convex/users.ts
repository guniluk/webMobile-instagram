import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * 1. Clerk 인증 정보를 기반으로 현재 로그인한 사용자를 Convex DB에 저장/동기화합니다.
 * - 클라이언트 앱 구동 시 로그인한 유저 정보를 안전하게 백엔드에서 확인하고 동기화할 때 유용합니다.
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("Convex: storeUser mutation called!");
    const identity = await ctx.auth.getUserIdentity();
    console.log("Convex: identity fetched:", identity);
    if (!identity) {
      throw new Error(
        "인증되지 않은 요청입니다. 로그인 후 다시 시도해 주세요.",
      );
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

    // 기존 유저 정보 동기화 (프로필 이미지, 이메일 등이 변경될 수 있음)
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
 * 2. Clerk Webhook(예: Svix를 이용한 사용자 생성/변경 이벤트)에서 호출하여 유저 정보를 동기화합니다.
 * - 외부에서 유저의 가입 파라미터를 명시적으로 넘겨 저장할 때 사용합니다.
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
 * 3. Clerk ID를 기반으로 유저 정보를 조회합니다.
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

/**
 * 4. Convex 고유 ID(_id)를 기반으로 유저 정보를 조회합니다.
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * 5. 현재 로그인한 사용자의 프로필 정보(fullname, bio)를 수정합니다.
 */
export const updateProfile = mutation({
  args: {
    fullname: v.string(),
    bio: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "인증되지 않은 요청입니다. 로그인 후 다시 시도해 주세요.",
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    await ctx.db.patch(user._id, {
      fullname: args.fullname,
      bio: args.bio,
    });

    return user._id;
  },
});

/**
 * 6. username을 기반으로 유저 프로필 및 팔로우 여부 조회
 */
export const getUserProfile = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("username"), args.username))
      .unique();

    if (!user) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    let isFollowing = false;

    if (identity) {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();

      if (currentUser && currentUser._id !== user._id) {
        const follow = await ctx.db
          .query("follows")
          .withIndex("by_both", (q) =>
            q.eq("followerId", currentUser._id).eq("followingId", user._id)
          )
          .unique();
        isFollowing = !!follow;
      }
    }

    return {
      userId: user._id,
      username: user.username,
      name: user.fullname,
      bio: user.bio || "",
      avatar: user.image,
      postsCount: user.posts || 0,
      followersCount: user.followers || 0,
      followingCount: user.following || 0,
      isFollowing: isFollowing,
    };
  },
});
