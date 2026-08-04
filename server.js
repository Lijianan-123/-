const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
app.use(express.json());
// 以仓库根目录作为静态文件目录，这样根目录下的 index.html 能被直接访问
app.use(express.static(path.join(__dirname)));

// POST /api/parse  -> 使用 yt-dlp -j 获取 metadata
app.post('/api/parse', (req, res) => {
  const url = req.body && req.body.url;
  if(!url) return res.status(400).send('缺少 url');
  const p = spawn('yt-dlp', ['-j', url]);
  let out = '', err = '';
  p.stdout.on('data', d => out += d.toString());
  p.stderr.on('data', d => err += d.toString());
  p.on('close', code => {
    if(code !== 0) return res.status(500).send(err || 'yt-dlp 解析失败');
    try {
      const info = JSON.parse(out);
      const short = {
        id: info.id, title: info.title, uploader: info.uploader,
        formats: (info.formats || []).map(f => ({
          format_id: f.format_id, format: f.format, ext: f.ext, filesize: f.filesize
        }))
      };
      res.json(short);
    } catch(e) {
      res.status(500).send('解析 yt-dlp 输出失败');
    }
  });
});

// GET /api/download?url=...&format=...
// 将 yt-dlp 输出流式转发到客户端（attachment）
app.get('/api/download', (req, res) => {
  const url = req.query.url;
  const format = req.query.format;
  if(!url) return res.status(400).send('缺少 url');

  // 若目标站点需要合并音视频，考虑使用 yt-dlp --recode-video / --merge-output-format 或先下载再合并
  const args = [];
  if(format) args.push('-f', format);
  else args.push('-f', 'best');
  // 以 stdout 输出
  args.push('-o', '-', url);

  const p = spawn('yt-dlp', args, { stdio: ['ignore','pipe','pipe'] });
  // 简单文件名
  const filename = 'video.mp4';
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  p.stdout.pipe(res);
  p.stderr.on('data', d => console.error('yt-dlp stderr:', d.toString()));
  p.on('close', code => {
    if(code !== 0) console.error('yt-dlp exit', code);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
