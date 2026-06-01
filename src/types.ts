export interface TrelloBoard {
  id: string;
  name: string;
  desc?: string;
  descData?: unknown;
  closed: boolean;
  idOrganization?: string | null;
  pinned?: boolean;
  url: string;
  shortUrl?: string;
  prefs?: Record<string, unknown>;
  labelNames?: Record<string, string>;
  lists?: TrelloList[];
  labels?: TrelloLabel[];
  members?: TrelloMember[];
  dateLastActivity?: string;
  dateLastView?: string;
}

export interface TrelloList {
  id: string;
  name: string;
  closed: boolean;
  idBoard: string;
  pos: number;
  subscribed?: boolean;
  softLimit?: number | null;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc?: string;
  closed: boolean;
  idBoard: string;
  idList: string;
  idLabels?: string[];
  idMembers?: string[];
  idChecklists?: string[];
  due?: string | null;
  dueComplete?: boolean;
  dateLastActivity?: string;
  labels?: TrelloLabel[];
  url: string;
  shortUrl?: string;
  pos: number;
  checklists?: TrelloChecklist[];
  badges?: Record<string, unknown>;
  attachments?: TrelloAttachment[];
  actions?: TrelloAction[];
}

export interface TrelloLabel {
  id: string;
  idBoard: string;
  name: string;
  color: string | null;
  uses?: number;
}

export interface TrelloChecklist {
  id: string;
  name: string;
  idCard: string;
  idBoard?: string;
  pos: number;
  checkItems: TrelloCheckItem[];
}

export interface TrelloCheckItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
  idChecklist: string;
  pos: number;
  due?: string | null;
  idMember?: string | null;
}

export interface TrelloMember {
  id: string;
  username: string;
  fullName: string;
  initials?: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface TrelloAttachment {
  id: string;
  name: string;
  url: string;
  bytes?: number | null;
  date: string;
  mimeType?: string | null;
  idMember?: string;
  isUpload?: boolean;
}

export interface TrelloAction {
  id: string;
  idMemberCreator?: string;
  type: string;
  date: string;
  data?: Record<string, unknown>;
  memberCreator?: TrelloMember;
}

export interface TrelloSearchResult {
  cards?: TrelloCard[];
  boards?: TrelloBoard[];
  options?: Record<string, unknown>;
  cardsMatched?: number;
  boardsMatched?: number;
}

export type TrelloLabelColor =
  | 'yellow'
  | 'purple'
  | 'blue'
  | 'red'
  | 'green'
  | 'orange'
  | 'black'
  | 'sky'
  | 'pink'
  | 'lime'
  | 'null';

export type CardPosition = 'top' | 'bottom' | number;
