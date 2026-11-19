# HLS fixture

Tiny VOD playlist with two MPEG-TS segments (64×64 H.264 + AAC, 1 s each), same layout as WB CDN.
Segments use the `.mpegts` extension so TypeScript tooling does not treat them as `.ts` sources;
MSW serves them under the playlist's `0.ts` / `1.ts` names.

Regenerate:

```bash
ffmpeg -f lavfi -i testsrc=size=64x64:rate=10 -f lavfi -i sine=frequency=440:sample_rate=22050 -t 2 \
  -c:v libx264 -profile:v baseline -pix_fmt yuv420p -g 10 -c:a aac -b:a 32k \
  -f hls -hls_time 1 -hls_playlist_type vod -hls_segment_filename '%d.ts' index.m3u8
mv 0.ts 0.mpegts && mv 1.ts 1.mpegts
```
