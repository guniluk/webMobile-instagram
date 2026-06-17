import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getNotifications = query({
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

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_receiver", (q) => q.eq("receiverId", user._id))
      .order("desc") // 최신순
      .collect();

    const results = [];
    for (const notif of notifications) {
      const sender = await ctx.db.get(notif.senderId);
      if (!sender) continue;

      let postImage = undefined;
      if (notif.postId) {
        const post = await ctx.db.get(notif.postId);
        postImage = post?.imageUrl;
      }

      let actionText = "";
      if (notif.type === "like") {
        actionText = "liked your post";
      } else if (notif.type === "comment") {
        let commentText = "commented on your post";
        if (notif.commentId) {
          const comment = await ctx.db.get(notif.commentId);
          if (comment) {
            commentText = `commented: "${comment.content}"`;
          }
        }
        actionText = commentText;
      } else if (notif.type === "follow") {
        actionText = "started following you";
      }

      results.push({
        id: notif._id,
        username: sender.username,
        avatar: sender.image,
        action: actionText,
        timeAgo: "방금 전",
        postImage: postImage,
        type: notif.type,
      });
    }

    return results;
  },
});

export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") },
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

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("알림을 찾을 수 없습니다.");
    }

    // 권한 확인
    if (notification.receiverId !== user._id) {
      throw new Error("삭제 권한이 없습니다.");
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});
