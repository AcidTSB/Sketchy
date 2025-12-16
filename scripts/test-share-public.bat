@echo off
echo Installing ngrok globally...
npm install -g ngrok

echo.
echo Starting Web Viewer on port 3000...
start cmd /k "cd studio-share-viewer && pnpm dev"

timeout /t 5

echo.
echo Creating public tunnel...
ngrok http 3000

echo.
echo Copy the HTTPS URL (e.g., https://xxxx.ngrok.io)
echo Then update .env:
echo WEB_VIEWER_URL=https://xxxx.ngrok.io
pause
