# Sketchy

> **Ứng dụng quản lý dự án âm thanh chuyên nghiệp** - Tổ chức, phát nhạc, và chỉnh sửa audio một cách dễ dàng.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📖 Giới thiệu

**Sketchy** là ứng dụng desktop giúp bạn quản lý các dự án âm nhạc và audio một cách chuyên nghiệp. Dù bạn là nhạc sĩ, producer, podcaster hay đơn giản là người yêu thích âm nhạc - ứng dụng này sẽ giúp bạn tổ chức và làm việc với files audio hiệu quả hơn.

### ✨ Tính năng nổi bật

- 🎵 **Quản lý dự án** - Tổ chức audio files theo projects và folders
- 📁 **Import thông minh** - Hỗ trợ MP3, WAV, FLAC, và nhiều định dạng khác
- ▶️ **Phát nhạc tích hợp** - Player với waveform visualization đẹp mắt
- 🎚️ **Chỉnh sửa audio** - Điều chỉnh speed, pitch, volume, crossfade
- 🎤 **Tách stems AI** - Tách vocals, drums, bass, other từ bất kỳ bài hát nào
- 📊 **Thống kê & Analytics** - Theo dõi lượt nghe, tracks phổ biến
- 🏷️ **Tags & Notes** - Gắn nhãn và ghi chú cho từng track
- 💾 **Versioning** - Quản lý nhiều phiên bản của cùng một file
- 🔍 **Tìm kiếm nhanh** - Search toàn bộ thư viện bằng phím tắt
- 🌙 **Dark/Light mode** - Giao diện tối/sáng theo sở thích
- 🔒 **100% Offline** - Toàn bộ dữ liệu lưu trên máy, không cần internet

---

## 🚀 Cài đặt

### Windows

