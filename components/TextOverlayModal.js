
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XIcon } from './icons.js';

const FONT_FAMILIES = ['Arial', 'Verdana', 'Georgia', 'Courier New', 'Impact', 'Comic Sans MS'];
const ANIMATIONS = ['none', 'fade', 'typewriter', 'slide-in', 'zoom-in'];

const TextOverlayModal = ({ image, onSave, onRemove, onClose }) => {
    const [text, setText] = useState(image.textOverlay?.text || 'Your Text Here');
    const [fontFamily, setFontFamily] = useState(image.textOverlay?.fontFamily || 'Arial');
    const [fontSize, setFontSize] = useState(image.textOverlay?.fontSize || 8); // % of height
    const [color, setColor] = useState(image.textOverlay?.color || '#FFFFFF');
    const [position, setPosition] = useState(image.textOverlay?.position || { x: 0.5, y: 0.85 });
    const [animation, setAnimation] = useState(image.textOverlay?.animation || 'fade');

    const previewContainerRef = useRef(null);
    const textRef = useRef(null);
    const dragStartPos = useRef(null);

    const handlePointerDown = (e) => {
        if (!textRef.current || !previewContainerRef.current) return;
        dragStartPos.current = {
            x: e.clientX,
            y: e.clientY,
            elementX: textRef.current.offsetLeft,
            elementY: textRef.current.offsetTop,
        };
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = useCallback((e) => {
        if (!dragStartPos.current || !previewContainerRef.current || !textRef.current) return;

        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        
        const rect = previewContainerRef.current.getBoundingClientRect();
        
        const newLeft = dragStartPos.current.elementX + dx;
        const newTop = dragStartPos.current.elementY + dy;
        
        const newX = Math.max(0, Math.min(rect.width, newLeft + textRef.current.offsetWidth / 2)) / rect.width;
        const newY = Math.max(0, Math.min(rect.height, newTop + textRef.current.offsetHeight / 2)) / rect.height;

        setPosition({ x: newX, y: newY });
    }, []);

    const handlePointerUp = useCallback((e) => {
        dragStartPos.current = null;
        if(e.target.hasPointerCapture(e.pointerId)) {
            e.target.releasePointerCapture(e.pointerId);
        }
    }, []);


    useEffect(() => {
        const moveHandler = (e) => handlePointerMove(e);
        const upHandler = (e) => handlePointerUp(e);

        if (dragStartPos.current) {
            document.addEventListener('pointermove', moveHandler);
            document.addEventListener('pointerup', upHandler);
            document.addEventListener('pointercancel', upHandler);
        }
        return () => {
            document.removeEventListener('pointermove', moveHandler);
            document.removeEventListener('pointerup', upHandler);
            document.removeEventListener('pointercancel', upHandler);
        };
    }, [dragStartPos.current, handlePointerMove, handlePointerUp]);

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
    
    const textStyle = {
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
    
    const controls = React.createElement('div', { className: "lg:w-1/3 flex flex-col gap-4" },
        React.createElement('div', { className: "flex justify-between items-center" },
            React.createElement('h2', { className: "text-2xl font-bold text-white" }, "Edit Text Overlay"),
            React.createElement('button', { onClick: onClose, className: "text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700" },
                React.createElement(XIcon, { className: "w-6 h-6" })
            )
        ),
        React.createElement('div', null,
            React.createElement('label', { htmlFor: "text-input", className: "block text-sm font-medium text-gray-300 mb-1" }, "Text"),
            React.createElement('textarea', { id: "text-input", value: text, onChange: e => setText(e.target.value), rows: 3, className: "w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5" })
        ),
        React.createElement('div', null,
            React.createElement('label', { htmlFor: "font-select", className: "block text-sm font-medium text-gray-300 mb-1" }, "Font"),
            React.createElement('select', { id: "font-select", value: fontFamily, onChange: e => setFontFamily(e.target.value), className: "w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5" },
                FONT_FAMILIES.map(font => React.createElement('option', { key: font, value: font, style: { fontFamily: font } }, font))
            )
        ),
        React.createElement('div', { className: "flex items-center gap-4" },
            React.createElement('div', { className: "flex-grow" },
                React.createElement('label', { htmlFor: "size-slider", className: "block text-sm font-medium text-gray-300 mb-1" }, "Size"),
                React.createElement('input', { id: "size-slider", type: "range", min: "1", max: "20", step: "0.5", value: fontSize, onChange: (e) => setFontSize(parseFloat(e.target.value)), className: "w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer range-thumb:bg-purple-500" })
            ),
            React.createElement('div', { className: "flex-shrink-0" },
                React.createElement('label', { htmlFor: "color-picker", className: "block text-sm font-medium text-gray-300 mb-1" }, "Color"),
                React.createElement('input', { id: "color-picker", type: "color", value: color, onChange: e => setColor(e.target.value), className: "w-12 h-10 p-1 bg-gray-700 border border-gray-600 rounded-lg cursor-pointer" })
            )
        ),
        React.createElement('div', null,
            React.createElement('label', { htmlFor: "anim-select", className: "block text-sm font-medium text-gray-300 mb-1" }, "Animation"),
            React.createElement('select', { id: "anim-select", value: animation, onChange: e => setAnimation(e.target.value), className: "w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5" },
                ANIMATIONS.map(anim => React.createElement('option', { key: anim, value: anim }, anim.charAt(0).toUpperCase() + anim.slice(1).replace('-', ' ')))
            )
        ),
        React.createElement('div', { className: "mt-auto pt-4 border-t border-gray-700 flex justify-between items-center gap-3" },
            React.createElement('button', { onClick: onRemove, disabled: !image.textOverlay, className: "px-4 py-2 text-sm font-medium rounded-md text-red-400 hover:bg-red-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent" },
                "Remove"
            ),
            React.createElement('button', { onClick: handleSave, className: "px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none" },
                "Save Text"
            )
        )
    );

    const preview = React.createElement('div', { className: "lg:w-2/3 flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden" },
        React.createElement('div', { ref: previewContainerRef, className: "relative w-full h-full" },
            React.createElement('img', { src: image.previewUrl, alt: "Text overlay preview", className: "w-full h-full object-contain" }),
            React.createElement('div', { ref: textRef, style: textStyle, onPointerDown: handlePointerDown },
                text || " "
            )
        )
    );
    
    return React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4", onClick: onClose },
        React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 max-w-5xl w-full flex flex-col lg:flex-row gap-6 max-h-[90vh]", onClick: e => e.stopPropagation() },
            controls,
            preview
        )
    );
};

export default TextOverlayModal;