# Image Proxy Server

A standalone Node.js/Express server that proxies image downloads to bypass CORS restrictions. This server downloads images server-side and forwards them to clients with appropriate headers.

## Features

- ✅ CORS bypass for image downloads
- ✅ Origin restriction (configurable via environment variables)
- ✅ URL validation and security checks
- ✅ File size limit (10MB)
- ✅ Content type validation
- ✅ 30-second request timeout
- ✅ Proper caching headers
- ✅ Error logging

## Prerequisites

- Node.js 18+ (or Node.js 16+ with fetch support)
- npm or yarn

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

**Important:** Make sure to set `ALLOWED_ORIGINS` in your `.env` file with your allowed domains before running the server.

## Development

Run the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

## Building for Production

Compile TypeScript to JavaScript:

```bash
npm run build
```

The compiled files will be in the `dist/` directory.

## Running in Production

After building, start the server:

```bash
npm start
```

Or use a process manager like PM2:

```bash
npm install -g pm2
pm2 start dist/server.js --name image-proxy
pm2 save
pm2 startup
```

## Usage

### Proxy an Image

```
GET /?url=<image_url>
```

**Example:**

```
http://localhost:3000/?url=https://example.com/image.jpg
```

### Health Check

```
GET /health
```

Returns: `{ "status": "ok" }`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# Allowed Origins (comma-separated list of allowed CORS origins)
# REQUIRED: Set this to your allowed domains
# Example: ALLOWED_ORIGINS=https://example.com,https://www.example.com
ALLOWED_ORIGINS=https://example.com,https://www.example.com

# Maximum file size in bytes (default: 10485760 = 10MB)
MAX_FILE_SIZE=10485760

# Request timeout in milliseconds (default: 30000 = 30 seconds)
REQUEST_TIMEOUT=30000
```

### Environment Variable Reference

- **`PORT`** (optional): Server port number. Defaults to `3000` if not set.

- **`ALLOWED_ORIGINS`** (required): Comma-separated list of allowed CORS origins. Only requests from these origins will be accepted. Example: `https://example.com,https://www.example.com`

- **`MAX_FILE_SIZE`** (optional): Maximum file size in bytes. Defaults to `10485760` (10MB).

- **`REQUEST_TIMEOUT`** (optional): Request timeout in milliseconds. Defaults to `30000` (30 seconds).

**Security Note:** The `ALLOWED_ORIGINS` environment variable is required. If not set, the server will reject all requests. Make sure to set this in your `.env` file before running the server.

## Deployment

### Linux Deployment

#### Option 1: Using PM2 (Recommended)

1. **SSH into your Linux server**

2. **Install Node.js** (if not already installed):

   ```bash
   # For Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # For CentOS/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
   sudo yum install -y nodejs
   ```

3. **Upload your project files** to the server (using SCP, SFTP, or Git):

   ```bash
   git clone <your-repo-url>
   cd <project-directory>
   ```

4. **Create and configure `.env` file**:

   ```bash
   cp .env.example .env
   nano .env  # Edit with your configuration
   ```

5. **Install dependencies**:

   ```bash
   npm install --production
   ```

6. **Build the project**:

   ```bash
   npm run build
   ```

7. **Install PM2 globally**:

   ```bash
   sudo npm install -g pm2
   ```

8. **Start the server with PM2**:

   ```bash
   pm2 start dist/server.js --name image-proxy
   pm2 save
   pm2 startup
   # Follow the instructions from pm2 startup to enable auto-start on boot
   ```

9. **Configure your web server** (Nginx/Apache) to proxy requests to the Node.js server:

   **Nginx example:**

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

#### Option 2: Using systemd

1. **Create a systemd service file** `/etc/systemd/system/image-proxy.service`:

   ```ini
   [Unit]
   Description=Image Proxy Server
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/path/to/proxy
   ExecStart=/usr/bin/node /path/to/proxy/dist/server.js
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production
   EnvironmentFile=/path/to/proxy/.env

   [Install]
   WantedBy=multi-user.target
   ```

