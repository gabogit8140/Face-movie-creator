import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PlayIcon, PauseIcon, DownloadIcon, UploadIcon } from './icons.js';

const RESOLUTIONS = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
};

const DURATION_PER_IMAGE = 2000; // ms
const TRANSITION_DURATION = 500; // ms

const MoviePreview = ({ 
    images, 
    faceZoom, 
    onZoomChange,
    faceVerticalOffset,
    onVerticalOffsetChange,
    faceAngleOffset,
    onAngleOffsetChange
}) => {
    const canvasRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [videoUrl, setVideoUrl] = useState(null);
    const [exportFormat, setExportFormat] = useState('webm');
    const [resolution, setResolution] = useState('720p');
    
    const animationFrameId = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    const imageElements = useRef(new Map());

    const [currentTime, setCurrentTime] = useState(0);
    const animationStartTimeRef = useRef(0);
    const pausedTimeRef = useRef(0);

    const totalDuration = images.length > 0 ? images.length * DURATION_PER_IMAGE : 0;
    
    const isMp4Supported = MediaRecorder.isTypeSupported('video/mp4; codecs=avc1');

    useEffect(() => {
        // Preload images
        images.forEach(img => {
            if (!imageElements.current.has(img.id)) {
                const imageEl = new Image();
                imageEl.src = img.previewUrl;
                imageElements.current.set(img.id, imageEl);
            }
        });
        // When images change, reset timeline
        setCurrentTime(0);
        pausedTimeRef.current = 0;
        setIsPlaying(false);
    }, [images]);

    const drawFrame = useCallback((frameTime) => {
        const canvas = canvasRef.current;
        if (!canvas || images.length < 1) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clamp time to be within valid range
        const time = Math.max(0, Math.min(frameTime, totalDuration));

        let imageIndex = Math.floor(time / DURATION_PER_IMAGE); 
        imageIndex = Math.min(imageIndex, images.length - 1);

        const timeIntoImage = time - (imageIndex * DURATION_PER_IMAGE);
        const nextImageIndex = imageIndex + 1;

        const isTransitioning = timeIntoImage > DURATION_PER_IMAGE - TRANSITION_DURATION && nextImageIndex < images.length;
        const transitionProgress = isTransitioning ? (timeIntoImage - (DURATION_PER_IMAGE - TRANSITION_DURATION)) / TRANSITION_DURATION : 0;
        const kenBurnsProgress = timeIntoImage / DURATION_PER_IMAGE;

        // Easing function for smoother animations
        const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const easedProgress = ease(transitionProgress);

        const drawTextOverlay = (img, timeIntoImage) => {
            if (!img.textOverlay) return;
            const overlay = img.textOverlay;
            
            const TEXT_ANIM_DURATION = 400;
            const TEXT_HOLD_DURATION = 300;
            const maxTextTime = DURATION_PER_IMAGE - TRANSITION_DURATION;

            let textOpacity = 1;
            let animProgress = 1;

            if (timeIntoImage < TEXT_ANIM_DURATION) {
                animProgress = timeIntoImage / TEXT_ANIM_DURATION;
                textOpacity = animProgress;
            } else if (timeIntoImage > maxTextTime - TEXT_ANIM_DURATION) {
                const timeFromEnd = maxTextTime - timeIntoImage;
                animProgress = Math.max(0, timeFromEnd / TEXT_ANIM_DURATION);
                textOpacity = animProgress;
            }

            if (isTransitioning) textOpacity = 0;
            if (textOpacity <= 0) return;

            let textToDraw = overlay.text;
             if (overlay.animation === 'typewriter') {
                const animStartTime = TEXT_ANIM_DURATION;
                const animEndTime = maxTextTime - TEXT_ANIM_DURATION - TEXT_HOLD_DURATION;
                const animDuration = animEndTime - animStartTime;

                if (animDuration > 0 && timeIntoImage > animStartTime) {
                    const progress = (timeIntoImage - animStartTime) / animDuration;
                    const charsToShow = Math.floor(overlay.text.length * Math.min(1, progress));
                    textToDraw = overlay.text.substring(0, charsToShow);
                } else if (timeIntoImage <= animStartTime) {
                    textToDraw = "";
                }
            }
            
            if (!textToDraw) return;
            
            ctx.save();
            ctx.globalAlpha = textOpacity;
            ctx.fillStyle = overlay.color;
            ctx.font = `${overlay.fontSize / 100 * canvas.height}px ${overlay.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            const textX = overlay.position.x * canvas.width;
            const textY = overlay.position.y * canvas.height;

            const easeOutQuint = (x) => 1 - Math.pow(1 - x, 5);
            const easedAnimProgress = easeOutQuint(animProgress);
            
            const isAnimatingIn = timeIntoImage < maxTextTime - TEXT_ANIM_DURATION;

            if (overlay.animation === 'slide-in' && isAnimatingIn) {
                const slideOffset = (1 - easedAnimProgress) * -50;
                ctx.fillText(textToDraw, textX + slideOffset, textY);
            } else if (overlay.animation === 'zoom-in' && isAnimatingIn) {
                const scale = 0.8 + 0.2 * easedAnimProgress;
                ctx.translate(textX, textY);
                ctx.scale(scale, scale);
                ctx.fillText(textToDraw, 0, 0);
            } else {
                ctx.fillText(textToDraw, textX, textY);
            }
            ctx.restore();
        };

        const drawImageCentered = (
            img, 
            opacity,
            transform
        ) => {
            const imageEl = imageElements.current.get(img.id);
            if (!imageEl || !imageEl.complete || imageEl.naturalWidth === 0) return;
    
            const face = img.faces.find(f => f.id === img.selectedFaceId);
            if (!face) return;
            
            const naturalW = imageEl.naturalWidth;
            const naturalH = imageEl.naturalHeight;
    
            const leftPupil = { x: face.landmarks.left_pupil.x * naturalW, y: face.landmarks.left_pupil.y * naturalH };
            const rightPupil = { x: face.landmarks.right_pupil.x * naturalW, y: face.landmarks.right_pupil.y * naturalH };
    
            const pupilDist = Math.sqrt(Math.pow(rightPupil.x - leftPupil.x, 2) + Math.pow(rightPupil.y - leftPupil.y, 2));
            const TARGET_PUPIL_DISTANCE = (canvas.width * 0.15) * faceZoom;
            
            const baseScaleFactor = pupilDist > 0 ? TARGET_PUPIL_DISTANCE / pupilDist : 1;
            const finalScale = baseScaleFactor * (transform?.scale ?? 1);
            const finalPan = transform?.pan ?? { x: 0, y: 0 };
            
            const pupilCenter = { x: (leftPupil.x + rightPupil.x) / 2, y: (leftPupil.y + rightPupil.y) / 2 };
            const pupilAngle = Math.atan2(rightPupil.y - leftPupil.y, rightPupil.x - leftPupil.x);
    
            const TARGET_CENTER = { x: canvas.width / 2, y: canvas.height * 0.4 + faceVerticalOffset };
            
            ctx.save();
            ctx.globalAlpha = opacity;
            
            ctx.translate(TARGET_CENTER.x, TARGET_CENTER.y);
            
            const imgIdx = images.findIndex(i => i.id === img.id);
            ctx.rotate(Math.sin(imgIdx) * 0.05);
    
            ctx.rotate(-pupilAngle + (faceAngleOffset * Math.PI / 180));
            ctx.scale(finalScale, finalScale);
            ctx.translate(-pupilCenter.x + finalPan.x, -pupilCenter.y + finalPan.y);
    
            const borderSize = Math.max(naturalW, naturalH) * 0.015;
            ctx.fillStyle = 'white';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;
            ctx.fillRect(-borderSize, -borderSize, naturalW + 2 * borderSize, naturalH + 2 * borderSize);
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
    
            ctx.drawImage(imageEl, 0, 0);
            ctx.restore();
        };

        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const pileOpacity = isTransitioning ? Math.max(0, 1 - (transitionProgress * 2)) : 1;
        if (pileOpacity > 0) {
            ctx.save();
            ctx.globalAlpha = pileOpacity;
            const pileCount = Math.min(imageIndex, 3);
            for(let i = 1; i <= pileCount; i++) {
                const prevIndex = imageIndex - i;
                 if(images[prevIndex]) {
                    drawImageCentered(images[prevIndex], 0.2 - i*0.05);
                }
            }
            ctx.restore();
        }

        const currentImage = images[imageIndex];
        const nextImage = images[nextImageIndex];
        const transitionStyle = currentImage.transitionToNext || 'crossfade';
        
        if (!isTransitioning) {
            if (transitionStyle === 'ken-burns') {
                const transform = {
                    scale: 1 + 0.1 * kenBurnsProgress,
                    pan: { x: (imageIndex % 2 === 0 ? 1 : -1) * 20 * kenBurnsProgress, y: 0 }
                };
                drawImageCentered(currentImage, 1, transform);
            } else {
                drawImageCentered(currentImage, 1);
            }
        } else if (nextImage) {
            switch(transitionStyle) {
                case 'ken-burns':
                case 'crossfade':
                    const endTransform = (transitionStyle === 'ken-burns') ? { scale: 1.1, pan: {x: (imageIndex % 2 === 0 ? 1 : -1) * 20, y: 0} } : undefined;
                    drawImageCentered(currentImage, 1 - transitionProgress, endTransform);
                    drawImageCentered(nextImage, transitionProgress);
                    break;
                case 'slide':
                    drawImageCentered(currentImage, 1);
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(0, 0, canvas.width, canvas.height);
                    ctx.clip();
                    ctx.translate(canvas.width * (1 - easedProgress), 0);
                    drawImageCentered(nextImage, 1);
                    ctx.restore();
                    break;
                case 'zoom':
                    drawImageCentered(nextImage, 1);
                    const scale = 1 + 1 * easedProgress;
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(scale, scale);
                    ctx.translate(-canvas.width / 2, -canvas.height / 2);
                    drawImageCentered(currentImage, 1 - transitionProgress);
                    ctx.restore();
                    break;
            }
        } else {
            drawImageCentered(currentImage, 1);
        }
        
        drawTextOverlay(currentImage, timeIntoImage);

    }, [images, faceZoom, faceVerticalOffset, faceAngleOffset, totalDuration]);
    
    const runAnimation = useCallback((now) => {
        if (!animationStartTimeRef.current) {
            animationStartTimeRef.current = now;
        }
        const elapsedTime = now - animationStartTimeRef.current;
        const newTime = pausedTimeRef.current + elapsedTime;

        if (newTime >= totalDuration) {
            setCurrentTime(totalDuration);
            setIsPlaying(false);
        } else {
            setCurrentTime(newTime);
            animationFrameId.current = requestAnimationFrame(runAnimation);
        }
    }, [totalDuration]);

    useEffect(() => {
        if (isPlaying) {
            animationFrameId.current = requestAnimationFrame(runAnimation);
        } else {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
        }
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isPlaying, runAnimation]);

    useEffect(() => {
        if (images.length > 0) {
            drawFrame(currentTime);
        } else {
            // Clear canvas if no images
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [currentTime, drawFrame, images]);


    const handlePlayPause = () => {
        if (images.length > 0) {
            const newIsPlaying = !isPlaying;
            if (newIsPlaying) {
                if (currentTime >= totalDuration && totalDuration > 0) {
                    // If at the end, restart from the beginning
                    setCurrentTime(0);
                    pausedTimeRef.current = 0;
                } else {
                    pausedTimeRef.current = currentTime;
                }
                animationStartTimeRef.current = performance.now();
            }
            setIsPlaying(newIsPlaying);
        }
    };

    const handleScrub = (e) => {
        const newTime = parseInt(e.target.value, 10);
        if (isPlaying) {
            setIsPlaying(false);
        }
        setCurrentTime(newTime);
        pausedTimeRef.current = newTime;
    };

    const formatTime = (ms) => {
        if (isNaN(ms) || ms < 0) return '0:00';
        const totalSeconds = Math.floor(ms / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const generateVideo = useCallback((format) => new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            resolve();
            return;
        }
        
        const mimeType = format === 'webm' ? 'video/webm; codecs=vp9' : 'video/mp4';
        const stream = canvas.captureStream(30);
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
        recordedChunksRef.current = [];

        let recordAnimationId = null;
        
        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
            setVideoUrl(URL.createObjectURL(blob));
            setIsGenerating(false);
            if (recordAnimationId) cancelAnimationFrame(recordAnimationId);
            resolve();
        };
        
        mediaRecorderRef.current.start();
        
        const startTime = performance.now();
        const videoTotalDuration = images.length * DURATION_PER_IMAGE;

        const recordStep = (now) => {
            const elapsedTime = now - startTime;
            setGenerationProgress(Math.round((elapsedTime / videoTotalDuration) * 100));
            if (elapsedTime < videoTotalDuration) {
                drawFrame(elapsedTime);
                recordAnimationId = requestAnimationFrame(recordStep);
            } else {
                drawFrame(videoTotalDuration);
                mediaRecorderRef.current?.stop();
            }
        };
        recordAnimationId = requestAnimationFrame(recordStep);
    }), [images, drawFrame]);

    const generateGif = useCallback(() => new Promise(async (resolve) => {
        const canvas = canvasRef.current;
        const gif = new GIF({
            workers: 2,
            quality: 10,
            workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
        });

        gif.on('finished', (blob) => {
            setVideoUrl(URL.createObjectURL(blob));
            setIsGenerating(false);
            setGenerationProgress(0);
            resolve();
        });

        gif.on('progress', (p) => {
            setGenerationProgress(50 + Math.round(p * 50));
        });

        const gifTotalDuration = images.length * 2000;
        const frameDelay = 100; // 10 FPS
        const frameCount = gifTotalDuration / frameDelay;

        for (let i = 0; i < frameCount; i++) {
            const time = i * frameDelay;
            drawFrame(time);
            gif.addFrame(canvas, { copy: true, delay: frameDelay });
            setGenerationProgress(Math.round((i / frameCount) * 50));
            if (i % 10 === 0) {
                await new Promise(res => setTimeout(res, 0));
            }
        }
        gif.render();
    }), [images, drawFrame]);

    const handleGenerateExport = async () => {
        if (isGenerating || images.length < 2) return;
        
        setIsGenerating(true);
        setVideoUrl(null);
        setGenerationProgress(0);
        if(isPlaying) setIsPlaying(false);

        // Reset to start for generation
        setCurrentTime(0);
        pausedTimeRef.current = 0;
        await new Promise(res => setTimeout(res, 50)); // allow canvas to draw frame 0

        if (exportFormat === 'gif') {
            await generateGif();
        } else {
            await generateVideo(exportFormat);
        }
    };
    
    return React.createElement('div', { className: "bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg" },
        React.createElement('h2', { className: "text-xl font-semibold mb-4 text-white" }, "3. Preview & Download"),
        React.createElement('div', { className: "aspect-video w-full bg-gray-900 rounded-md overflow-hidden relative" },
            React.createElement('canvas', { ref: canvasRef, width: RESOLUTIONS[resolution].width, height: RESOLUTIONS[resolution].height, className: "w-full h-full" }),
            images.length === 0 && !isGenerating && (
                React.createElement('div', { className: "absolute inset-0 flex flex-col items-center justify-center text-center text-gray-400 p-4" },
                    React.createElement(UploadIcon, { className: "w-16 h-16 text-gray-500 mb-4" }),
                    React.createElement('h3', { className: "text-xl font-semibold text-gray-300" }, "Your Movie Preview"),
                    React.createElement('p', { className: "mt-1" }, "Add photos and select faces to see your movie here.")
                )
            ),
            !isPlaying && images.length > 0 && !isGenerating && React.createElement('div', { className: "absolute inset-0 bg-black/50 flex items-center justify-center" },
                React.createElement('button', { onClick: handlePlayPause, className: "text-white bg-purple-600 rounded-full p-4 hover:bg-purple-700 transition" },
                    React.createElement(PlayIcon, { className: "w-10 h-10" })
                )
            )
        ),
        React.createElement('div', { className: 'mt-4' },
            React.createElement('input', {
                type: 'range',
                min: '0',
                max: totalDuration,
                value: currentTime,
                onChange: handleScrub,
                disabled: isGenerating || images.length < 1,
                className: 'w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-purple-500 [&::-moz-range-thumb]:bg-purple-500 disabled:opacity-50',
                'aria-label': 'Movie timeline'
            }),
            React.createElement('div', { className: 'flex justify-between text-xs font-mono text-gray-400 mt-1 px-1' },
                React.createElement('span', null, formatTime(currentTime)),
                React.createElement('span', null, formatTime(totalDuration))
            )
        ),
        React.createElement('div', { className: "mt-4 border-t border-gray-700 pt-6 space-y-4" },
            React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('label', { htmlFor: "zoom-slider", className: "text-sm font-medium text-gray-300 w-28 whitespace-nowrap" }, "Face Size"),
                React.createElement('input', { id: "zoom-slider", type: "range", min: "0.1", max: "2.5", step: "0.1", value: faceZoom, onChange: (e) => onZoomChange(parseFloat(e.target.value)), className: "w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-purple-500 [&::-moz-range-thumb]:bg-purple-500", disabled: isGenerating }),
                React.createElement('span', { className: "text-sm font-mono text-gray-400 w-12 text-center" }, `${faceZoom.toFixed(1)}x`)
            ),
            React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('label', { htmlFor: "vertical-offset-slider", className: "text-sm font-medium text-gray-300 w-28 whitespace-nowrap" }, "Vertical Position"),
                React.createElement('input', { id: "vertical-offset-slider", type: "range", min: "-100", max: "100", step: "1", value: faceVerticalOffset, onChange: (e) => onVerticalOffsetChange(parseInt(e.target.value, 10)), className: "w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-purple-500 [&::-moz-range-thumb]:bg-purple-500", disabled: isGenerating }),
                React.createElement('span', { className: "text-sm font-mono text-gray-400 w-12 text-center" }, `${faceVerticalOffset}px`)
            ),
            React.createElement('div', { className: "flex items-center gap-4" },
                React.createElement('label', { htmlFor: "rotation-slider", className: "text-sm font-medium text-gray-300 w-28 whitespace-nowrap" }, "Rotation"),
                React.createElement('input', { id: "rotation-slider", type: "range", min: "-20", max: "20", step: "1", value: faceAngleOffset, onChange: (e) => onAngleOffsetChange(parseInt(e.target.value, 10)), className: "w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-purple-500 [&::-moz-range-thumb]:bg-purple-500", disabled: isGenerating }),
                React.createElement('span', { className: "text-sm font-mono text-gray-400 w-12 text-center" }, `${faceAngleOffset}°`)
            )
        ),
        React.createElement('div', { className: "mt-6 flex flex-col sm:flex-row gap-4 items-center" },
            React.createElement('button', { onClick: handlePlayPause, disabled: images.length < 1 || isGenerating, className: "flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed" },
                isPlaying ? React.createElement(PauseIcon, { className: "w-5 h-5 mr-2" }) : React.createElement(PlayIcon, { className: "w-5 h-5 mr-2" }),
                isPlaying ? 'Pause' : 'Preview'
            ),
            React.createElement('div', { className: "flex-grow w-full sm:w-auto" },
                React.createElement('label', { htmlFor: "resolution-select", className: "sr-only" }, "Resolution"),
                React.createElement('select', { id: "resolution-select", value: resolution, onChange: e => setResolution(e.target.value), disabled: isGenerating, className: "w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5" },
                    React.createElement('option', { value: "720p" }, "HD (1280x720)"),
                    React.createElement('option', { value: "1080p" }, "Full HD (1920x1080)")
                )
            ),
            React.createElement('div', { className: "flex-grow w-full sm:w-auto" },
                React.createElement('label', { htmlFor: "format-select", className: "sr-only" }, "Export Format"),
                React.createElement('select', { id: "format-select", value: exportFormat, onChange: e => setExportFormat(e.target.value), disabled: isGenerating, className: "w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5" },
                    React.createElement('option', { value: "webm" }, "WebM Video"),
                    React.createElement('option', { value: "mp4", disabled: !isMp4Supported }, `MP4 Video ${!isMp4Supported ? "(Not Supported)" : ""}`),
                    React.createElement('option', { value: "gif" }, "Animated GIF")
                )
            )
        ),
        React.createElement('div', { className: "mt-4" },
            React.createElement('button', { onClick: handleGenerateExport, disabled: isGenerating || images.length < 2, className: "w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed" },
                isGenerating ? `Generating... ${generationProgress > 0 ? `${generationProgress}%` : ''}` : `Generate .${exportFormat}`
            )
        ),
        isGenerating && React.createElement('div', { className: "mt-4 text-center text-gray-300" },
            React.createElement('div', { className: "w-full bg-gray-700 rounded-full h-2.5 mb-2" },
                React.createElement('div', { className: "bg-purple-600 h-2.5 rounded-full", style: { width: `${generationProgress}%`, transition: 'width 0.1s' } })
            ),
            React.createElement('p', null, `Creating your masterpiece... This will take about ${Math.round(images.length * 2)} seconds.`),
            exportFormat === 'gif' && React.createElement('p', { className: "text-sm text-gray-400" }, "GIFs can take longer. Please be patient.")
        ),
        videoUrl && React.createElement('div', { className: "mt-6 p-4 bg-gray-700 rounded-lg" },
            React.createElement('h3', { className: "font-semibold text-lg text-green-400" }, "Your movie is ready!"),
            React.createElement('div', { className: "mt-2 flex items-center gap-4" },
                exportFormat === 'gif' ?
                    React.createElement('img', { src: videoUrl, alt: "Generated animated GIF", className: "w-1/2 rounded-md" }) :
                    React.createElement('video', { src: videoUrl, controls: true, className: "w-1/2 rounded-md" }),
                React.createElement('a', {
                    href: videoUrl,
                    download: `face_movie.${exportFormat}`,
                    className: "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800"
                },
                    React.createElement(DownloadIcon, { className: "w-5 h-5 mr-2" }),
                    `Download .${exportFormat}`
                )
            )
        )
    );
};

export default MoviePreview;