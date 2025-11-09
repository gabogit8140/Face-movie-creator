import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XIcon } from './icons.js';

const PupilHandle = ({ position, onPointerDown, label, color }) => {
    const style = {
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        borderColor: color,
        touchAction: 'none',
    };
    return React.createElement('div', {
        style: style,
        className: "absolute w-8 h-8 rounded-full border-2 cursor-grab flex items-center justify-center bg-black/40 backdrop-blur-sm",
        onPointerDown: onPointerDown
      },
      React.createElement('div', { className: "absolute h-full w-[2px]", style: { backgroundColor: color } }),
      React.createElement('div', { className: "absolute w-full h-[2px]", style: { backgroundColor: color } }),
      React.createElement('span', { className: "text-xs font-bold text-white", style: { textShadow: `0 0 4px black` } }, label)
    );
};

const TemplateMarker = ({ position, color }) => (
    React.createElement('div', { style: { left: position.x, top: position.y, transform: 'translate(-50%, -50%)', borderColor: color, pointerEvents: 'none' }, className: "absolute w-10 h-10 rounded-full border-2 border-dashed opacity-70" },
        React.createElement('div', { className: "absolute top-1/2 left-0 w-full h-[2px] -translate-y-1/2", style: { backgroundColor: color, opacity: 0.5 } }),
        React.createElement('div', { className: "absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2", style: { backgroundColor: color, opacity: 0.5 } })
    )
);


