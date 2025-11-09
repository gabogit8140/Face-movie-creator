export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Face {
  id: string;
  box: BoundingBox;
  landmarks: {
    left_pupil: Point;
    right_pupil: Point;
  };
}

export type TextAnimation = 'none' | 'fade' | 'typewriter' | 'slide-in' | 'zoom-in';

export interface TextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number; // as a percentage of canvas height
  color: string;
  position: Point; // normalized 0-1
  animation: TextAnimation;
}

export interface UploadedImage {
  id: string;
  file?: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export type ImageStatus = 'processing' | 'needs-selection' | 'ready' | 'no-face' | 'error';

export type TransitionStyle = 'crossfade' | 'slide' | 'zoom' | 'ken-burns';

export interface ProcessedImage extends UploadedImage {
  faces: Face[];
  selectedFaceId?: string;
  status: ImageStatus;
  isManuallyAdjusted?: boolean;
  faceDetectionFailed?: boolean;
  transitionToNext?: TransitionStyle;
  textOverlay?: TextOverlay;
}