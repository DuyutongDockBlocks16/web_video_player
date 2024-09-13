#!/bin/bash

timestamp="$(date +%s)"

ffmpeg \
-i demo.mp4 \
\
-filter_complex "split=3[s0][s1][s2];[s0]scale=1280x720[s0];[s1]scale=640x480[s1];[s2]scale=640x360[s2]" \
\
-c:v:0 libx264 \
\
-b:v:0 5000k \
-b:v:1 2500k \
-b:v:2 1000k \
\
-g 120 -keyint_min 120 -sc_threshold 0 \
\
-c:a copy \
\
-map [s0] -map [s1] -map [s2] \
-map 0:a:0 \
\
-use_timeline 1 \
-use_template 1 \
-adaptation_sets 'id=0,seg_duration=4.000,streams=v id=1,seg_duration=4.000,streams=a' \
-media_seg_name 'chunk-stream_$RepresentationID$-$Number%05d$.$ext$' \
-init_seg_name 'init-stream_$RepresentationID$.$ext$' \
-f dash ./manifest.mpd
