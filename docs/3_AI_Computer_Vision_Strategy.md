# AI Cricket Umpire PWA - AI & Computer Vision Design

This is your core moat. Do not try to build a massive generalized model. Build specific, small logic blocks.

### 1. Calibration (Pre-Delivery)
*   **Logic (Rules + CV):** Before the first ball, the user defines the pitch by dragging 4 points on the screen (Stumps, Crease, Wide lines).
*   *Alternatively:* Use a pre-trained YOLOv8 pose/keypoint model to auto-detect the stumps and crease lines. Map this 2D view into a top-down Homography perspective using OpenCV `cv2.getPerspectiveTransform`.

### 2. Ball Detection & Tracking
*   **Model:** Train a YOLOv8 Nano (`yolov8n.pt`) strictly on cricket balls. (Dataset available on Roboflow).
*   **Tracker:** Use ByteTrack or DeepSORT. When the ball is bowled, track its `(x,y)` coordinates across frames.

### 3. Wide Detection
*   **Logic (Rules-based):** Calculate the ball's `x` coordinate as it passes the y-axis of the crease. If `ball_x > wide_line_x_left` or `ball_x < wide_line_x_right`, return `WIDE`.

### 4. No-Ball Detection
*   **Model:** MediaPipe Pose (running in Python or directly in the browser via PWA) to track the bowler's ankle keypoint.
*   **Logic:** At the frame where the ball leaves the hand (release point), check if `ankle_y > crease_y`. If true, return `NO_BALL`.

### 5. Run Detection (Future Scope)
*   Track the batter's bat (YOLOv8). If the bat polygon crosses the crease polygon, increment the run counter.

> **Performance Hack:** Do not run inference on 1080p frames. Resize to 640x640 before sending to the model. Do not upload raw video. Zip the frames or compress to heavily optimized h264 before sending over WebSockets.
