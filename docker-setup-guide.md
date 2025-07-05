# Docker Setup Guide for Testing

## 🐳 Installing Docker Desktop for Windows

### Step 1: Download Docker Desktop
1. Go to: https://www.docker.com/products/docker-desktop/
2. Click "Download for Windows"
3. Run the installer (`Docker Desktop Installer.exe`)

### Step 2: Installation Options
During installation, make sure to:
- ✅ **Enable WSL 2 integration**
- ✅ **Add shortcut to desktop** (optional)
- ✅ **Use WSL 2 instead of Hyper-V** (recommended)

### Step 3: After Installation
1. **Restart your computer** (required)
2. **Start Docker Desktop** from Windows Start Menu
3. **Wait for Docker to start** (may take a few minutes first time)
4. **Enable WSL integration**:
   - Open Docker Desktop
   - Go to Settings → Resources → WSL Integration
   - Enable integration with your WSL2 distro

### Step 4: Verify Installation
In your WSL2 terminal, run:
```bash
docker --version
docker run hello-world
```

## 🚀 Alternative: Quick Docker Installation Script

If you prefer command line installation:

```bash
# In WSL2 terminal:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

## 🎯 Once Docker is Ready

After Docker is installed and running, we'll use it to run tests:

```bash
# Navigate to API directory
cd "/mnt/c/Users/בית/Downloads/poe helper/api"

# Run tests in clean Linux environment
docker run --rm -v $(pwd):/app -w /app node:18-alpine sh -c "npm install && npm test"

# Or run specific test
docker run --rm -v $(pwd):/app -w /app node:18-alpine sh -c "npm install && npm test tests/unit/file-service.test.ts"
```

## 💡 Benefits of Docker Testing

- ✅ **Clean Linux environment** - No WSL2 issues
- ✅ **Consistent results** - Same environment every time  
- ✅ **Isolated testing** - Won't affect your system
- ✅ **Easy cleanup** - Container is removed after tests

## ⏱️ Expected Timeline

- **Download**: 5-10 minutes (depending on internet)
- **Installation**: 5-10 minutes
- **Setup**: 2-3 minutes
- **First test run**: 2-3 minutes (downloads Node.js image)
- **Subsequent runs**: 30-60 seconds

## 🔧 Troubleshooting

### If Docker Desktop won't start:
1. Check Windows Features: Turn on "Windows Subsystem for Linux" and "Virtual Machine Platform"
2. Update WSL2: `wsl --update` in PowerShell as Administrator
3. Restart computer again

### If WSL integration doesn't work:
1. Docker Desktop → Settings → Resources → WSL Integration
2. Enable for your specific WSL2 distribution
3. Restart WSL2: `wsl --shutdown` then reopen terminal

Let me know when Docker is installed and we'll run the tests!