const AdjustmentModal = ({ images, startIndex, onSave, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(startIndex);
    const image = images[currentIndex];
    
    const [template, setTemplate] = useState(null);
    const [leftPupil, setLeftPupil] = useState({ x: 0, y: 0 });
    const [rightPupil, setRightPupil] = useState({ x: 0, y: 0 });

    const [draggingPupil, setDraggingPupil] = useState(null);
    const dragTargetRef = useRef(null);

    const imgRef = useRef(null);
    
    const isTemplateAdjustmentMode = currentIndex === 0;

    useEffect(() => {
        const imgEl = imgRef.current;
        if (!imgEl) return;

        const setup = () => {
            if (!imgRef.current) return;
            const { clientWidth, clientHeight } = imgRef.current;

            const currentFace = image.faces.find(f => f.id === image.selectedFaceId);
            if (currentFace) {
                setLeftPupil({ x: currentFace.landmarks.left_pupil.x * clientWidth, y: currentFace.landmarks.left_pupil.y * clientHeight });
                setRightPupil({ x: currentFace.landmarks.right_pupil.x * clientWidth, y: currentFace.landmarks.right_pupil.y * clientHeight });
            }

            if (!template) {
                const firstImage = images[0];
                const firstFace = firstImage?.faces.find(f => f.id === firstImage.selectedFaceId);
                if (firstFace) {
                    setTemplate({
                        left: { x: firstFace.landmarks.left_pupil.x * clientWidth, y: firstFace.landmarks.left_pupil.y * clientHeight },
                        right: { x: firstFace.landmarks.right_pupil.x * clientWidth, y: firstFace.landmarks.right_pupil.y * clientHeight }
                    });
                }
            }
        }
        
        if (imgEl.complete) setup();
        else imgEl.onload = setup;

    }, [image, images, template]);

    useEffect(() => {
        const handleResize = () => setTemplate(null);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    const handlePointerUp = useCallback((e) => {
        if (dragTargetRef.current) {
            dragTargetRef.current.releasePointerCapture(e.pointerId);
            dragTargetRef.current = null;
        }
        setDraggingPupil(null);
    }, []);

    const handlePointerMove = useCallback((e) => {
        if (!draggingPupil || !imgRef.current) return;
        
        const rect = imgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const boundedX = Math.max(0, Math.min(x, rect.width));
        const boundedY = Math.max(0, Math.min(y, rect.height));

        const newPos = { x: boundedX, y: boundedY };

        if (draggingPupil === 'left') {
            setLeftPupil(newPos);
            if (isTemplateAdjustmentMode) {
                setTemplate(current => ({ ...(current), left: newPos }));
            }
        } else { // dragging 'right'
            setRightPupil(newPos);
            if (isTemplateAdjustmentMode) {
                setTemplate(current => ({ ...(current), right: newPos }));
            }
        }
    }, [draggingPupil, isTemplateAdjustmentMode]);

    useEffect(() => {
        if (draggingPupil) {
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
            document.addEventListener('pointercancel', handlePointerUp);
        }
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [draggingPupil, handlePointerMove, handlePointerUp]);

    const handlePointerDown = (e, pupil) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragTargetRef.current = e.currentTarget;
        setDraggingPupil(pupil);
    };

    const saveCurrentImage = () => {
        if (!imgRef.current || !image.selectedFaceId) return;
        const { clientWidth, clientHeight } = imgRef.current;
        const newLandmarks = {
            left_pupil: { x: leftPupil.x / clientWidth, y: leftPupil.y / clientHeight },
            right_pupil: { x: rightPupil.x / clientWidth, y: rightPupil.y / clientHeight },
        };
        onSave(image.id, image.selectedFaceId, newLandmarks);
    };

    const handleNext = () => {
        saveCurrentImage();
        if (currentIndex < images.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        saveCurrentImage();
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleSaveAndExit = () => {
        saveCurrentImage();
        onClose();
    };

    let title = `Adjusting Image ${currentIndex + 1} of ${images.length}`;
    if(isTemplateAdjustmentMode) {
        title = "Step 1: Set the Golden Template";
    }

    return React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4", onClick: onClose },
        React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 max-w-5xl w-full flex flex-col", onClick: e => e.stopPropagation() },
            React.createElement('div', { className: "flex justify-between items-center mb-1" },
                React.createElement('h2', { className: "text-2xl font-bold text-white" }, title),
                React.createElement('button', { onClick: onClose, className: "text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700" },
                    React.createElement(XIcon, { className: "w-6 h-6" })
                )
            ),
            React.createElement('p', { className: "text-gray-400 mb-4 h-10" },
                isTemplateAdjustmentMode 
                    ? "Drag the handles to the center of each pupil. This will be the guide for all other photos."
                    : "Align the pupils in this photo with the guide markers by dragging the handles."
            ),
            React.createElement('div', { className: "relative w-full flex-grow flex items-center justify-center min-h-[50vh]" },
                React.createElement('div', { className: "relative inline-block" },
                    React.createElement('img', { ref: imgRef, src: image.previewUrl, alt: "Adjust face", className: "max-w-full max-h-[60vh] rounded-md shadow-2xl" }),
                    template && !isTemplateAdjustmentMode && React.createElement(React.Fragment, null,
                        React.createElement(TemplateMarker, { position: template.left, color: "#34d399" }),
                        React.createElement(TemplateMarker, { position: template.right, color: "#fbbf24" })
                    ),
                    React.createElement(PupilHandle, { position: leftPupil, onPointerDown: (e) => handlePointerDown(e, 'left'), label: "L", color: "#34d399" }),
                    React.createElement(PupilHandle, { position: rightPupil, onPointerDown: (e) => handlePointerDown(e, 'right'), label: "R", color: "#fbbf24" })
                )
            ),
            React.createElement('div', { className: "mt-6 pt-4 border-t border-gray-700 flex justify-between items-center gap-4" },
                React.createElement('button', {
                    onClick: handlePrev,
                    disabled: currentIndex === 0,
                    className: "px-6 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                }, "Previous"),
                React.createElement('div', { className: "flex-grow flex justify-center items-center gap-4" },
                    React.createElement('span', { className: "text-gray-400 font-mono" }, `${currentIndex + 1} / ${images.length}`),
                    React.createElement('button', {
                       onClick: handleSaveAndExit,
                       className: "px-4 py-2 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none"
                    }, "Save & Exit")
                ),
                React.createElement('button', {
                    onClick: handleNext,
                    className: "px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none"
                },
                    isTemplateAdjustmentMode ? 'Set & Next' : (currentIndex === images.length - 1 ? 'Save & Finish' : 'Save & Next')
                )
            )
        )
    );
};

export default AdjustmentModal;
