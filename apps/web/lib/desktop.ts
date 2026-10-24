export type UpdateInfo = {
  status: "no-release" | "current" | "available";
  current: string;
  version?: string;
  verified?: boolean;
  releaseUrl?: string;
  message: string;
};
export type DesktopBridge = {
  openMusic(url: string): Promise<void>;
  closeMusic(): Promise<void>;
  checkUpdates(): Promise<UpdateInfo>;
  installUpdate(): Promise<{ status: string }>;
  onUpdateProgress(
    callback: (progress: { received: number; total: number }) => void,
  ): () => void;
};
