gcloud auth login
gcloud config set project cse4265-2024-101481573

gcloud app deploy

gcloud app deploy desktop-service.yaml
gcloud app deploy mobile-service.yaml

https://desktop-service-dot-cse4265-2024-101481573.lm.r.appspot.com/video/cdn/bigbuckbunny.mpd
https://mobile-service-dot-cse4265-2024-101481573.lm.r.appspot.com/video/cdn/bigbuckbunny.mpd

https://34.8.170.186/video/desktop/video/cdn/bigbuckbunny.mpd
https://34.8.170.186/video/mobile/video/cdn/bigbuckbunny.mpd

https://34.8.170.186/video/cdn/bigbuckbunny.mpd

curl -I -k https://34.8.170.186/video/cdn/bigbuckbunny.mpd -H "Device-Type: mobile"
curl -I -k https://34.8.170.186/video/cdn/bigbuckbunny.mpd -H "Device-Type: desktop"



# 创建目标文件夹
mkdir -p hfr_dash_video
mkdir -p sfr_dash_video

# 解压文件到指定文件夹
tar -xzvf hfr_dash_video.tar.gz -C hfr_dash_video/
tar -xzvf sfr_dash_video.tar.gz -C sfr_dash_video/
