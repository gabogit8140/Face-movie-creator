import React from 'react';
import { XIcon, GooglePhotosIcon, DownloadIcon } from './icons';

interface ImportGuideModalProps {
  onClose: () => void;
}

const ImportGuideModal: React.FC<ImportGuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-4">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <GooglePhotosIcon className="w-7 h-7 mr-3" />
            Easy Import from Google Photos
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="text-gray-300 space-y-6 mt-4">
            <p>
                A direct connection isn't possible in this simple app, but here’s the fastest way to import your photos in bulk:
            </p>

            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">1</div>
                <div>
                    <h3 className="font-semibold text-white">Open Google Photos & Select</h3>
                    <p className="text-sm text-gray-400">
                        Go to your Google Photos, find the person you want, and select all the pictures for your movie.
                    </p>
                    <a href="https://photos.google.com" target="_blank" rel="noopener noreferrer" className="text-sm text-purple-400 hover:underline mt-1 inline-block">
                        Open photos.google.com &rarr;
                    </a>
                </div>
            </div>

             <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">2</div>
                <div>
                    <h3 className="font-semibold text-white">Download as a .zip File</h3>
                    <p className="text-sm text-gray-400">
                        Click the 'More options' menu (three dots) in the top right, then click <span className="font-semibold">'Download'</span>. Google will save them all in a single `.zip` file.
                    </p>
                </div>
            </div>

            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">3</div>
                <div>
                    <h3 className="font-semibold text-white">Unzip the File</h3>
                    <p className="text-sm text-gray-400">
                        Find the downloaded file on your computer and extract it. This will create a folder containing all your selected images.
                    </p>
                </div>
            </div>

            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-lg">4</div>
                <div>
                    <h3 className="font-semibold text-white">Drag & Drop Here</h3>
                    <p className="text-sm text-gray-400">
                        Close this guide, then drag and drop the image files from the folder directly onto the upload area.
                    </p>
                </div>
            </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-700 flex justify-end">
            <button
                onClick={onClose}
                className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none"
            >
                Got It!
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImportGuideModal;
