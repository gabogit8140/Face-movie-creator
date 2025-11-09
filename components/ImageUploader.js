import React, { useCallback, useState, useRef } from 'react';
import { UploadIcon, DownloadIcon, FolderOpenIcon } from './icons.js';

const ImageUploader = ({ onImagesUploaded, isProcessing, onSaveProject, onLoadProject, hasImages }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('Reading Files...');
  const loadInputRef = useRef(null);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to read file as base64'));
        }
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setUploadProgress(0);
    setUploadStatus('Reading Files...');
    const newImages = [];

    for (let i = 0; i < fileList.length; i++) {
        let file = fileList[i];
        
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
        
        if (isHeic) {
            try {
                setUploadStatus(`Converting ${file.name}...`);
                const conversionResult = await heic2any({
                    blob: file,
                    toType: "image/jpeg",
                    quality: 0.92,
                });
                const convertedBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
                file = new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
            } catch (error) {
                console.error(`Failed to convert HEIC file ${file.name}:`, error);
                alert(`Could not convert HEIC file: ${file.name}. It might be a format that is not supported (e.g. HEVC-encoded video).`);
                setUploadProgress(Math.round(((i + 1) / fileList.length) * 100));
                continue; // Skip to the next file
            }
        }
        
        if (!file.type.startsWith('image/')) {
            console.warn(`Skipping non-image file: ${file.name}`);
            setUploadProgress(Math.round(((i + 1) / fileList.length) * 100));
            continue;
        }
        
        setUploadStatus(`Processing ${file.name}...`);
        try {
            const base64 = await fileToBase64(file);
            newImages.push({
                id: `image-${Date.now()}-${i}`,
                file,
                previewUrl: URL.createObjectURL(file),
                base64,
                mimeType: file.type,
            });
        } catch (error) {
            console.error(`Failed to process file ${file.name}:`, error);
        }
        setUploadProgress(Math.round(((i + 1) / fileList.length) * 100));
    }


    if (newImages.length > 0) {
      onImagesUploaded(newImages);
    }

    setTimeout(() => {
        setUploadProgress(null);
    }, 1000);

  }, [onImagesUploaded]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleLoadClick = () => {
    loadInputRef.current?.click();
  };

  const handleFileLoad = (e) => {
      const file = e.target.files?.[0];
      if (file) {
          onLoadProject(file);
      }
      e.target.value = '';
  };

  return React.createElement('div', { className: "bg-gray-800 p-6 rounded-lg shadow-lg" },
    React.createElement('h2', { className: "text-xl font-semibold mb-4 text-white" }, "1. Add Photos & Manage Project"),
    React.createElement('div', null,
        uploadProgress !== null ? (
            React.createElement('div', { className: "text-center px-6 py-8" },
                React.createElement('p', { className: "text-lg font-semibold text-gray-300 truncate px-4" }, uploadStatus),
                React.createElement('div', { className: "w-full bg-gray-700 rounded-full h-2.5 my-3" },
                    React.createElement('div', {
                        className: "bg-purple-600 h-2.5 rounded-full transition-all duration-200",
                        style: { width: `${uploadProgress}%` }
                    })
                ),
                React.createElement('p', { className: "text-sm font-mono text-gray-400" }, `${uploadProgress}%`)
            )
        ) : (
            React.createElement('label', {
                onDragEnter: handleDragEnter,
                onDragLeave: handleDragLeave,
                onDragOver: handleDragOver,
                onDrop: handleDrop,
                className: `flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-md cursor-pointer transition-colors duration-200
                    ${isDragging ? 'border-purple-400 bg-gray-700' : 'border-gray-600 hover:border-purple-400'}`
                },
                React.createElement('div', { className: "text-center" },
                    React.createElement(UploadIcon, { className: "mx-auto h-12 w-12 text-gray-400" }),
                    React.createElement('p', { className: "mt-2 text-sm text-gray-400" },
                        React.createElement('span', { className: "font-semibold text-purple-400" }, "Click to upload"), " or drag and drop"
                    ),
                    React.createElement('p', { className: "text-xs text-gray-500" }, "Add more photos at any time"),
                    React.createElement('input', {
                        id: "file-upload",
                        name: "file-upload",
                        type: "file",
                        multiple: true,
                        className: "sr-only",
                        accept: "image/*,.heic,.heif",
                        onChange: e => handleFiles(e.target.files),
                        disabled: isProcessing || uploadProgress !== null
                    })
                )
            )
        )
    ),
    React.createElement('div', { className: "mt-4 pt-4 border-t border-gray-700 flex flex-col sm:flex-row gap-3" },
        React.createElement('button', { onClick: handleLoadClick, disabled: isProcessing, className: "flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-600 text-sm font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed" },
            React.createElement(FolderOpenIcon, { className: "w-5 h-5 mr-2" }), " Load Project"
        ),
        React.createElement('input', { type: "file", accept: ".FaceMovie", ref: loadInputRef, onChange: handleFileLoad, className: "hidden" }),
        React.createElement('button', { onClick: onSaveProject, disabled: !hasImages || isProcessing, className: "flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 disabled:bg-gray-500 disabled:cursor-not-allowed" },
            React.createElement(DownloadIcon, { className: "w-5 h-5 mr-2" }), " Download Project"
        )
    )
  );
};

export default ImageUploader;