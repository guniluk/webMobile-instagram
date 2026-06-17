import { create } from "zustand";

export interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  time: string;
}

export interface Post {
  id: string;
  username: string;
  userAvatar: string;
  image: string;
  likes: number;
  isLiked: boolean;
  isBookmarked: boolean;
  caption: string;
  timeAgo: string;
  comments: Comment[];
}

export interface Story {
  id: string;
  username: string;
  avatar: string;
  hasStory: boolean;
}

export interface Notification {
  id: string;
  username: string;
  avatar: string;
  action: string;
  timeAgo: string;
  postImage?: string;
  type: "like" | "comment" | "follow";
}

export interface UserProfile {
  username: string;
  name: string;
  bio: string;
  avatar: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

interface PostsState {
  posts: Post[];
  stories: Story[];
  notifications: Notification[];
  userProfile: UserProfile;
  toggleLike: (
    postId: string,
    currentUser?: { username: string; avatar: string },
  ) => void;
  toggleBookmark: (postId: string) => void;
  addComment: (
    postId: string,
    text: string,
    currentUser: { username: string; avatar: string },
  ) => void;
  addPost: (
    image: string,
    caption: string,
    currentUser: { username: string; avatar: string },
  ) => void;
  updateProfile: (name: string, bio: string) => void;
}

const INITIAL_STORIES: Story[] = [
  {
    id: "1",
    username: "alex_travels",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    hasStory: true,
  },
  {
    id: "2",
    username: "chef_mario",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    hasStory: true,
  },
  {
    id: "3",
    username: "fit_emma",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    hasStory: true,
  },
  {
    id: "4",
    username: "music_josh",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    hasStory: false,
  },
  {
    id: "5",
    username: "art_sophia",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    hasStory: true,
  },
];

const INITIAL_POSTS: Post[] = [
  {
    id: "p1",
    username: "alex_travels",
    userAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800",
    likes: 124,
    isLiked: false,
    isBookmarked: false,
    caption:
      "Chasing sunsets around the world 🌅🌎. Can you guess where this is?",
    timeAgo: "2 hours ago",
    comments: [
      {
        id: "c1",
        username: "chef_mario",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        text: "Looks absolutely breathtaking! 😍",
        time: "1h",
      },
      {
        id: "c2",
        username: "fit_emma",
        avatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        text: "Wow, addition to my bucket list immediately!",
        time: "45m",
      },
    ],
  },
  {
    id: "p2",
    username: "chef_mario",
    userAvatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
    likes: 89,
    isLiked: false,
    isBookmarked: false,
    caption:
      "Homemade Neapolitan Pizza night! 🍕 Crispy crust, fresh mozzarella, and basil. Perfection.",
    timeAgo: "4 hours ago",
    comments: [
      {
        id: "c3",
        username: "alex_travels",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        text: "Save a slice for me please! 😋",
        time: "3h",
      },
    ],
  },
  {
    id: "p3",
    username: "art_sophia",
    userAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800",
    likes: 245,
    isLiked: false,
    isBookmarked: false,
    caption:
      "Finally finished my latest abstract canvas! 🎨 Layers of emotion and colors. What does it make you feel?",
    timeAgo: "1 day ago",
    comments: [],
  },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    username: "alex_travels",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    action: "liked your post",
    timeAgo: "5m",
    postImage:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800",
    type: "like",
  },
  {
    id: "n2",
    username: "fit_emma",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    action: 'commented: "Save a slice for me please! 😋"',
    timeAgo: "2h",
    postImage:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800",
    type: "comment",
  },
  {
    id: "n3",
    username: "music_josh",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    action: "started following you",
    timeAgo: "1d",
    type: "follow",
  },
];

export const usePostsStore = create<PostsState>((set) => ({
  posts: INITIAL_POSTS,
  stories: INITIAL_STORIES,
  notifications: INITIAL_NOTIFICATIONS,
  userProfile: {
    username: "me_instagram",
    name: "My Account",
    bio: "Photography lover | React Native Enthusiast 📸✨",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    postsCount: 3,
    followersCount: 1420,
    followingCount: 482,
  },

  toggleLike: (postId, currentUser) =>
    set((state) => {
      const updatedPosts = state.posts.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked;
          return {
            ...post,
            isLiked,
            likes: isLiked ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      });

      const targetPost = state.posts.find((p) => p.id === postId);
      let updatedNotifications = [...state.notifications];

      if (
        targetPost &&
        !targetPost.isLiked &&
        currentUser &&
        targetPost.username !== currentUser.username
      ) {
        const newNotif: Notification = {
          id: `n_like_${Date.now()}`,
          username: currentUser.username,
          avatar: currentUser.avatar,
          action: "liked your post",
          timeAgo: "Just now",
          postImage: targetPost.image,
          type: "like",
        };
        updatedNotifications = [newNotif, ...updatedNotifications];
      }

      return {
        posts: updatedPosts,
        notifications: updatedNotifications,
      };
    }),

  toggleBookmark: (postId) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? { ...post, isBookmarked: !post.isBookmarked }
          : post,
      ),
    })),

  addComment: (postId, text, currentUser) =>
    set((state) => {
      const updatedPosts = state.posts.map((post) => {
        if (post.id === postId) {
          const newComment: Comment = {
            id: `c_${Date.now()}`,
            username: currentUser.username,
            avatar: currentUser.avatar,
            text,
            time: "Just now",
          };
          return {
            ...post,
            comments: [...post.comments, newComment],
          };
        }
        return post;
      });

      const targetPost = state.posts.find((p) => p.id === postId);
      let updatedNotifications = [...state.notifications];

      if (
        targetPost &&
        currentUser &&
        targetPost.username !== currentUser.username
      ) {
        const newNotif: Notification = {
          id: `n_comm_${Date.now()}`,
          username: currentUser.username,
          avatar: currentUser.avatar,
          action: `commented: "${text}"`,
          timeAgo: "Just now",
          postImage: targetPost.image,
          type: "comment",
        };
        updatedNotifications = [newNotif, ...updatedNotifications];
      }

      return {
        posts: updatedPosts,
        notifications: updatedNotifications,
      };
    }),

  addPost: (image, caption, currentUser) =>
    set((state) => {
      const newPost: Post = {
        id: `p_${Date.now()}`,
        username: currentUser.username,
        userAvatar: currentUser.avatar,
        image,
        likes: 0,
        isLiked: false,
        isBookmarked: false,
        caption,
        timeAgo: "Just now",
        comments: [],
      };
      return {
        posts: [newPost, ...state.posts],
        userProfile: {
          ...state.userProfile,
          postsCount: state.userProfile.postsCount + 1,
        },
      };
    }),

  updateProfile: (name, bio) =>
    set((state) => ({
      userProfile: {
        ...state.userProfile,
        name,
        bio,
      },
    })),
}));