1. Tải file `Sketchy-Setup.exe` từ [Releases](https://github.com/yourrepo/releases)
2. Chạy installer và làm theo hướng dẫn
3. Mở ứng dụng từ Start Menu hoặc Desktop

### macOS

1. Tải file `Sketchy.dmg`
2. Kéo ứng dụng vào thư mục Applications
3. Mở từ Launchpad hoặc Applications folder

### Linux

1. Tải file `.AppImage` hoặc `.deb`
2. Cấp quyền thực thi: `chmod +x Sketchy.AppImage`
3. Chạy ứng dụng

### Yêu cầu hệ thống

- **OS**: Windows 10/11, macOS 10.15+, hoặc Linux (Ubuntu 20.04+)
- **RAM**: Tối thiểu 4GB (khuyến nghị 8GB cho tách stems)
- **Ổ cứng**: 500MB cho ứng dụng + dung lượng audio files của bạn
- **Python 3.8+**: Chỉ cần nếu dùng tính năng tách stems (AI)

---

## 📚 Hướng dẫn sử dụng

### 1️⃣ Tạo Project đầu tiên

1. Mở ứng dụng và đăng ký/đăng nhập tài khoản
2. Click nút **"New Project"** ở trang chủ
3. Nhập tên project (ví dụ: "Album Mùa Thu")
4. Thêm mô tả nếu muốn → Click **"Create"**

### 2️⃣ Import Audio Files

1. Vào project vừa tạo
2. Click nút **"Import Files"** hoặc kéo thả files vào cửa sổ
3. Chọn chế độ lưu trữ:
   - **Copy** ✅ (Khuyến nghị): App sao chép files vào thư mục riêng
   - **Reference**: App chỉ lưu đường dẫn đến file gốc
4. Chờ import hoàn tất

> 💡 **Mẹo**: Bạn có thể tạo folders để tổ chức tracks theo album, thể loại, v.v.

### 3️⃣ Phát nhạc

1. Click vào bất kỳ track nào trong danh sách
2. Trang Player sẽ mở với waveform đầy đủ
3. Sử dụng các nút điều khiển:
   - **Space**: Play/Pause
   - **←/→**: Tua 10 giây
   - **Shift+←/→**: Chuyển track
   - **M**: Tắt/bật tiếng
   - **↑/↓**: Tăng/giảm âm lượng

### 4️⃣ Chỉnh sửa Audio

Trong trang Player, bạn có thể:

- **Speed**: Thay đổi tốc độ phát (0.5x - 2x)
- **Pitch**: Điều chỉnh cao độ (-12 đến +12 semitones)
- **Equalizer**: 5 băng tần (bass, mid-bass, mid, mid-treble, treble)
- **Crossfade**: Chuyển đổi mượt mà giữa các track

### 5️⃣ Tách Stems (Vocal, Drums, Bass, Other)

> ⚠️ **Yêu cầu**: Cần cài đặt Python 3.8+ và Demucs (xem phần [Setup Stem Separation](#-setup-tính-năng-tách-stems) bên dưới)

1. Trong trang Player, click tab **"Stems"**
2. Click **"Split Stems"**
3. Chọn stems muốn tách (vocals, drums, bass, other)
4. Chọn stems nào muốn **lưu vĩnh viễn** vào database
5. Click **"Extract"** và đợi (có thể mất 2-5 phút)
6. Sau khi xong, bạn có thể:
   - Bật/tắt từng stem riêng lẻ
   - Điều chỉnh volume cho từng stem
   - Lưu stems thành tracks mới

### 6️⃣ Gắn Tags & Viết Notes

1. Click vào track → Chọn tab **"Notes & Tags"**
2. **Tags**: Click "+" để thêm tag (ví dụ: "Pop", "Remix", "Favorite")
3. **Notes**: Viết ghi chú cho track (lyrics, chord progression, v.v.)
4. **Checklist**: Tạo checklist công việc cho project

### 7️⃣ Chia sẻ Projects

1. Vào project muốn chia sẻ
2. Click nút **"Share"** → **"Create Share Link"**
3. Tùy chọn:
   - **Password**: Bảo vệ bằng mật khẩu
   - **Expiration**: Đặt thời hạn hết hạn
   - **Public/Private**: Ai cũng xem được hoặc chỉ có link
4. Copy link và gửi cho người khác

### 8️⃣ Xem Analytics

- **Profile Page**: Xem tổng lượt phát, tracks yêu thích, thống kê cá nhân
- **Project Dashboard**: Analytics chi tiết cho từng project
- **Popular Tracks**: Top tracks được nghe nhiều nhất

---

## 🔧 Setup Tính năng Tách Stems

Tính năng tách stems sử dụng AI model **Demucs** để phân tách audio thành 4 stems: vocals, drums, bass, và other. Để sử dụng tính năng này:

### Bước 1: Cài đặt Python

1. Tải Python 3.8+ từ [python.org](https://www.python.org/downloads/)
2. **Quan trọng**: Tích chọn "Add Python to PATH" khi cài đặt
3. Restart máy tính sau khi cài

### Bước 2: Cài đặt Demucs

**Cách 1: Dùng lệnh tự động (Windows)**

Mở PowerShell và chạy:

```powershell
cd "C:\Users\[TênBạn]\AppData\Local\Programs\Sketchy"
.\check-demucs.bat
```

Script sẽ tự động kiểm tra và hướng dẫn cài đặt.

**Cách 2: Cài thủ công**

Mở Command Prompt/Terminal và chạy:

```bash
# Cài PyTorch (CPU version - nhẹ hơn)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Cài Demucs
pip install demucs
```

### Bước 3: Kiểm tra

Trong ứng dụng:

1. Vào Settings → **Stem Separation**
2. Click **"Check Installation"**
3. Nếu thấy ✅ - Bạn đã sẵn sàng!

### ⚠️ Troubleshooting

**Lỗi: "Python not found"**

- Kiểm tra Python đã được thêm vào PATH chưa
- Restart máy tính
- Chạy lại `python --version` trong Command Prompt

**Lỗi: Error code 3221225477 (Windows)**

- Cài Visual C++ Redistributables: [Download tại đây](https://aka.ms/vs/17/release/vc_redist.x64.exe)
- Hoặc xem [STEM_SEPARATION_SETUP.md](STEM_SEPARATION_SETUP.md) để biết chi tiết

**Lỗi: Out of Memory**

- Đóng các ứng dụng khác
- Sử dụng audio files ngắn hơn (< 5 phút)
- Nâng cấp RAM lên 8GB+

---

## ⌨️ Phím tắt

### Player

- `Space` - Play/Pause
- `←/→` - Tua lại/tới 10 giây
- `Shift+←/→` - Track trước/sau
- `M` - Mute/Unmute
- `↑/↓` - Tăng/giảm volume
- `L` - Toggle loop
- `S` - Toggle shuffle

### Toàn cục

- `Ctrl/Cmd+K` - Mở tìm kiếm nhanh
- `Ctrl/Cmd+N` - Tạo project mới
- `Ctrl/Cmd+O` - Mở project
- `Ctrl/Cmd+I` - Import files
- `Ctrl/Cmd+,` - Mở Settings

---

## 🎨 Tùy chỉnh

### Theme & Giao diện

- **Settings → Appearance**
- Chọn Light/Dark mode hoặc Auto (theo hệ thống)
- Đổi accent color
- Điều chỉnh font size

### Audio Settings

- **Settings → Audio**
- Chọn output device
- Điều chỉnh buffer size (latency)
- Bật/tắt crossfade
- Đặt crossfade duration

### Thư viện & Storage

- **Settings → Library**
- Xem dung lượng đã dùng
- Chọn chế độ lưu trữ mặc định (Copy/Reference)
- Xóa cache để giải phóng dung lượng

---

## ❓ Câu hỏi thường gặp

**Q: Files audio của tôi được lưu ở đâu?**

A: Tùy thuộc vào chế độ lưu trữ:

- **Copy mode**: Files được copy vào thư mục app data:
  - Windows: `%APPDATA%/Sketchy/`
  - macOS: `~/Library/Application Support/Sketchy/`
  - Linux: `~/.config/Sketchy/`
- **Reference mode**: App chỉ lưu đường dẫn, file gốc vẫn ở vị trí ban đầu

**Q: Tôi có thể sync giữa nhiều máy không?**

A: Hiện tại chưa hỗ trợ. Tính năng cloud sync đang trong roadmap.

**Q: Ứng dụng có thu thập dữ liệu cá nhân không?**

A: Không. 100% dữ liệu lưu trên máy của bạn. Không có analytics tracking hay telemetry.

**Q: Tôi có thể export projects không?**

A: Có! Vào project → Menu → **Export** để tạo backup file `.zip`.

**Q: Làm sao để xóa toàn bộ dữ liệu?**

A: Settings → Advanced → **Reset All Data** (hoặc xóa thủ công folder app data ở trên)

---

## 🐛 Báo lỗi & Hỗ trợ

Nếu bạn gặp lỗi hoặc có câu hỏi:

1. **Kiểm tra logs**: Settings → Advanced → **View Logs**
2. **Tạo issue** trên GitHub với thông tin:
   - Mô tả lỗi chi tiết
   - Các bước để tái hiện lỗi
   - Screenshots/videos nếu có
   - Log files

📧 Email: support@sketchy.app
🌐 Website: [sketchy.app](https://sketchy.app)

---

## 🗺️ Roadmap

### Version 1.1 (Sắp ra mắt)

- ✅ Trim/Cut audio clips
- ✅ Batch export nhiều tracks cùng lúc
- ✅ VST/AU plugin support
- ⏳ Cloud sync (Google Drive, Dropbox)

### Version 2.0 (Trong tương lai)

- ⏳ Collaboration real-time
- ⏳ Mobile app (iOS/Android)
- ⏳ AI auto-tagging
- ⏳ Smart playlists

---

## 📄 License

MIT License - Xem [LICENSE](LICENSE) để biết chi tiết.

---

## 🙏 Credits

Được xây dựng với:

- [Electron](https://www.electronjs.org/) - Desktop framework
- [React](https://reactjs.org/) - UI library
- [Demucs](https://github.com/facebookresearch/demucs) - AI stem separation
- [WaveSurfer.js](https://wavesurfer-js.org/) - Waveform visualization
- [Tone.js](https://tonejs.github.io/) - Audio effects

---

<div align="center">
Made with ❤️ by Sketchy Team

⭐ Nếu thấy hữu ích, hãy star repo này!

</div>
