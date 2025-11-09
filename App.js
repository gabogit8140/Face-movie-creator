import React, { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeImageForFaces } from './services/geminiService.js';
import ImageUploader from './components/ImageUploader.js';
import ImageList from './components/ImageList.js';
import FaceSelectorModal from './components/FaceSelectorModal.js';
import MoviePreview from './components/MoviePreview.js';
import AdjustmentModal from './components/AdjustmentModal.js';
import TextOverlayModal from './components/TextOverlayModal.js';

const STORAGE_KEY = 'faceMovieProjectState_v2';

const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

const App = () => {
    const [images, setImages] = useState([]);
    const [processedImages, setProcessedImages] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(null);
    const [imageToSelectFace, setImageToSelectFace] = useState(null);
    const [editingTextForImage, setEditingTextForImage] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    
    const [adjustmentState, setAdjustmentState] = useState(null);

    const [faceZoom, setFaceZoom] = useState(1.0);
    const [faceVerticalOffset, setFaceVerticalOffset] = useState(0);
    const [faceAngleOffset, setFaceAngleOffset] = useState(0);

    const readyImages = processedImages.filter(img => img.status === 'ready' && img.selectedFaceId !== undefined);
    const debounceTimeoutRef = useRef(null);

    // Load state from local storage on initial mount
    useEffect(() => {
        try {
            const savedStateJSON = localStorage.getItem(STORAGE_KEY);
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                
                const newImages = [];
                const newProcessedImages = [];

                for (const item of savedState.images) {
                     const blob = base64ToBlob(item.base64, item.mimeType);
                     const previewUrl = URL.createObjectURL(blob);
                     const image = {
                        id: item.id,
                        previewUrl,
                        base64: item.base64,
                        mimeType: item.mimeType,
                     };
                     newImages.push(image);
                     newProcessedImages.push({
                        ...image,
                        ...item
                     });
                }
                setImages(newImages);
                setProcessedImages(newProcessedImages);

                if (savedState.settings) {
                    setFaceZoom(savedState.settings.faceZoom ?? 1.0);
                    setFaceVerticalOffset(savedState.settings.faceVerticalOffset ?? 0);
                    setFaceAngleOffset(savedState.settings.faceAngleOffset ?? 0);
                }
            }
        } catch (error) {
            console.error("Failed to load state from local storage:", error);
            localStorage.removeItem(STORAGE_KEY); // Clear corrupted data
        }
        setIsLoaded(true);
    }, []);

    // Save state to local storage on change (debounced)
    useEffect(() => {
        if (!isLoaded) return; // Don't save until initial state is loaded

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = window.setTimeout(() => {
            try {
                 const savableImages = processedImages.map(img => ({
                    id: img.id,
                    base64: img.base64,
                    mimeType: img.mimeType,
                    faces: img.faces,
                    selectedFaceId: img.selectedFaceId,
                    status: img.status,
                    isManuallyAdjusted: img.isManuallyAdjusted,
                    faceDetectionFailed: img.faceDetectionFailed,
                    transitionToNext: img.transitionToNext,
                    textOverlay: img.textOverlay,
                }));

                const stateToSave = {
                    version: 2,
                    images: savableImages,
                    settings: {
                        faceZoom,
                        faceVerticalOffset,
                        faceAngleOffset,
                    }
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
            } catch (error) {
                console.error("Failed to save state to local storage:", error);
            }
        }, 500); // 500ms debounce

        return () => {
             if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        }

    }, [processedImages, faceZoom, faceVerticalOffset, faceAngleOffset, isLoaded]);

    const processImages = useCallback(async (uploadedImages) => {
        setProcessing(true);
        setProcessingProgress(0);
        const existingImageIds = new Set(processedImages.map(img => img.id));
        
        const imagesToProcess = uploadedImages.filter(img => !existingImageIds.has(img.id));
        
        const newProcessedImages = [];

        for (const [index, img] of imagesToProcess.entries()) {
            try {
                const faces = await analyzeImageForFaces(img.base64);

                if (faces.length > 0) {
                     const processedImg = {
                        ...img,
                        faces,
                        selectedFaceId: faces.length === 1 ? faces[0].id : undefined,
                        status: faces.length === 1 ? 'ready' : 'needs-selection',
                        faceDetectionFailed: false,
                    };
                    newProcessedImages.push(processedImg);
                } else {
                    console.warn('No faces detected for image:', img.id, "Creating a default face for manual adjustment.");
                    const defaultFace = {
                        id: `face-${Date.now()}-manual`,
                        box: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
                        landmarks: {
                            left_pupil: { x: 0.45, y: 0.45 },
                            right_pupil: { x: 0.55, y: 0.45 },
                        },
                    };
                    newProcessedImages.push({
                        ...img,
                        faces: [defaultFace],
                        selectedFaceId: defaultFace.id,
                        status: 'ready',
                        isManuallyAdjusted: false,
                        faceDetectionFailed: true,
                    });
                }
            } catch (error) {
                console.error('Failed to process image with Gemini:', img.id, error);
                console.warn("Creating a default face for manual adjustment due to error.");
                const defaultFace = {
                    id: `face-${Date.now()}-manual-error`,
                    box: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
                    landmarks: {
                        left_pupil: { x: 0.45, y: 0.45 },
                        right_pupil: { x: 0.55, y: 0.45 },
                    },
                };
                newProcessedImages.push({
                    ...img,
                    faces: [defaultFace],
                    selectedFaceId: defaultFace.id,
                    status: 'ready',
                    isManuallyAdjusted: false,
                    faceDetectionFailed: true,
                });
            }
            setProcessingProgress(Math.round(((index + 1) / imagesToProcess.length) * 100));
        }
        
        const allProcessedImages = [...processedImages, ...newProcessedImages];
        setProcessedImages(allProcessedImages);
        setProcessing(false);
        setTimeout(() => setProcessingProgress(null), 1000);

        const firstNeedsSelection = newProcessedImages.find(p => p.status === 'needs-selection');
        if (firstNeedsSelection) {
            setImageToSelectFace(firstNeedsSelection);
        }
    }, [processedImages]);

    const handleImagesUploaded = (newImages) => {
        const combinedImages = [...images, ...newImages];
        setImages(combinedImages);
        processImages(newImages); 
    };
    
    const handleReorderImages = (reorderedImages) => {
        setProcessedImages(reorderedImages);
    };

    const handleSelectFace = (imageId, faceId) => {
        const updatedImages = processedImages.map(img =>
            img.id === imageId ? { ...img, selectedFaceId: faceId, status: 'ready' } : img
        );
        setProcessedImages(updatedImages);
        setImageToSelectFace(null);

        const nextNeedsSelection = updatedImages.find(p => p.status === 'needs-selection');
        if (nextNeedsSelection) {
            setImageToSelectFace(nextNeedsSelection);
        }
    };

    const handleRemoveImage = (imageId) => {
        setImages(images.filter(img => img.id !== imageId));
        setProcessedImages(processedImages.filter(img => img.id !== imageId));
    };

    const handleOpenFaceSelector = (image) => {
        setImageToSelectFace(image);
    };

    const handleOpenAdjuster = (imageId) => {
        const imageIndex = readyImages.findIndex(img => img.id === imageId);
        if (imageIndex !== -1) {
            setAdjustmentState({ images: readyImages, startIndex: imageIndex });
        }
    };
    
    const handleOpenTextEditor = (image) => {
        setEditingTextForImage(image);
    };

    const handleSaveTextOverlay = (imageId, overlay) => {
        setProcessedImages(currentImages =>
            currentImages.map(img => {
                if (img.id === imageId) {
                    return { ...img, textOverlay: overlay || undefined };
                }
                return img;
            })
        );
        setEditingTextForImage(null);
    };

    const handleSaveAdjustmentAndProceed = (imageId, faceId, newLandmarks) => {
        setProcessedImages(currentImages =>
            currentImages.map(img => {
                if (img.id === imageId && img.selectedFaceId === faceId) {
                    const newFaces = img.faces.map(face => {
                        if (face.id === faceId) {
                            return { ...face, landmarks: newLandmarks };
                        }
                        return face;
                    });
                    return { ...img, faces: newFaces, isManuallyAdjusted: true, faceDetectionFailed: false };
                }
                return img;
            })
        );
    };

    const handleTransitionChange = (imageId, transition) => {
        setProcessedImages(currentImages =>
            currentImages.map(img =>
                img.id === imageId ? { ...img, transitionToNext: transition } : img
            )
        );
    };

    const handleSaveProject = useCallback(() => {
        if (processedImages.length === 0) return;

        const savableImages = processedImages.map(img => ({
            id: img.id,
            base64: img.base64,
            mimeType: img.mimeType,
            faces: img.faces,
            selectedFaceId: img.selectedFaceId,
            status: img.status,
            isManuallyAdjusted: img.isManuallyAdjusted,
            faceDetectionFailed: img.faceDetectionFailed,
            transitionToNext: img.transitionToNext,
            textOverlay: img.textOverlay,
        }));
        
        const projectData = {
            version: 2,
            images: savableImages,
            settings: {
                faceZoom,
                faceVerticalOffset,
                faceAngleOffset,
            }
        };

        const jsonString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `face-movie-project-${new Date().toISOString().slice(0,10)}.FaceMovie`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [processedImages, faceZoom, faceVerticalOffset, faceAngleOffset]);

    const handleLoadProject = useCallback((file) => {
        if (processedImages.length > 0) {
            if (!window.confirm("Loading a project will replace your current work. Are you sure?")) {
                return;
            }
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonString = event.target?.result;
                const loadedData = JSON.parse(jsonString);

                let loadedImages = [];
                
                if (loadedData.version === 2 && Array.isArray(loadedData.images)) {
                    loadedImages = loadedData.images;
                    const { settings } = loadedData;
                    if (settings) {
                        setFaceZoom(settings.faceZoom ?? 1.0);
                        setFaceVerticalOffset(settings.faceVerticalOffset ?? 0);
                        setFaceAngleOffset(settings.faceAngleOffset ?? 0);
                    }
                } else if (Array.isArray(loadedData)) {
                    loadedImages = loadedData;
                     setFaceZoom(1.0);
                     setFaceVerticalOffset(0);
                     setFaceAngleOffset(0);
                } else {
                     throw new Error("Invalid project file format.");
                }

                const newImages = [];
                const newProcessedImages = [];

                for (const item of loadedImages) {
                    if (!item.id || !item.base64 || !item.mimeType) {
                        console.warn("Skipping invalid item in project file:", item);
                        continue;
                    }
                    const blob = base64ToBlob(item.base64, item.mimeType);
                    const previewUrl = URL.createObjectURL(blob);
                    const image = {
                        id: item.id,
                        previewUrl,
                        base64: item.base64,
                        mimeType: item.mimeType,
                    };
                    newImages.push(image);
                    newProcessedImages.push({
                        ...image,
                        faces: item.faces,
                        selectedFaceId: item.selectedFaceId,
                        status: item.status,
                        isManuallyAdjusted: item.isManuallyAdjusted,
                        faceDetectionFailed: item.faceDetectionFailed,
                        transitionToNext: item.transitionToNext,
                        textOverlay: item.textOverlay,
                    });
                }
                
                processedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
                setImages(newImages);
                setProcessedImages(newProcessedImages);
                localStorage.removeItem(STORAGE_KEY); // Clear auto-save after manual load
                setTimeout(() => window.location.reload(), 100); // Reload to ensure clean state
                
            } catch (error) {
                console.error("Failed to load project file:", error);
                alert("Could not load project file. It might be corrupted or in an invalid format.");
            }
        };
        reader.onerror = () => {
             alert("Error reading project file.");
        }
        reader.readAsText(file);
    }, [processedImages]);

    return React.createElement('div', { className: "min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8" },
        React.createElement('div', { className: "w-full max-w-7xl" },
            React.createElement('header', { className: "text-center mb-8" },
                React.createElement('h1', { className: "text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500" },
                    "Face Movie Creator"
                ),
                React.createElement('p', { className: "text-gray-400 mt-2 text-lg" },
                    "Upload your photos, select the star, and watch the magic unfold."
                )
            ),
            React.createElement('main', { className: "flex flex-col lg:flex-row gap-8" },
                React.createElement('div', { className: "lg:w-1/3 flex flex-col gap-8" },
                    React.createElement(ImageUploader, {
                        onImagesUploaded: handleImagesUploaded,
                        isProcessing: processing,
                        onSaveProject: handleSaveProject,
                        onLoadProject: handleLoadProject,
                        hasImages: processedImages.length > 0,
                    }),
                    React.createElement(ImageList, {
                        images: processedImages,
                        onReorder: handleReorderImages,
                        onRemove: handleRemoveImage,
                        onSelectFace: handleOpenFaceSelector,
                        onOpenAdjuster: handleOpenAdjuster,
                        onOpenTextEditor: handleOpenTextEditor,
                        onTransitionChange: handleTransitionChange,
                        isProcessing: processing,
                        processingProgress: processingProgress
                    })
                ),
                React.createElement('div', { className: "lg:w-2/3" },
                    React.createElement(MoviePreview, {
                        images: readyImages,
                        faceZoom: faceZoom,
                        onZoomChange: setFaceZoom,
                        faceVerticalOffset: faceVerticalOffset,
                        onVerticalOffsetChange: setFaceVerticalOffset,
                        faceAngleOffset: faceAngleOffset,
                        onAngleOffsetChange: setFaceAngleOffset
                    })
                )
            )
        ),
        imageToSelectFace && React.createElement(FaceSelectorModal, {
            image: imageToSelectFace,
            onSelectFace: handleSelectFace,
            onClose: () => setImageToSelectFace(null)
        }),
        adjustmentState && React.createElement(AdjustmentModal, {
            images: adjustmentState.images,
            startIndex: adjustmentState.startIndex,
            onSave: handleSaveAdjustmentAndProceed,
            onClose: () => setAdjustmentState(null)
        }),
        editingTextForImage && React.createElement(TextOverlayModal, {
            image: editingTextForImage,
            onSave: (overlay) => handleSaveTextOverlay(editingTextForImage.id, overlay),
            onRemove: () => handleSaveTextOverlay(editingTextForImage.id, null),
            onClose: () => setEditingTextForImage(null)
        })
    );
};

export default App;