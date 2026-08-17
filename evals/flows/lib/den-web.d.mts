export interface DenApiResult {
  response: Response;
  body: unknown;
}

export function denWebUrl(): string;
export function denApiUrl(): string;
export function denApiFetch(path: string, options?: RequestInit): Promise<DenApiResult>;
