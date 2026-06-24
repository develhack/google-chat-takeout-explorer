export interface User {
  email: string;
  name: string;
}

export interface RawGroup {
  lastPostedAt: string;
  members: {
    name: string;
    email?: string;
  }[];
  messageCount: number;
  emojiId?: string;
  name?: string;
  includingDeletedUsers: boolean;
}

export interface Group {
  id: string;
  lastPostedAt: string;
  members: {
    name: string;
    email?: string;
  }[];
  messageCount: number;
  emojiId?: string;
  name: string;
  dm: boolean;
}

export interface MessagesChunk {
  messages: Message[];
  total: number;
  hasBefore: boolean;
  hasAfter: boolean;
  shouldAdjustScrollTop: boolean;
}

export interface Message {
  sequence: number;
  groupId: string;
  threadId: string;
  messageId: string;
  replies: number;
  contents: {
    postedAt: string;
    creator: {
      name: string;
      email: string;
    };
    quotedMessageMetadata?: {
      creator: {
        name: string;
        email: string;
      };
      text: string;
    };
    text: string;
    annotations?: Annotation[];
    attachedFiles?: AttachedFile[];
    reactions?: Reaction[];
  };
}

export interface Annotation {
  startIndex: number;
  length: number;
  customEmojiMetadata?: { customEmoji: CustomEmoji };
  formatMetadata?: BasicFormatMetadata | FrontColorFormatMetadata;
  urlMetadata?: URLMetadata;
  videoCallMetadata?: VideoCallMetadata;
  driveMetadata?: DriveMetadata;
  interactionData?: InteractionData;
}

export interface BasicFormatMetadata {
  formatType:
    | "BOLD"
    | "BULLETED_LIST_ITEM"
    | "BULLETED_LIST"
    | "HIDDEN"
    | "ITALIC"
    | "MONOSPACE_BLOCK"
    | "MONOSPACE"
    | "QUOTE_BLOCK"
    | "STRIKE"
    | "UNDERLINE";
}

export interface CustomEmoji {
  shortcode: string;
  contentType: string;
}

export interface FrontColorFormatMetadata {
  formatType: "FONT_COLOR";
  fontColor: number;
}

export interface URLMetadata {
  url: Record<string, string>;
}

export interface VideoCallMetadata {
  meetingSpace: Record<string, string>;
}

export interface DriveMetadata {
  id: string;
  title: string;
}

export interface InteractionData {
  url: Record<string, string>;
}

export interface AttachedFile {
  exportName: string;
  originalName: string;
  width?: number;
  height?: number;
}

export interface Reaction {
  emoji: {
    unicode?: string;
    customEmoji?: CustomEmoji;
  };
  reactorEmails: string[];
}

export interface SearchResult {
  sequence: number;
  groupId: string;
  threadId: string;
  messageId: string;
  author: string;
  postedAt: string;
  texts: string[];
}

export interface SearchResultsChunk {
  results: SearchResult[];
  offset: number;
  total: number;
}
