
export interface CroppedImage {
  id: string;
  originalName: string;
  dataUrl: string;
}

export enum LayoutMode {
  PREVIEW = 'PREVIEW',
  A4 = 'A4'
}

declare global {
  interface Window {
    html2canvas: any;
  }
}
