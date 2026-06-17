import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 1. 이미지 업로드용 URL 발급
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("인증되지 않은 요청입니다.");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// 2. 포스트 생성
export const createPost = mutation({
  args: {
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
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

    // Convex storage에서 퍼블릭 URL 조회
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error("이미지 URL을 가져올 수 없습니다.");
    }

    // 포스트 등록
    const postId = await ctx.db.insert("posts", {
      userId: user._id,
      imageUrl: imageUrl,
      storageId: args.storageId,
      caption: args.caption,
      likes: 0,
      comments: 0,
    });

    // 유저의 포스트 수 카운트 증가
    await ctx.db.patch(user._id, {
      posts: (user.posts || 0) + 1,
    });

    return postId;
  },
});

// 3. 전체 포스트 조회 (최신순)
export const getPosts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    let currentUser = null;

    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
    }

    const posts = await ctx.db.query("posts").order("desc").collect();

    const results = [];
    for (const post of posts) {
      const author = await ctx.db.get(post.userId);
      if (!author) continue;

      let isLiked = false;
      let isBookmarked = false;
      let isFollowing = false;

      if (currentUser) {
        const like = await ctx.db
          .query("likes")
          .withIndex("by_user_and_post", (q) =>
            q.eq("userId", currentUser._id).eq("postId", post._id)
          )
          .unique();
        isLiked = !!like;

        const bookmark = await ctx.db
          .query("bookmarks")
          .withIndex("by_user_and_post", (q) =>
            q.eq("userId", currentUser._id).eq("postId", post._id)
          )
          .unique();
        isBookmarked = !!bookmark;

        const follow = await ctx.db
          .query("follows")
          .withIndex("by_both", (q) =>
            q.eq("followerId", currentUser._id).eq("followingId", post.userId)
          )
          .unique();
        isFollowing = !!follow;
      }

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
        isLiked: isLiked,
        isBookmarked: isBookmarked,
        isFollowing: isFollowing,
        caption: post.caption || "",
        timeAgo: "방금 전", // 간단히 표기
        comments: commentsWithUser,
      });
    }

    return results;
  },
});

// 4. 특정 사용자의 포스트 조회
export const getUserPosts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let currentUser = null;

    if (identity) {
      currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const results = [];
    for (const post of posts) {
      const author = await ctx.db.get(post.userId);
      if (!author) continue;

      let isLiked = false;
      let isBookmarked = false;

      if (currentUser) {
        const like = await ctx.db
          .query("likes")
          .withIndex("by_user_and_post", (q) =>
            q.eq("userId", currentUser._id).eq("postId", post._id)
          )
          .unique();
        isLiked = !!like;

        const bookmark = await ctx.db
          .query("bookmarks")
          .withIndex("by_user_and_post", (q) =>
            q.eq("userId", currentUser._id).eq("postId", post._id)
          )
          .unique();
        isBookmarked = !!bookmark;
      }

      results.push({
        id: post._id,
        username: author.username,
        userAvatar: author.image,
        image: post.imageUrl,
        likes: post.likes,
        isLiked: isLiked,
        isBookmarked: isBookmarked,
        caption: post.caption || "",
        timeAgo: "방금 전",
        comments: [], // 프로필 그리드에서는 굳이 댓글 목록이 필요 없으므로 생략 또는 빈 배열
      });
    }

    return results;
  },
});

// 5. 포스트 삭제 (연관된 모든 데이터 Cascade Delete)
export const deletePost = mutation({
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

    // 작성자 본인 확인
    if (post.userId !== user._id) {
      throw new Error("삭제 권한이 없습니다.");
    }

    // 1. Convex Storage에 저장된 실제 이미지 파일 삭제
    await ctx.storage.delete(post.storageId);

    // 2. 포스트 연관 댓글(comments) 삭제
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // 3. 포스트 연관 좋아요(likes) 삭제
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    // 4. 포스트 연관 북마크(bookmarks) 삭제
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    // 5. 포스트 연관 알림(notifications) 삭제
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("postId"), args.postId))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // 6. 유저의 posts 수 1 감소
    await ctx.db.patch(user._id, {
      posts: Math.max(0, (user.posts || 0) - 1),
    });

    // 7. 포스트 레코드 삭제
    await ctx.db.delete(args.postId);

    return { success: true };
  },
});
