export interface Request {
  action: string;
  // block user
  userId?: string;
  userName?: string;
  text?: string; // factCheck
  question?: string; // factCheck question
}
