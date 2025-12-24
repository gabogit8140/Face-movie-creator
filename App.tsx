import React, { useState, useCallback, useEffect, useRef } from 'react';
import { analyzeImageForFaces } from './services/geminiService';
import { saveToIndexedDB, loadFromIndexedDB } from './services/indexedDBService';
import { UploadedImage, ProcessedImage, Point, Face, TransitionStyle, TextOverlay } from './types';
import ImageUploader from './components/ImageUploader';
import ImageList from './components/ImageList';
import FaceSelectorModal from './components/FaceSelectorModal';
import MoviePreview from './components/MoviePreview';
import AdjustmentModal from './components/AdjustmentModal';
import TextOverlayModal from './components/TextOverlayModal';
import icon from './src/assets/icon.png';



const STORAGE_KEY = 'faceMovieProjectState_v2'; // Kept for backwards compatibility with localStorage fallback

const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};




const App: React.FC = () => {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
    const [processing, setProcessing] = useState<boolean>(false);
    const [processingProgress, setProcessingProgress] = useState<number | null>(null);
    const [imageToSelectFace, setImageToSelectFace] = useState<ProcessedImage | null>(null);
    const [editingTextForImage, setEditingTextForImage] = useState<ProcessedImage | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // New state for the sequential adjustment modal
    const [adjustmentState, setAdjustmentState] = useState<{ images: ProcessedImage[]; startIndex: number; } | null>(null);

    const [faceZoom, setFaceZoom] = useState(1.0);
    const [faceVerticalOffset, setFaceVerticalOffset] = useState(0);
    const [faceAngleOffset, setFaceAngleOffset] = useState(0);

    const readyImages = processedImages.filter(img => img.status === 'ready' && img.selectedFaceId !== undefined);
    const debounceTimeoutRef = useRef<number | null>(null);
    const isLoadingProjectRef = useRef(false);
    const processedImagesRef = useRef<ProcessedImage[]>(processedImages);

    // Load state from IndexedDB on initial mount
    useEffect(() => {
        const loadState = async () => {
            try {
                console.log('[INIT] Loading state from IndexedDB...');
                const savedState = await loadFromIndexedDB();

                if (savedState && savedState.images) {
                    console.log('[INIT] Found saved state with', savedState.images.length, 'images');
                    const newImages: UploadedImage[] = [];
                    const newProcessedImages: ProcessedImage[] = [];

                    for (const item of savedState.images) {
                        const blob = base64ToBlob(item.base64, item.mimeType);
                        const previewUrl = URL.createObjectURL(blob);
                        const image: UploadedImage = {
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
                } else {
                    console.log('[INIT] No saved state found');
                }
            } catch (error) {
                console.error("[INIT] Failed to load state from IndexedDB:", error);
            }
            setIsLoaded(true);
        };

        loadState();
    }, []);

    // Keep ref in sync with state
    useEffect(() => {
        processedImagesRef.current = processedImages;
    }, [processedImages]);

    // Save state to local storage on change (debounced)
    useEffect(() => {
        if (!isLoaded) return; // Don't save until initial state is loaded
        if (isLoadingProjectRef.current) return; // Don't save while loading a project

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = window.setTimeout(async () => {
            try {
                console.log('[AUTO-SAVE] Running auto-save check...', {
                    isLoading: isLoadingProjectRef.current,
                    imageCount: processedImages.length
                });

                // Don't overwrite existing data with empty data
                if (processedImages.length === 0) {
                    try {
                        const existing = await loadFromIndexedDB();
                        if (existing && existing.images && existing.images.length > 0) {
                            console.log('[AUTO-SAVE] Skipping: would overwrite existing data with empty array');
                            return;
                        }
                    } catch (e) {
                        // No existing data, proceed
                    }
                }

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
                console.log('[AUTO-SAVE] Saving to IndexedDB:', { imageCount: savableImages.length });
                await saveToIndexedDB(stateToSave);
            } catch (error) {
                console.error("[AUTO-SAVE] Failed to save state to IndexedDB:", error);
            }
        }, 500); // 500ms debounce

        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        }

    }, [processedImages, faceZoom, faceVerticalOffset, faceAngleOffset, isLoaded]);

    const processImages = useCallback(async (uploadedImages: UploadedImage[]) => {
        setProcessing(true);
        setProcessingProgress(0);
        const existingImageIds = new Set(processedImages.map(img => img.id));

        const imagesToProcess = uploadedImages.filter(img => !existingImageIds.has(img.id));

        const newProcessedImages: ProcessedImage[] = [];

        for (const [index, img] of imagesToProcess.entries()) {
            try {
                const faces = await analyzeImageForFaces(img.base64);

                if (faces.length > 0) {
                    const processedImg: ProcessedImage = {
                        ...img,
                        faces,
                        selectedFaceId: faces.length === 1 ? faces[0].id : undefined,
                        status: faces.length === 1 ? 'ready' : 'needs-selection',
                        faceDetectionFailed: false,
                    };
                    newProcessedImages.push(processedImg);
                } else {
                    // This handles the case where Gemini returns an empty array (no faces found)
                    console.warn('No faces detected for image:', img.id, "Creating a default face for manual adjustment.");
                    const defaultFace: Face = {
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
                // This handles API errors etc.
                console.error('Failed to process image with Gemini:', img.id, error);
                console.warn("Creating a default face for manual adjustment due to error.");
                const defaultFace: Face = {
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

    const handleImagesUploaded = (newImages: UploadedImage[]) => {
        const combinedImages = [...images, ...newImages];
        setImages(combinedImages);
        processImages(newImages);
    };

    const handleReorderImages = (reorderedImages: ProcessedImage[]) => {
        setProcessedImages(reorderedImages);
    };

    const handleSelectFace = (imageId: string, faceId: string) => {
        const updatedImages = processedImages.map(img =>
            img.id === imageId ? { ...img, selectedFaceId: faceId, status: 'ready' as const } : img
        );
        setProcessedImages(updatedImages);
        setImageToSelectFace(null);

        const nextNeedsSelection = updatedImages.find(p => p.status === 'needs-selection');
        if (nextNeedsSelection) {
            setImageToSelectFace(nextNeedsSelection);
        }
    };

    const handleRemoveImage = (imageId: string) => {
        setImages(images.filter(img => img.id !== imageId));
        setProcessedImages(processedImages.filter(img => img.id !== imageId));
    };

    const handleOpenFaceSelector = (image: ProcessedImage) => {
        setImageToSelectFace(image);
    };

    const handleOpenAdjuster = (imageId: string) => {
        const imageIndex = readyImages.findIndex(img => img.id === imageId);
        if (imageIndex !== -1) {
            setAdjustmentState({ images: readyImages, startIndex: imageIndex });
        }
    };

    const handleOpenTextEditor = (image: ProcessedImage) => {
        setEditingTextForImage(image);
    };

    const handleSaveTextOverlay = (imageId: string, overlay: TextOverlay | null) => {
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

    const handleSaveAdjustmentAndProceed = (imageId: string, faceId: string, newLandmarks: { left_pupil: Point; right_pupil: Point; }) => {
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

    const handleTransitionChange = (imageId: string, transition: TransitionStyle) => {
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
        a.download = `face-movie-project-${new Date().toISOString().slice(0, 10)}.FaceMovie`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [processedImages, faceZoom, faceVerticalOffset, faceAngleOffset]);

    const handleLoadProject = useCallback((file: File) => {
        if (processedImagesRef.current.length > 0) {
            if (!window.confirm("Loading a project will replace your current work. Are you sure?")) {
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonString = event.target?.result as string;
                const loadedData = JSON.parse(jsonString);

                let loadedImages: Omit<ProcessedImage, 'previewUrl' | 'file'>[] = [];

                // Handle versioning for backward compatibility
                if (loadedData.version === 2 && Array.isArray(loadedData.images)) {
                    loadedImages = loadedData.images;
                    const { settings } = loadedData;
                    if (settings) {
                        setFaceZoom(settings.faceZoom ?? 1.0);
                        setFaceVerticalOffset(settings.faceVerticalOffset ?? 0);
                        setFaceAngleOffset(settings.faceAngleOffset ?? 0);
                    }
                } else if (Array.isArray(loadedData)) {
                    // Legacy format: the root object is the array of images
                    loadedImages = loadedData;
                    setFaceZoom(1.0);
                    setFaceVerticalOffset(0);
                    setFaceAngleOffset(0);
                } else {
                    throw new Error("Invalid project file format.");
                }

                const newImages: UploadedImage[] = [];
                const newProcessedImages: ProcessedImage[] = [];

                for (const item of loadedImages) {
                    if (!item.id || !item.base64 || !item.mimeType) {
                        console.warn("Skipping invalid item in project file:", item);
                        continue;
                    }
                    const blob = base64ToBlob(item.base64, item.mimeType);
                    const previewUrl = URL.createObjectURL(blob);
                    const image: UploadedImage = {
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

                processedImagesRef.current.forEach(img => URL.revokeObjectURL(img.previewUrl));

                console.log('[LOAD] Setting blocking flag and loading', newProcessedImages.length, 'images');

                // Block auto-save BEFORE setting state to prevent race condition
                isLoadingProjectRef.current = true;

                setImages(newImages);
                setProcessedImages(newProcessedImages);

                // Save loaded project to IndexedDB AFTER state is set
                // Use a slight delay to ensure React has processed the state updates
                setTimeout(async () => {
                    try {
                        await saveToIndexedDB(loadedData);
                        console.log('[LOAD] Saved loaded project to IndexedDB');
                    } catch (error) {
                        console.error("[LOAD] Failed to save loaded project to IndexedDB:", error);
                    } finally {
                        isLoadingProjectRef.current = false;
                        console.log('[LOAD] Re-enabled auto-save');
                    }
                }, 100);

            } catch (error) {
                console.error("Failed to load project file:", error);
                alert("Could not load project file. It might be corrupted or in an invalid format.");
            }
        };
        reader.onerror = () => {
            alert("Error reading project file.");
        }
        reader.readAsText(file);
    }, []);




    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-7xl">
                <header className="text-center mb-8 flex flex-col items-center">
                    <div className="flex flex-row items-center gap-4 mb-4">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg bg-black">
                            <img
                                src={icon}
                                alt="Face Movie Creator Logo"
                                className="w-full h-full object-cover transform scale-[1.5] hover:scale-[1.6] transition-transform duration-300"
                                onError={(e) => {
                                    console.error("Image failed to load", e);
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                            Face Movie Creator
                        </h1>
                    </div>
                    <p className="text-gray-400 mt-2 text-lg">
                        Upload your photos, select the star, and watch the magic unfold.
                    </p>
                </header>

                <main className="flex flex-col lg:flex-row gap-8">
                    <div className="lg:w-1/3 flex flex-col gap-8">
                        <ImageUploader
                            onImagesUploaded={handleImagesUploaded}
                            isProcessing={processing}
                            onSaveProject={handleSaveProject}
                            onLoadProject={handleLoadProject}
                            hasImages={processedImages.length > 0}
                        />
                        <ImageList
                            images={processedImages}
                            onReorder={handleReorderImages}
                            onRemove={handleRemoveImage}
                            onSelectFace={handleOpenFaceSelector}
                            onOpenAdjuster={handleOpenAdjuster}
                            onOpenTextEditor={handleOpenTextEditor}
                            onTransitionChange={handleTransitionChange}
                            isProcessing={processing}
                            processingProgress={processingProgress}
                        />
                    </div>
                    <div className="lg:w-2/3">
                        <MoviePreview
                            images={readyImages}
                            faceZoom={faceZoom}
                            onZoomChange={setFaceZoom}
                            faceVerticalOffset={faceVerticalOffset}
                            onVerticalOffsetChange={setFaceVerticalOffset}
                            faceAngleOffset={faceAngleOffset}
                            onAngleOffsetChange={setFaceAngleOffset}
                        />
                    </div>
                </main>
            </div>
            {imageToSelectFace && (
                <FaceSelectorModal
                    image={imageToSelectFace}
                    onSelectFace={handleSelectFace}
                    onClose={() => setImageToSelectFace(null)}
                />
            )}
            {adjustmentState && (
                <AdjustmentModal
                    images={adjustmentState.images}
                    startIndex={adjustmentState.startIndex}
                    onSave={handleSaveAdjustmentAndProceed}
                    onClose={() => setAdjustmentState(null)}
                />
            )}
            {editingTextForImage && (
                <TextOverlayModal
                    image={editingTextForImage}
                    onSave={(overlay) => handleSaveTextOverlay(editingTextForImage.id, overlay)}
                    onRemove={() => handleSaveTextOverlay(editingTextForImage.id, null)}
                    onClose={() => setEditingTextForImage(null)}
                />
            )}
        </div>
    );
};

export default App;