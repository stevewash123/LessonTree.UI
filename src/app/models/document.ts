export interface Document {
    id: number;
    fileName: string;
    contentType: string;
    blob: string | Uint8Array; // Adjust based on your API's response
    lessonId: number;
  }