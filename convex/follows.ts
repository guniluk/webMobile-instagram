import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const toggleFollow = mutation({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("인증되지 않은 요청입니다.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    if (user._id === args.followingId) {
      throw new Error("자기 자신을 팔로우할 수 없습니다.");
    }

    const targetUser = await ctx.db.get(args.followingId);
    if (!targetUser) {
      throw new Error("상대방을 찾을 수 없습니다.");
    }

    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.followingId)
      )
      .unique();

    if (existingFollow) {
      // 1. 언팔로우
      await ctx.db.delete(existingFollow._id);

      // 내 following 카운트 감소
      await ctx.db.patch(user._id, {
        following: Math.max(0, (user.following || 0) - 1),
      });

      // 상대방 followers 카운트 감소
      await ctx.db.patch(args.followingId, {
        followers: Math.max(0, (targetUser.followers || 0) - 1),
      });

      // 관련 알림 삭제
      const existingNotification = await ctx.db
        .query("notifications")
        .withIndex("by_receiver", (q) => q.eq("receiverId", args.followingId))
        .filter((q) =>
          q.and(
            q.eq(q.field("senderId"), user._id),
            q.eq(q.field("type"), "follow")
          )
        )
        .unique();
      if (existingNotification) {
        await ctx.db.delete(existingNotification._id);
      }

      return { isFollowing: false };
    } else {
      // 2. 팔로우
      await ctx.db.insert("follows", {
        followerId: user._id,
        followingId: args.followingId,
      });

      // 내 following 카운트 증가
      await ctx.db.patch(user._id, {
        following: (user.following || 0) + 1,
      });

      // 상대방 followers 카운트 증가
      await ctx.db.patch(args.followingId, {
        followers: (targetUser.followers || 0) + 1,
      });

      // 상대방에게 알림 전송
      await ctx.db.insert("notifications", {
        receiverId: args.followingId,
        senderId: user._id,
        type: "follow",
      });

      return { isFollowing: true };
    }
  },
});

export const isFollowing = query({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return false;
    }

    const follow = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", user._id).eq("followingId", args.followingId)
      )
      .unique();

    return !!follow;
  },
});
