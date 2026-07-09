export interface IApiResponse<T = unknown> {
  code?: number;
  message?: string;
  data?: T;
  links?: Record<string, string>;
  errors?: string[];
  logout?: boolean;
}

export interface ITransformedItem {
  id: string;
  [key: string]: unknown;
  link: string;
}

export interface IFormattedMessage {
  id: string;
  isImage?: boolean;
  isPublished?: boolean;
  role: string;
  content: string;
  timestamp: number;
}
