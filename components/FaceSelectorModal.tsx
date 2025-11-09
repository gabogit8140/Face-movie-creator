
import React, { useRef, useEffect, useState } from 'react';
import { ProcessedImage, Face } from '../types';

interface FaceSelectorModalProps {
  image: ProcessedImage;
  onSelectFace: (imageId: string, faceId: string) => void;
  onClose: () => void;
}

const FaceSelectorModal: React.FC<FaceSelectorModalProps> = ({ image, onSelectFace, onClose }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (imgRef.current) {
        const { naturalWidth, clientWidth } = imgRef.current;
        setScale(naturalWidth / clientWidth);
      }
    };

    const currentImgRef = imgRef.current;
    if (currentImgRef) {
        currentImgRef.addEventListener('load', updateScale);
        window.addEventListener('resize', updateScale);
        updateScale(); // Initial scale
    }
    
    return () => {
      if (currentImgRef) {
        currentImgRef.removeEventListener('load', updateScale);
      }
      window.removeEventListener('resize', updateScale);
    };
  }, [image.previewUrl]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Select the main character</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <p className="text-gray-400 mb-6">Click on the face you want to focus on for the movie.</p>
        <div className="relative inline-block">
          <img ref={imgRef} src={image.previewUrl} alt="Select face" className="max-w-full max-h-[70vh] rounded-md" />
          {image.faces.map((face) => {
            const boxStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${face.box.x * 100}%`,
              top: `${face.box.y * 100}%`,
              width: `${face.box.width * 100}%`,
              height: `${face.box.height * 100}%`,
              border: '3px solid #f87171',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(248, 113, 113, 0.7)',
              transition: 'all 0.2s ease-in-out',
            };

            return (
              <div
                key={face.id}
                style={boxStyle}
                className="hover:border-purple-400 hover:scale-105 hover:shadow-purple-400/70"
                onClick={() => onSelectFace(image.id, face.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FaceSelectorModal;
