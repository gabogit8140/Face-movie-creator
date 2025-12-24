# Face Movie Creator

This application creates a dynamic video slideshow from user-uploaded photos. It uses the Gemini API to intelligently detect faces in each photo, allowing the app to center and transition between them smoothly. The result is a "face movie" effect, reminiscent of Picasa's classic feature.

Users can upload images, reorder them, select the primary face in photos with multiple people, manually fine-tune the eye positions for perfect alignment, and add text overlays. The final movie can be previewed and exported as a WebM, MP4, or animated GIF file.

## Features

- **AI-Powered Face Detection:** Uses the Gemini API to automatically find faces and key landmarks (pupils) in uploaded photos.
- **Interactive Face Selection:** For photos with multiple people, users can click to select the main character.
- **Manual Pupil Adjustment:** A powerful modal allows users to fine-tune the exact pupil locations for perfect Ken Burns-style transitions.
- **Drag & Drop Interface:** Easily upload and reorder photos.
- **Customizable Transitions:** Choose from Crossfade, Slide, Zoom, and Ken Burns effects for each image.
- **Text Overlays:** Add, position, and style text on each photo with simple animations.
- **Live Preview:** Instantly see how your movie will look with an interactive timeline.
- **Project Management:** Save your current project (including all images and settings) to a `.FaceMovie` file, and load it back later.
- **Auto-Save:** Your session is automatically saved to your browser's local storage, so you can pick up where you left off.
- **Multiple Export Formats:** Download your final creation as a high-quality WebM/MP4 video or an animated GIF.

## Local Development

To run this project on your local machine, follow these steps.

1.  **Prerequisites:**
    - [Node.js](https://nodejs.org/) (version 18 or newer recommended)
    - An API key for the Gemini API.

2.  **Installation:**
    - Clone this repository to your local machine.
    - Open a terminal in the project root and install the necessary dependencies:
      ```bash
      npm install
      ```

3.  **Environment Setup:**
    - The application requires a Gemini API key. You need to make this key available as an environment variable. The easiest way is to create a file named `.env.local` in the project root:
      ```
      VITE_API_KEY=YOUR_GEMINI_API_KEY
      ```
    - Replace `YOUR_GEMINI_API_KEY` with your actual key. Vite will automatically load this variable.

4.  **Running the Development Server:**
    - Start the Vite development server:
      ```bash
      npm run dev
      ```
    - Open your web browser and navigate to the local address provided in the terminal (usually `http://localhost:5173`).

## Deployment to GitHub Pages

You can easily deploy this application for free using GitHub Pages.

### Manual Deployment

1.  **Set Repository Name in `vite.config.js`:**
    - Open the `vite.config.js` file.
    - Find the `base` property. Its value should be the name of your GitHub repository, enclosed in slashes (e.g., `'/Your-Repo-Name/'`).
    - **Important:** This must match your repository name exactly for the deployed site to work correctly.

2.  **Build the Application:**
    - Run the build script. This will compile the application into a static `dist` folder.
      ```bash
      npm run build
      ```

3.  **Deploy to `gh-pages`:**
    - Run the deploy script, which will push the contents of the `dist` folder to a special branch named `gh-pages` in your repository.
      ```bash
      npm run deploy
      ```

4.  **Configure GitHub Repository:**
    - Go to your repository settings on GitHub.
    - Navigate to the "Pages" section in the left sidebar.
    - Under "Build and deployment," set the **Source** to **Deploy from a branch**.
    - Set the **Branch** to `gh-pages` with the folder as `/ (root)`.
    - Save the changes. Your site will be live at the provided URL in a few minutes.

### Automated Deployment (Recommended)

This repository includes a GitHub Actions workflow that automates the entire deployment process.

1.  **Set Repository Name in `vite.config.js`:**
    - Just like in the manual process, ensure the `base` property in `vite.config.js` matches your repository name. Commit and push this change.

2.  **Push to `main`:**
    - Simply push your changes to the `main` branch.
      ```bash
      git push origin main
      ```
    - The GitHub Action will automatically trigger, build your project, and deploy it to the `gh-pages` branch. You can monitor its progress in the "Actions" tab of your repository.

3.  **Configure GitHub Repository (First Time Only):**
    - The first time you deploy, you still need to configure your repository settings to serve from the `gh-pages` branch as described in step 4 of the manual process. After this initial setup, every subsequent push to `main` will automatically update your live site.