2. **Enable and start the service**:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable image-proxy
   sudo systemctl start image-proxy
   ```

3. **Check status**:
   ```bash
   sudo systemctl status image-proxy
   ```

#### Option 3: Using Docker

1. **Create a Dockerfile**:

   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .
   RUN npm run build

   EXPOSE 3000

   CMD ["node", "dist/server.js"]
   ```

2. **Build and run**:
   ```bash
   docker build -t image-proxy .
   docker run -d -p 3000:3000 --env-file .env --name image-proxy image-proxy
   ```

### Windows Deployment

#### Option 1: Using PM2

1. **Install Node.js** from [nodejs.org](https://nodejs.org/)

2. **Open PowerShell or Command Prompt** and navigate to your project directory

3. **Create and configure `.env` file**:

   ```powershell
   Copy-Item .env.example .env
   notepad .env  # Edit with your configuration
   ```

4. **Install dependencies**:

   ```powershell
   npm install --production
   ```

5. **Build the project**:

   ```powershell
   npm run build
   ```

6. **Install PM2 globally**:

   ```powershell
   npm install -g pm2
   ```

7. **Start the server with PM2**:

   ```powershell
   pm2 start dist/server.js --name image-proxy
   pm2 save
   ```

8. **Configure PM2 to start on Windows boot** (see README section on Windows Task Scheduler)

#### Option 2: Using Windows Task Scheduler

1. **Follow steps 1-5 from PM2 option above**

2. **Create a batch file** `start-pm2.bat`:

   ```batch
   @echo off
   cd /d C:\path\to\your\proxy
   pm2 resurrect
   ```

3. **Create a scheduled task** in Windows Task Scheduler:
   - Trigger: "When the computer starts"
   - Action: Run the batch file
   - Run with highest privileges: Yes

#### Option 3: Using Windows Service (NSSM)

1. **Download NSSM** (Non-Sucking Service Manager) from [nssm.cc](https://nssm.cc/)

2. **Install as a service**:

   ```powershell
   nssm install ImageProxy "C:\Program Files\nodejs\node.exe" "C:\path\to\proxy\dist\server.js"
   nssm set ImageProxy AppDirectory "C:\path\to\proxy"
   nssm set ImageProxy AppEnvironmentExtra "NODE_ENV=production"
   nssm start ImageProxy
   ```

## Security Considerations

- **CORS Origin Restriction**: The server only accepts requests from origins specified in `ALLOWED_ORIGINS` environment variable. Make sure to configure this properly.
- **URL Validation**: The server only accepts HTTP/HTTPS URLs
- **File Size Limit**: File size is limited (configurable via `MAX_FILE_SIZE`, default: 10MB)
- **Content Type Validation**: Content type validation ensures only images are proxied
- **Request Timeout**: Request timeout prevents hanging requests (configurable via `REQUEST_TIMEOUT`, default: 30 seconds)
- **Environment Variables**: Sensitive configuration (like allowed origins) is stored in `.env` file, which is excluded from version control
- **Production Recommendations**:
  - Consider adding rate limiting in production
  - Consider adding authentication if needed
  - Regularly review and update allowed origins
  - Keep dependencies up to date

## Monitoring

- Check server logs: `pm2 logs image-proxy` (if using PM2)
- Check systemd logs: `sudo journalctl -u image-proxy -f`
- Health check endpoint: `GET /health`

## Troubleshooting

- **Port already in use**: Change the `PORT` environment variable
- **Permission denied**: Ensure the user running the process has proper permissions
- **Images not loading**: Check firewall settings and ensure the port is open
- **Timeout errors**: Increase the `REQUEST_TIMEOUT` environment variable if needed
- **403 Access Denied errors**: Make sure `ALLOWED_ORIGINS` is set correctly in your `.env` file

## License

ISC
