import imageio_ffmpeg
import subprocess
import sys

def main():
    try:
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        print(f"Using FFmpeg binary at: {ffmpeg_path}")
        
        input_video = "Pixelart_Penguin_Cinnamoroll_Video.mp4"
        
        print("Extracting poster image...")
        subprocess.run([
            ffmpeg_path, "-y", "-i", input_video, 
            "-vframes", "1", "poster.jpg"
        ], check=True)
        
        print("Compressing video to optimized MP4...")
        subprocess.run([
            ffmpeg_path, "-y", "-i", input_video, 
            "-vf", "scale=-2:'min(720,ih)'", 
            "-c:v", "libx264", "-crf", "28", "-preset", "faster", 
            "-an", "bg-video-optimized.mp4"
        ], check=True)
        
        print("Compressing video to optimized WebM...")
        subprocess.run([
            ffmpeg_path, "-y", "-i", input_video, 
            "-vf", "scale=-2:'min(720,ih)'", 
            "-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0", 
            "-an", "bg-video-optimized.webm"
        ], check=True)
        
        print("Optimization complete!")
    except Exception as e:
        print(f"Error occurred: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
