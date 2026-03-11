# s3man

> A modern, cross-platform desktop application for managing S3 buckets. Browse, upload, and organize your cloud storage with a native, intuitive interface.

Built with [Tauri](https://tauri.app) + React + TypeScript for a fast, lightweight, and secure experience.

![s3man screenshot](screenshot.png)

---

## Why s3man?

- **Native Desktop Experience** — No browser tabs, no AWS Console complexity. A dedicated app that feels like part of your OS.
- **Multiple S3 Connections** — Save and instantly switch between different S3-compatible services (AWS, MinIO, Wasabi, DigitalOcean Spaces, etc.)
- **Lightning Fast** — Built with Rust and Tauri for minimal resource usage and instant startup.
- **Privacy First** — Your credentials are stored locally on your machine. No data leaves your computer except to your S3 provider.

---

## Features

| Feature | Description |
|---------|-------------|
| 🔌 **Multiple Connections** | Save unlimited S3 connections with custom names. Switch between them instantly. |
| 📁 **File Browser** | Navigate folders with breadcrumbs, view file sizes, modification dates, and metadata. |
| ⬆️ **Upload Files** | Drag & drop or select files to upload. Supports multiple files at once. |
| 📂 **Create Folders** | Create new directories directly in the UI without manual S3 operations. |
| 🔄 **Refresh Sync** | One-click refresh to sync with the latest bucket state. |
| ⌨️ **Keyboard Shortcuts** | Press `Ctrl/Cmd + B` to toggle the sidebar for more space. |
| 🎨 **Native Feel** | Frameless window design that blends with your desktop environment. |
| 🌓 **Light & Dark Mode** | Automatic theme detection or manual selection. |

---

## System Requirements

| Platform | Minimum Version |
|----------|----------------|
| **Windows** | Windows 10 or later |
| **macOS** | macOS 10.13 (High Sierra) or later |
| **Linux** | Ubuntu 18.04+, Fedora 30+, or any distro with GTK3 and WebKit2GTK 4.1 |

---

## Installation

### Download Pre-built Binaries

Get the latest release for your platform from the [Releases page](../../releases):

| Platform | Download |
|----------|----------|
| **Windows** | `.msi` (Recommended) or `.exe` installer |
| **macOS** | `.dmg` (drag to Applications) or `.app` bundle |
| **Ubuntu/Debian** | `.deb` package |
| **Fedora/RHEL** | `.rpm` package |
| **Arch Linux** | Install from AUR: `yay -S s3man` or `paru -S s3man` |

### Quick Install (Linux)

```bash
# Debian/Ubuntu
wget https://github.com/sarrietav-dev/s3man/releases/latest/download/s3man_amd64.deb
sudo dpkg -i s3man_amd64.deb

# Fedora/RHEL
wget https://github.com/sarrietav-dev/s3man/releases/latest/download/s3man.x86_64.rpm
sudo rpm -i s3man.x86_64.rpm

# Arch (AUR)
yay -S s3man
```

---

## Getting Started

### 1. First Launch

After installation, launch s3man. You'll see a clean interface with an empty connection list.

### 2. Add Your First S3 Connection

1. Click the **+** button next to "Connections" in the sidebar
2. Enter your connection details:
   - **Name**: A friendly name (e.g., "My AWS Bucket", "Company Backups")
   - **Endpoint**: Your S3 endpoint URL
     - AWS: `https://s3.amazonaws.com` or region-specific like `https://s3.us-east-1.amazonaws.com`
     - MinIO: `http://localhost:9000` (or your server URL)
   - **Region**: Your S3 region (e.g., `us-east-1`, `eu-west-1`)
   - **Access Key ID**: Your S3 access key
   - **Secret Access Key**: Your S3 secret key
   - **Bucket Name**: (Optional) Default bucket to open
3. Click **Save**

### 3. Browse Your Buckets

- Click on a connection in the sidebar to view its buckets
- Click on a bucket to browse its contents
- Use the breadcrumbs to navigate back up

### 4. Upload Files

- **Drag & Drop**: Drag files from your file manager directly into the s3man window
- **Button**: Click the **Upload** button and select files
- Files are uploaded to the current folder/bucket

### 5. Create Folders

Click the **New Folder** button and enter a name. In S3, folders are prefixes, and s3man handles this automatically.

---

## Supported S3 Providers

s3man works with any S3-compatible storage service:

- ✅ **Amazon S3**
- ✅ **MinIO** (self-hosted)
- ✅ **Wasabi**
- ✅ **DigitalOcean Spaces**
- ✅ **Linode Object Storage**
- ✅ **Vultr Object Storage**
- ✅ **Cloudflare R2**
- ✅ **Backblaze B2** (via S3-compatible API)
- ✅ **IBM Cloud Object Storage**
- ✅ Any other S3-compatible service

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Toggle sidebar |
| `Ctrl/Cmd + R` | Refresh current view |
| `Delete` | Delete selected item(s) |
| `F5` | Refresh current view |

---

## FAQ

**Q: Is my data secure?**  
A: Yes. Your S3 credentials are stored locally on your machine using your OS's secure keychain. No data is sent anywhere except directly to your configured S3 provider.

**Q: Can I use multiple AWS accounts?**  
A: Absolutely! You can save as many connections as you need, each with different credentials and endpoints.

**Q: Does it support S3-compatible services like MinIO?**  
A: Yes, s3man works with any S3-compatible storage. Just enter your custom endpoint URL when adding a connection.

**Q: Is there a mobile app?**  
A: Currently, s3man is desktop-only (Windows, macOS, Linux).

**Q: How do I update the app?**  
A: The app will notify you when updates are available. You can also download the latest version from the [Releases page](../../releases).

---

## Troubleshooting

### App won't start on Linux

**Problem**: Missing dependencies  
**Solution**: Install WebKit2GTK and GTK3:
```bash
# Debian/Ubuntu
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0

# Fedora
sudo dnf install webkit2gtk4.1 gtk3

# Arch
sudo pacman -S webkit2gtk-4.1 gtk3
```

### Connection fails

**Problem**: Unable to connect to S3  
**Solution**: 
- Verify your endpoint URL is correct (include `https://`)
- Check your access key and secret key
- Ensure your bucket name doesn't have typos
- Check if your S3 provider requires a specific region format

### Files not appearing

**Problem**: Bucket shows empty  
**Solution**: Click the **Refresh** button or press `Ctrl/Cmd + R` to reload the current view.

---

## Development

Want to contribute or build from source? See the [Contributing Guide](CONTRIBUTING.md) for setup instructions.

### Quick Start (Developers)

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run dist
```

---

## License

[MIT](LICENSE) © Sebastian Arrieta

---

## Support

- 🐛 **Bug Reports**: [Open an issue](../../issues)
- 💡 **Feature Requests**: [Open an issue](../../issues)
- 💬 **Discussions**: [GitHub Discussions](../../discussions)

---

<p align="center">
  Made with ❤️ using <a href="https://tauri.app">Tauri</a>
</p>
