
import React from 'react';
import { XIcon, GooglePhotosIcon } from './icons.js';

const ImportGuideModal = ({ onClose }) => {
  return React.createElement('div', { className: "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4", onClick: onClose },
    React.createElement('div', { className: "bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 max-w-2xl w-full", onClick: e => e.stopPropagation() },
      React.createElement('div', { className: "flex justify-between items-center pb-4" },
        React.createElement('h2', { className: "text-2xl font-bold text-white flex items-center" },
          React.createElement(GooglePhotosIcon, { className: "w-7 h-7 mr-3" }),
          "Easy Import from Google Photos"
        ),
        React.createElement('button', { onClick: onClose, className: "text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700" },
          React.createElement(XIcon, { className: "w-6 h-6" })
        )
      ),
      React.createElement('div', { className: "text-gray-300 space-y-6 mt-4" },
        React.createElement('p', null,
          "A direct connection isn't possible in this simple app, but here’s the fastest way to import your photos in bulk:"
        ),
        React.createElement('div', { className: "flex items-start space-x-4" },
          React.createElement('div', { className: "flex-shrink-0 h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg" }, "1"),
          React.createElement('div', null,
            React.createElement('h3', { className: "font-semibold text-white" }, "Open Google Photos & Select"),
            React.createElement('p', { className: "text-sm text-gray-400" },
              "Go to your Google Photos, find the person you want, and select all the pictures for your movie."
            ),
            React.createElement('a', { href: "https://photos.google.com", target: "_blank", rel: "noopener noreferrer", className: "text-sm text-purple-400 hover:underline mt-1 inline-block" },
              "Open photos.google.com →"
            )
          )
        ),
        React.createElement('div', { className: "flex items-start space-x-4" },
          React.createElement('div', { className: "flex-shrink-0 h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg" }, "2"),
          React.createElement('div', null,
            React.createElement('h3', { className: "font-semibold text-white" }, "Download as a .zip File"),
            React.createElement('p', { className: "text-sm text-gray-400" },
              "Click the 'More options' menu (three dots) in the top right, then click ", React.createElement('span', { className: "font-semibold" }, "'Download'"), ". Google will save them all in a single `.zip` file."
            )
          )
        ),
        React.createElement('div', { className: "flex items-start space-x-4" },
          React.createElement('div', { className: "flex-shrink-0 h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg" }, "3"),
          React.createElement('div', null,
            React.createElement('h3', { className: "font-semibold text-white" }, "Unzip the File"),
            React.createElement('p', { className: "text-sm text-gray-400" },
              "Find the downloaded file on your computer and extract it. This will create a folder containing all your selected images."
            )
          )
        ),
        React.createElement('div', { className: "flex items-start space-x-4" },
          React.createElement('div', { className: "flex-shrink-0 h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg" }, "4"),
          React.createElement('div', null,
            React.createElement('h3', { className: "font-semibold text-white" }, "Drag & Drop Here"),
            React.createElement('p', { className: "text-sm text-gray-400" },
              "Close this guide, then drag and drop the image files from the folder directly onto the upload area."
            )
          )
        )
      ),
      React.createElement('div', { className: "mt-8 pt-4 border-t border-gray-700 flex justify-end" },
        React.createElement('button', {
          onClick: onClose,
          className: "px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none"
        },
          "Got It!"
        )
      )
    )
  );
};

export default ImportGuideModal;