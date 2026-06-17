import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const toggleLike = mutation({
  args: { postId: v.id("posts") },
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

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("포스트를 찾을 수 없습니다.");
    }

    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_and_post", (q) =>
        q.eq("userId", user._id).eq("postId", args.postId)
      )
      .unique();

    if (existingLike) {
      // 1. 좋아요 해제
      await ctx.db.delete(existingLike._id);
      
      // 포스트의 likes 수 1 감소 (최소 0)
      const newLikesCount = Math.max(0, (post.likes || 0) - 1);
      await ctx.db.patch(args.postId, { likes: newLikesCount });

      // 좋아요 해제 시 관련된 알림도 제거해주면 깔끔하다.
      const existingNotification = await ctx.db
        .query("notifications")
        .withIndex("by_receiver", (q) => q.eq("receiverId", post.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("senderId"), user._id),
            q.eq(q.field("type"), "like"),
            q.eq(q.field("postId"), args.postId)
          )
        )
        .unique();
      if (existingNotification) {
        await ctx.db.delete(existingNotification._id);
      }

      return { isLiked: false, likesCount: newLikesCount };
    } else {
      // 2. 좋아요 추가
      await ctx.db.insert("likes", {
        userId: user._id,
        postId: args.postId,
      });

      const newLikesCount = (post.likes || 0) + 1;
      await ctx.db.patch(args.postId, { likes: newLikesCount });

      // 본인 글에 좋아요한 경우가 아니면 알림 생성
      if (post.userId !== user._id) {
        await ctx.db.insert("notifications", {
          receiverId: post.userId,
          senderId: user._id,
          type: "like",
          postId: args.postId,
        });
      }

      return { isLiked: true, likesCount: newLikesCount };
    }
  },
});
