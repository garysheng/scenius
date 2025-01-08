/**
 * Service for managing URL formatting and generation across the application.
 * Centralizes URL structure to make it easier to change URL schemes.
 */

import { URL_PARAMS } from '@/lib/constants/url-params';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.scenius.chat';

export const urlService = {
  /**
   * Base configuration
   */
  config: {
    /** Get the base URL for the application */
    getBaseUrl: () => BASE_URL,
    
    /** Get the metadata base URL for OpenGraph and Twitter cards */
    getMetadataBase: () => new URL(BASE_URL),
    
    /** Convert a relative path to an absolute URL */
    toAbsolute: (path: string) => `${BASE_URL}${path}`,
  },

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
    channel: (spaceId: string, channelId: string) => `/spaces/${spaceId}?${URL_PARAMS.SEARCH.CHANNEL}=${channelId}`,

    /** Get the URL for a specific message in a space */
    message: (spaceId: string, channelId: string, messageId: string) => 
      `/spaces/${spaceId}?${URL_PARAMS.SEARCH.CHANNEL}=${channelId}&${URL_PARAMS.SEARCH.MESSAGE}=${messageId}`,
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
    inviteWithDomain: (code: string) => urlService.config.toAbsolute(`/invites/${encodeURIComponent(code)}`),
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