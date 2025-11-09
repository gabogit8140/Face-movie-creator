import React, { useRef } from 'react';
import { AlertIcon, CheckCircleIcon, XCircleIcon, XIcon, UserFocusIcon, MoveIcon, PencilIcon, ArrowLeftIcon, ArrowRightIcon, EyeIcon } from './icons.js';

const ImageList = ({ images, isProcessing, onReorder, onRemove, onSelectFace, onOpenAdjuster, onOpenTextEditor, onTransitionChange, processingProgress }) => {
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const handleDragStart = (e, position) => {
        dragItem.current = position;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e, position) => {
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
    
    const handleMove = (index, direction) => {
        if (direction === 'left' && index === 0) return;
        if (direction === 'right' && index === images.length - 1) return;

        const newImages = [...images];
        const item = newImages.splice(index, 1)[0];
        const newIndex = direction === 'left' ? index - 1 : index + 1;
        newImages.splice(newIndex, 0, item);
        onReorder(newImages);
    };

  const getStatusIndicator = (image) => {
    switch(image.status) {
      case 'ready':
        if (image.faceDetectionFailed && !image.isManuallyAdjusted) {
             return React.createElement('div', { className: "absolute top-1 right-1 bg-orange-500 p-1 rounded-full shadow-lg", title: "Pupils need manual placement" }, React.createElement(EyeIcon, { className: "w-4 h-4 text-white" }));
        }
        if (image.isManuallyAdjusted) {
             return React.createElement('div', { className: "absolute top-1 right-1 bg-purple-500 p-1 rounded-full shadow-lg", title: "Manually adjusted" }, React.createElement(CheckCircleIcon, { className: "w-4 h-4 text-white" }));
        }
        return React.createElement('div', { className: "absolute top-1 right-1 bg-green-500 p-1 rounded-full shadow-lg", title: "Ready" }, React.createElement(CheckCircleIcon, { className: "w-4 h-4 text-white" }));
      case 'needs-selection':
        return React.createElement('div', { className: "absolute top-1 right-1 bg-yellow-500 p-1 rounded-full shadow-lg" }, React.createElement(AlertIcon, { className: "w-4 h-4 text-white" }));
      case 'no-face':
      case 'error':
        return React.createElement('div', { className: "absolute top-1 right-1 bg-red-500 p-1 rounded-full shadow-lg" }, React.createElement(XCircleIcon, { className: "w-4 h-4 text-white" }));
      default:
        return null;
    }
  };

  const getStatusText = (image) => {
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

  return React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg shadow-lg" },
    React.createElement('h2', { className: "text-xl font-semibold mb-4 text-white" }, "2. Your Photos"),
    isProcessing && images.length === 0 && React.createElement('div', { className: "text-center text-gray-400 py-4" },
        processingProgress !== null ? (
            React.createElement('div', null,
                React.createElement('p', { className: "text-lg font-semibold text-gray-300" }, "Analyzing faces..."),
                React.createElement('div', { className: "w-full bg-gray-700 rounded-full h-2.5 my-3" },
                    React.createElement('div', {
                        className: "bg-green-500 h-2.5 rounded-full transition-all duration-200",
                        style: { width: `${processingProgress}%` }
                    })
                ),
                React.createElement('p', { className: "text-sm font-mono text-gray-400" }, `${processingProgress}%`)
            )
        ) : (
            "Processing uploaded images..."
        )
    ),
    !isProcessing && images.length === 0 && React.createElement('div', { className: "text-center text-gray-400 py-4" }, "Upload some photos to begin."),
    React.createElement('div', { className: "grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3" },
      images.map((image, index) => React.createElement('div', { key: image.id, className: "relative group aspect-square" },
        React.createElement('div', {
          className: "w-full h-full cursor-grab",
          draggable: true,
          onDragStart: (e) => handleDragStart(e, index),
          onDragEnter: (e) => handleDragEnter(e, index),
          onDragEnd: handleDragEnd,
          onDragOver: (e) => e.preventDefault()
        },
          React.createElement('img', { src: image.previewUrl, alt: `upload-preview-${index}`, className: "w-full h-full object-cover rounded-md" })
        ),
        React.createElement('div', { className: `absolute inset-0 bg-black transition-opacity duration-300 rounded-md pointer-events-none ${image.status !== 'ready' || (image.faceDetectionFailed && !image.isManuallyAdjusted) ? 'opacity-60' : 'opacity-0 group-hover:opacity-60'}` }),
        
        getStatusIndicator(image),
        
        image.textOverlay && React.createElement('div', { className: "absolute top-1 left-8 bg-blue-500/80 p-1 rounded-full shadow-lg pointer-events-none", title: "Has text overlay" },
            React.createElement(PencilIcon, { className: "w-4 h-4 text-white" })
        ),

        React.createElement('button', {
          onClick: () => onRemove(image.id),
          className: "absolute top-1 left-1 bg-gray-900/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500",
          'aria-label': "Remove image"
        },
          React.createElement(XIcon, { className: "w-4 h-4" })
        ),

        image.status === 'ready' && React.createElement('div', { className: `absolute inset-0 flex items-center justify-center gap-3 transition-opacity pointer-events-none ${ (image.faceDetectionFailed && !image.isManuallyAdjusted) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`},
            React.createElement('button', {
                onClick: () => onOpenAdjuster(image.id),
                className: `p-3 rounded-full text-white pointer-events-auto ${ (image.faceDetectionFailed && !image.isManuallyAdjusted) ? 'bg-orange-600/90 hover:bg-orange-500 animate-pulse' : 'bg-purple-600/80 hover:bg-purple-500'}`,
                'aria-label': "Adjust landmarks",
                title: "Fine-tune eye positions"
            },
                React.createElement(EyeIcon, { className: "w-6 h-6" })
            ),
            React.createElement('button', {
                onClick: () => onOpenTextEditor(image),
                className: "p-3 rounded-full text-white bg-blue-600/80 hover:bg-blue-500 pointer-events-auto",
                'aria-label': "Add or Edit Text",
                title: "Add or Edit Text"
            },
                React.createElement(PencilIcon, { className: "w-6 h-6" })
            )
        ),

        React.createElement('div', { className: "absolute bottom-0 left-0 right-0 p-1.5 text-center text-white text-xs bg-gray-900/60 rounded-b-md pointer-events-none" },
            getStatusText(image)
        ),

        image.status === 'needs-selection' && React.createElement('button', {
          onClick: () => onSelectFace(image),
          className: "absolute inset-0 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
        },
          React.createElement(UserFocusIcon, { className: "w-8 h-8" }),
          React.createElement('span', { className: "text-xs font-bold mt-1" }, "Select Face")
        ),

        React.createElement('div', { className: "absolute top-1/2 -translate-y-1/2 left-1 right-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity" },
            React.createElement('button', { onClick: () => handleMove(index, 'left'), disabled: index === 0, className: "p-1 bg-gray-900/50 rounded-full text-white hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed", 'aria-label': "Move left" },
                React.createElement(ArrowLeftIcon, { className: "w-4 h-4" })
            ),
            React.createElement('button', { onClick: () => handleMove(index, 'right'), disabled: index === images.length - 1, className: "p-1 bg-gray-900/50 rounded-full text-white hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed", 'aria-label': "Move right" },
                React.createElement(ArrowRightIcon, { className: "w-4 h-4" })
            )
        ),

         React.createElement('div', { className: "absolute bottom-1 left-1 text-white opacity-0 group-hover:opacity-100 transition-opacity", title: "Drag to reorder" },
             React.createElement(MoveIcon, { className: "w-4 h-4" })
         ),

         index < images.length - 1 && image.status === 'ready' && (
            React.createElement('div', { className: "absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" },
                React.createElement('select', {
                    value: image.transitionToNext || 'crossfade',
                    onChange: (e) => onTransitionChange(image.id, e.target.value),
                    onClick: (e) => e.stopPropagation(),
                    className: "text-xs bg-gray-900/80 text-white rounded p-0.5 border border-gray-600 focus:ring-purple-500 focus:border-purple-500 cursor-pointer",
                    title: "Transition to next image"
                },
                    React.createElement('option', { value: "crossfade" }, "Fade"),
                    React.createElement('option', { value: "slide" }, "Slide"),
                    React.createElement('option', { value: "zoom" }, "Zoom"),
                    React.createElement('option', { value: "ken-burns" }, "Ken Burns")
                )
            )
        )
      ))
    )
  );
};

export default ImageList;