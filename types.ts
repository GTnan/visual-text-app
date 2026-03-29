export interface StyleTransferRequest {
  sourceHtml: string;
  referenceText: string;
}

export interface ProcessingState {
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}
