import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getComments = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    const results = [];
    for (const comment of comments) {
      const user = await ctx.db.get(comment.userId);
      if (user) {
        results.push({
          id: comment._id,
          username: user.username,
          avatar: user.image,
          text: comment.content,
          time: "방금 전",
        });
      }
    }
    return results;
  },
});

export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
  },
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

    // 댓글 삽입
    const commentId = await ctx.db.insert("comments", {
      userId: user._id,
      postId: args.postId,
      content: args.content,
    });

    // 포스트의 comments 카운트 1 증가
    await ctx.db.patch(args.postId, {
      comments: (post.comments || 0) + 1,
    });

    // 본인 글이 아니면 알림 생성
    if (post.userId !== user._id) {
      await ctx.db.insert("notifications", {
        receiverId: post.userId,
        senderId: user._id,
        type: "comment",
        postId: args.postId,
        commentId: commentId,
      });
    }

    return commentId;
  },
});
