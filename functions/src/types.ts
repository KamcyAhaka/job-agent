export interface JobListing {
  title: string;
  company: string;
  url: string;
  location: string;
  source: string;
  postedAt: string;
  content?: string;
}

export interface MatchedJob extends JobListing {
  matchScore: number;
  matchReason: string;
  contact?: {
    email?: string;
    name?: string;
  };
  savedAt?: FirebaseFirestore.Timestamp;
  notified: boolean;
}
