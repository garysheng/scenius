/**
 * Service for managing URL formatting and generation across the application.
 * Centralizes URL structure to make it easier to change URL schemes.
 */
export const urlService = {
  /**
   * Formats URLs for spaces
   */
  spaces: {
    /** Get the URL for the spaces list page */
    list: () => '/spaces',
    
    /** Get the URL for a specific space */
    detail: (spaceId: string) => `/spaces/${spaceId}`,
    
    /** Get the URL for a space's settings */
    settings: (spaceId: string) => `/spaces/${spaceId}/settings`,
    
    /** Get the URL for a specific channel in a space */
    channel: (spaceId: string, channelId: string) => `/spaces/${spaceId}/channels/${channelId}`,
  },

  /**
   * Formats URLs for authentication
   */
  auth: {
    /** Get the sign in URL with optional redirect */
    signIn: (redirect?: string) => redirect ? `/signin?redirect=${encodeURIComponent(redirect)}` : '/signin',
    
    /** Get the sign up URL with optional redirect */
    signUp: (redirect?: string) => redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : '/signup',
  },

  /**
   * Formats URLs for invites
   */
  invites: {
    /** Get the URL for an invite code */
    invite: (code: string) => `/invites/${encodeURIComponent(code)}`,
    
    /** Get the full invite URL including domain */
    inviteWithDomain: (code: string) => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return `${baseUrl}/invites/${encodeURIComponent(code)}`;
    },
  },

  /**
   * Formats URLs for user profiles
   */
  users: {
    /** Get the URL for a user's profile */
    profile: (userId: string) => `/users/${userId}`,
  },

  /**
   * Helper function to ensure URLs are properly encoded
   */
  encode: (url: string) => encodeURI(url),
}; 