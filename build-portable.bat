@echo off
TITLE Build for SharePoint
ECHO ========================================================
ECHO Building Portable Version...
ECHO ========================================================
ECHO.
ECHO This will create a single "Face-Movie.html" file that works anywhere.
ECHO.
call npx vite build --config vite.portable.ts
ECHO.
ECHO ========================================================
ECHO Build Complete!
ECHO ========================================================
ECHO.
ECHO I will now open the folder containing your portable file.
ECHO You can upload the "Face-Movie.html" file inside to SharePoint.
ECHO.
if exist "dist-portable\Face-Movie.html" del "dist-portable\Face-Movie.html"
ren "dist-portable\index.html" "Face-Movie.html"
explorer.exe dist-portable
PAUSE
