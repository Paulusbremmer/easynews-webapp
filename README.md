# Easynews Web App

A powerful, self-hosted web interface and streaming proxy for Easynews. It allows you to search the Usenet global premium search, apply advanced filters (size, date, runtime, poster, filename), and instantly stream or cast video content securely using a direct VLC proxy architecture.

![UI Screenshot](https://raw.githubusercontent.com/Paulusbremmer/easynews-webapp/main/screenshot.png) <!-- Optional: Add a screenshot if you like -->

## Features
- **Advanced Search:** Search by Subject/NZB Name natively.
- **Filters:** Filter results by Uploader (Poster), internal Filename, minimum File Size, Date, and video Runtime.
- **VLC 1-Click Playback:** Instantly open files in your local VLC Media Player (Windows, iOS, Android) for flawless hardware-accelerated playback.
- **Smart Proxying:** Uses a backend proxy that safely handles seeking, persistent connections, and securely hides your Easynews credentials.
- **Reverse Proxy Ready:** Built-in internal routing so it works perfectly behind Nginx Proxy Manager and custom domains.

## Project Structure
The project is split into two halves:
1. `/frontend` - A responsive React (Vite) single-page application.
2. `/backend` - A Node.js Express server that interfaces with the Easynews API and proxies media streams.

---

## Installation & Setup

### 1. Backend Setup
1. Open the `/backend` folder.
2. Run `npm install`
3. Create a `.env` file in the `/backend` folder with your credentials:
```env
EASYNEWS_USER=your_username
EASYNEWS_PASS=your_password
```
4. Start the backend:
```bash
node index.js
```
The backend runs on `http://127.0.0.1:3002` by default.

### 2. Frontend Setup
1. Open the `/frontend` folder.
2. Run `npm install`
3. Start the Vite development server (or build for production):
```bash
npm run dev
```
The frontend runs on `http://127.0.0.1:3001` by default. It automatically proxies all backend API calls (like `/api`, `/stream`, `/vlc-proxy`) to the backend server.

### Reverse Proxy (Nginx)
If you are putting this behind a reverse proxy (e.g., Nginx Proxy Manager):
1. Point your domain (e.g., `easynews.yourdomain.com`) to port `3001` (the frontend).
2. Ensure you have added your custom domain to `server.allowedHosts` inside `/frontend/vite.config.js` to prevent DNS rebinding blocks.
3. You do **not** need to expose port `3002`; the frontend server will internally proxy requests to the backend for you.

## Systemd Setup (Linux)
You can set both up to run continuously in the background using `systemd` user services. Examples are often located in `~/.config/systemd/user/`.

## License
MIT License.
