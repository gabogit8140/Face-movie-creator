import React, { useRef } from 'react';
import { ProcessedImage, TransitionStyle } from '../types';
import { AlertIcon, CheckCircleIcon, XCircleIcon, XIcon, UserFocusIcon, MoveIcon, PencilIcon, ArrowLeftIcon, ArrowRightIcon, EyeIcon } from './icons';

interface ImageListProps {
  images: ProcessedImage[];
  isProcessing: boolean;
  onReorder: (images: ProcessedImage[]) => void;
  onRemove: (id: string) => void;
  onSelectFace: (image: ProcessedImage) => void;
  onOpenAdjuster: (id: string) => void;
  onOpenTextEditor: (image: ProcessedImage) => void;
  onTransitionChange: (imageId: string, transition: TransitionStyle) => void;
  processingProgress: number | null;
}

const ImageList: React.FC<ImageListProps> = ({ images, isProcessing, onReorder, onRemove, onSelectFace, onOpenAdjuster, onOpenTextEditor, onTransitionChange, processingProgress }) => {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragItem.current = position;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
        dragOverItem.current = position;
    };

    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const newImages = [...images];
            const dragItemContent = newImages[dragItem.current];
            newImages.splice(dragItem.current, 1);
            newImages.splice(dragOverItem.current, 0, dragItemContent);
            dragItem.current = null;
            dragOverItem.current = null;
            onReorder(newImages);
        }
    };
    
    const handleMove = (index: number, direction: 'left' | 'right') => {
        if (direction === 'left' && index === 0) return;
        if (direction === 'right' && index === images.length - 1) return;

        const newImages = [...images];
        const item = newImages.splice(index, 1)[0];
        const newIndex = direction === 'left' ? index - 1 : index + 1;
        newImages.splice(newIndex, 0, item);
        onReorder(newImages);
    };

  const getStatusIndicator = (image: ProcessedImage) => {
    switch(image.status) {
      case 'ready':
        if (image.faceDetectionFailed && !image.isManuallyAdjusted) {
             return <div className="absolute top-1 right-1 bg-orange-500 p-1 rounded-full shadow-lg" title="Pupils need manual placement"><EyeIcon className="w-4 h-4 text-white" /></div>;
        }
        if (image.isManuallyAdjusted) {
             return <div className="absolute top-1 right-1 bg-purple-500 p-1 rounded-full shadow-lg" title="Manually adjusted"><CheckCircleIcon className="w-4 h-4 text-white" /></div>;
        }
        return <div className="absolute top-1 right-1 bg-green-500 p-1 rounded-full shadow-lg" title="Ready"><CheckCircleIcon className="w-4 h-4 text-white" /></div>;
      case 'needs-selection':
        return <div className="absolute top-1 right-1 bg-yellow-500 p-1 rounded-full shadow-lg"><AlertIcon className="w-4 h-4 text-white" /></div>;
      case 'no-face':
      case 'error':
        return <div className="absolute top-1 right-1 bg-red-500 p-1 rounded-full shadow-lg"><XCircleIcon className="w-4 h-4 text-white" /></div>;
      default:
        return null;
    }
  };

  const getStatusText = (image: ProcessedImage) => {
      switch (image.status) {
          case 'needs-selection': return 'Select face';
          case 'no-face': return 'No face found';
          case 'error': return 'Error';
          case 'ready': 
            if (image.faceDetectionFailed && !image.isManuallyAdjusted) {
                return 'Adjust Pupils';
            }
            return image.isManuallyAdjusted ? 'Adjusted' : 'Ready';
          default: return 'Processing...';
      }
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-white">2. Your Photos</h2>
      {isProcessing && images.length === 0 && (
          <div className="text-center text-gray-400 py-4">
            {processingProgress !== null ? (
                <div>
                    <p className="text-lg font-semibold text-gray-300">Analyzing faces...</p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5 my-3">
                        <div 
                            className="bg-green-500 h-2.5 rounded-full transition-all duration-200" 
                            style={{ width: `${processingProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm font-mono text-gray-400">{processingProgress}%</p>
                </div>
            ) : (
                "Processing uploaded images..."
            )}
        </div>
      )}
      {!isProcessing && images.length === 0 && (
          <div className="text-center text-gray-400 py-4">Upload some photos to begin.</div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative group aspect-square"
          >
            <div 
              className="w-full h-full cursor-grab"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
            >
              <img src={image.previewUrl} alt={`upload-preview-${index}`} className="w-full h-full object-cover rounded-md" />
            </div>
            <div className={`absolute inset-0 bg-black transition-opacity duration-300 rounded-md pointer-events-none ${image.status !== 'ready' || (image.faceDetectionFailed && !image.isManuallyAdjusted) ? 'opacity-60' : 'opacity-0 group-hover:opacity-60'}`}></div>
            
            {getStatusIndicator(image)}
            
            {image.textOverlay && (
                <div className="absolute top-1 left-8 bg-blue-500/80 p-1 rounded-full shadow-lg pointer-events-none" title="Has text overlay">
                    <PencilIcon className="w-4 h-4 text-white" />
                </div>
            )}

            <button
              onClick={() => onRemove(image.id)}
              className="absolute top-1 left-1 bg-gray-900/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              aria-label="Remove image"
            >
              <XIcon className="w-4 h-4" />
            </button>

            {image.status === 'ready' && (
                <div className={`absolute inset-0 flex items-center justify-center gap-3 transition-opacity pointer-events-none ${ (image.faceDetectionFailed && !image.isManuallyAdjusted) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                        onClick={() => onOpenAdjuster(image.id)}
                        className={`p-3 rounded-full text-white pointer-events-auto ${ (image.faceDetectionFailed && !image.isManuallyAdjusted) ? 'bg-orange-600/90 hover:bg-orange-500 animate-pulse' : 'bg-purple-600/80 hover:bg-purple-500'}`}
                        aria-label="Adjust landmarks"
                        title="Fine-tune eye positions"
                    >
                        <EyeIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => onOpenTextEditor(image)}
                        className="p-3 rounded-full text-white bg-blue-600/80 hover:bg-blue-500 pointer-events-auto"
                        aria-label="Add or Edit Text"
                        title="Add or Edit Text"
                    >
                        <PencilIcon className="w-6 h-6" />
                    </button>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center text-white text-xs bg-gray-900/60 rounded-b-md pointer-events-none">
                {getStatusText(image)}
            </div>

            {image.status === 'needs-selection' && (
                <button
                    onClick={() => onSelectFace(image)}
                    className="absolute inset-0 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <UserFocusIcon className="w-8 h-8"/>
                    <span className="text-xs font-bold mt-1">Select Face</span>
                </button>
            )}

            <div className="absolute top-1/2 -translate-y-1/2 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleMove(index, 'left')} disabled={index === 0} className="p-1 bg-gray-900/50 rounded-full text-white hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Move left">
                    <ArrowLeftIcon className="w-4 h-4" />
                </button>
                <button onClick={() => handleMove(index, 'right')} disabled={index === images.length - 1} className="p-1 bg-gray-900/50 rounded-full text-white hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Move right">
                    <ArrowRightIcon className="w-4 h-4" />
                </button>
            </div>

             <div className="absolute bottom-1 left-1 text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Drag to reorder">
                 <MoveIcon className="w-4 h-4" />
             </div>

             {index < images.length - 1 && image.status === 'ready' && (
                <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <select
                        value={image.transitionToNext || 'crossfade'}
                        onChange={(e) => onTransitionChange(image.id, e.target.value as TransitionStyle)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-gray-900/80 text-white rounded p-0.5 border border-gray-600 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
                        title="Transition to next image"
                    >
                        <option value="crossfade">Fade</option>
                        <option value="slide">Slide</option>
                        <option value="zoom">Zoom</option>
                        <option value="ken-burns">Ken Burns</option>
                    </select>
                </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageList;