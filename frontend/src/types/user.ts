export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  customInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
}
