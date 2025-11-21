
export type AspectRatio = "16:9" | "9:16" | "4:3" | "3:4" | "1:1";
export type ContentType = "script" | "prompts";

export interface StoryboardImage {
  prompt: string;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'success' | 'error';
  errorMessage?: string;
}
