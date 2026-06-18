import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const toggleBookmark = mutation({
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

    const existingBookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_post", (q) =>
        q.eq("userId", user._id).eq("postId", args.postId)
      )
      .unique();

    if (existingBookmark) {
      await ctx.db.delete(existingBookmark._id);
      return { isBookmarked: false };
    } else {
      await ctx.db.insert("bookmarks", {
        userId: user._id,
        postId: args.postId,
      });
      return { isBookmarked: true };
    }
  },
});

export const getBookmarkedPosts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const results = [];
    for (const bookmark of bookmarks) {
      const post = await ctx.db.get(bookmark.postId);
      if (!post) continue;

      const author = await ctx.db.get(post.userId);
      if (!author) continue;

      // 좋아요 여부 확인
      const like = await ctx.db
        .query("likes")
        .withIndex("by_user_and_post", (q) =>
          q.eq("userId", user._id).eq("postId", post._id)
        )
        .unique();

      // 팔로우 여부 확인
      const follow = await ctx.db
        .query("follows")
        .withIndex("by_both", (q) =>
          q.eq("followerId", user._id).eq("followingId", post.userId)
        )
        .unique();

      // 댓글 리스트도 최신 순으로 일부 혹은 전체 반환
      const postComments = await ctx.db
        .query("comments")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect();

      const commentsWithUser = [];
      for (const comment of postComments) {
        const commentUser = await ctx.db.get(comment.userId);
        if (commentUser) {
          commentsWithUser.push({
            id: comment._id,
            username: commentUser.username,
            avatar: commentUser.image,
            text: comment.content,
            time: "방금 전", // UI에서 적절히 표기
          });
        }
      }

      results.push({
        id: post._id,
        authorId: author._id,
        username: author.username,
        userAvatar: author.image,
        image: post.imageUrl,
        likes: post.likes,
        isLiked: !!like,
        isBookmarked: true,
        isFollowing: !!follow,
        caption: post.caption || "",
        timeAgo: "방금 전",
        comments: commentsWithUser,
      });
    }

    return results;
  },
});
