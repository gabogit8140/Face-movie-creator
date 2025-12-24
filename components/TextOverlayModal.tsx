import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ProcessedImage, TextOverlay, Point, TextAnimation } from '../types';
import { XIcon } from './icons';

interface TextOverlayModalProps {
  image: ProcessedImage;
  onSave: (overlay: TextOverlay) => void;
  onRemove: () => void;
  onClose: () => void;
}

const FONT_FAMILIES = ['Arial', 'Verdana', 'Georgia', 'Courier New', 'Impact', 'Comic Sans MS'];
const ANIMATIONS: TextAnimation[] = ['none', 'fade', 'typewriter', 'slide-in', 'zoom-in'];
const FONT_PREVIEW_TEXT = "Ag";

const TextOverlayModal: React.FC<TextOverlayModalProps> = ({ image, onSave, onRemove, onClose }) => {
    const [text, setText] = useState(image.textOverlay?.text || 'Your Text Here');
    const [fontFamily, setFontFamily] = useState(image.textOverlay?.fontFamily || 'Arial');
    const [fontSize, setFontSize] = useState(image.textOverlay?.fontSize || 8); // % of height
    const [color, setColor] = useState(image.textOverlay?.color || '#FFFFFF');
    const [position, setPosition] = useState<Point>(image.textOverlay?.position || { x: 0.5, y: 0.85 });
    const [animation, setAnimation] = useState<TextAnimation>(image.textOverlay?.animation || 'fade');

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef<{ x: number, y: number, elementX: number, elementY: number } | null>(null);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!textRef.current || !previewContainerRef.current) return;
        dragStartPos.current = {
            x: e.clientX,
            y: e.clientY,
            elementX: textRef.current.offsetLeft,
            elementY: textRef.current.offsetTop,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!dragStartPos.current || !previewContainerRef.current) return;

        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        
        const rect = previewContainerRef.current.getBoundingClientRect();
        
        const newLeft = dragStartPos.current.elementX + dx;
        const newTop = dragStartPos.current.elementY + dy;
        
        const newX = Math.max(0, Math.min(rect.width, newLeft + textRef.current!.offsetWidth/2)) / rect.width;
        const newY = Math.max(0, Math.min(rect.height, newTop + textRef.current!.offsetHeight/2)) / rect.height;

        setPosition({ x: newX, y: newY });
    }, []);

    const handlePointerUp = useCallback((e: PointerEvent) => {
        dragStartPos.current = null;
        if(document.body.hasPointerCapture(e.pointerId)) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        }
    }, []);


    useEffect(() => {
        if (dragStartPos.current) {
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
            document.addEventListener('pointercancel', handlePointerUp);
        }
        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [handlePointerMove, handlePointerUp]);

    const handleSave = () => {
        onSave({
            id: image.textOverlay?.id || `text-${Date.now()}`,
            text,
            fontFamily,
            fontSize,
            color,
            position,
            animation,
        });
    };
    
    const textStyle: React.CSSProperties = {
        fontFamily,
        fontSize: `${fontSize / 100 * (previewContainerRef.current?.clientHeight || 0)}px`,
        color,
        position: 'absolute',
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        whiteSpace: 'pre-wrap',
        textAlign: 'center',
        textShadow: '0 2px 4px rgba(0,0,0,0.7)',
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none'
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 max-w-5xl w-full flex flex-col lg:flex-row gap-6 max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="lg:w-1/3 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                         <h2 className="text-2xl font-bold text-white">Edit Text Overlay</h2>
                         <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700">
                             <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div>
                        <label htmlFor="text-input" className="block text-sm font-medium text-gray-300 mb-1">Text</label>
                        <textarea id="text-input" value={text} onChange={e => setText(e.target.value)} rows={3} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5"/>
                    </div>
                    <div>
                        <label htmlFor="font-select" className="block text-sm font-medium text-gray-300 mb-1">Font</label>
                        <select id="font-select" value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5">
                            {FONT_FAMILIES.map(font => <option key={font} value={font} style={{fontFamily: font}}>{font}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex-grow">
                             <label htmlFor="size-slider" className="block text-sm font-medium text-gray-300 mb-1">Size</label>
                            <input id="size-slider" type="range" min="1" max="20" step="0.5" value={fontSize} onChange={(e) => setFontSize(parseFloat(e.target.value))} className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-thumb:bg-purple-500"/>
                        </div>
                         <div className="flex-shrink-0">
                             <label htmlFor="color-picker" className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                            <input id="color-picker" type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer"/>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="anim-select" className="block text-sm font-medium text-gray-300 mb-1">Animation</label>
                        <select id="anim-select" value={animation} onChange={e => setAnimation(e.target.value as TextAnimation)} className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5">
                            {ANIMATIONS.map(anim => <option key={anim} value={anim}>{anim.charAt(0).toUpperCase() + anim.slice(1).replace('-', ' ')}</option>)}
                        </select>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-700 flex justify-between items-center gap-3">
                        <button onClick={onRemove} disabled={!image.textOverlay} className="px-4 py-2 text-sm font-medium rounded-md text-red-400 hover:bg-red-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                            Remove
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none">
                            Save Text
                        </button>
                    </div>
                </div>
                <div className="lg:w-2/3 flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden">
                    <div ref={previewContainerRef} className="relative w-full h-full">
                         <img src={image.previewUrl} alt="Text overlay preview" className="w-full h-full object-contain" />
                         <div ref={textRef} style={textStyle} onPointerDown={handlePointerDown}>
                             {text || " "}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TextOverlayModal;