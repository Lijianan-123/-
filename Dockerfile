# 基于官方 node 镜像，安装 ffmpeg 与 python3 + yt-dlp
FROM node:18-slim

# 安装系统依赖（ffmpeg, python3, pip）
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-pip ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# 安装 yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

WORKDIR /app
# 复制应用
COPY package.json package.json
RUN npm install --production
COPY . .

EXPOSE 3000
CMD ["npm","start"]
