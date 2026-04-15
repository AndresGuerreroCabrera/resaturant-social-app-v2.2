export interface StoredApiSession {
  accessToken: string;
  refreshToken?: string | null;
  userId?: string | null;
  issuedAt: string;
}
