// DICOM Viewer with Canvas (Working Version)
class DICOMViewer {
    constructor(app) {
        this.app = app;
        this.canvas = document.getElementById('image-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.slider = document.getElementById('slice-slider');
        this.currentImage = null;
        this.currentPreset = 'brain';

        // HIGH QUALITY MODE - use raw pixels instead of PNG
        this.useRawPixels = true; // Toggle this to switch modes

        // Zoom and pan
        this.zoomLevel = 1.0;
        this.minZoom = 0.5;
        this.maxZoom = 4.0;
        this.panX = 0;
        this.panY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        this.setupEventListeners();
        console.log('DICOMViewer initialized - High Quality Mode:', this.useRawPixels);
    }

    // CLIENT-SIDE WINDOWING (Lossless Quality)
    applyWindowLevel(pixelArray, width, height, windowCenter, windowWidth, minValue, maxValue) {
        /**
         * Apply window/level transformation to pixel array
         * Converts Hounsfield Units to 0-255 grayscale
         * This is done in JavaScript for ZERO quality loss
         */
        const minWindow = windowCenter - windowWidth / 2;
        const maxWindow = windowCenter + windowWidth / 2;

        // Create ImageData for canvas
        const imageData = this.ctx.createImageData(width, height);
        const data = imageData.data;

        for (let i = 0; i < pixelArray.length; i++) {
            const pixelValue = pixelArray[i];

            // Apply windowing
            let displayValue;
            if (pixelValue <= minWindow) {
                displayValue = 0;
            } else if (pixelValue >= maxWindow) {
                displayValue = 255;
            } else {
                displayValue = ((pixelValue - minWindow) / windowWidth) * 255;
            }

            // Set RGB (grayscale)
            const idx = i * 4;
            data[idx] = displayValue;     // R
            data[idx + 1] = displayValue; // G
            data[idx + 2] = displayValue; // B
            data[idx + 3] = 255;          // A (fully opaque)
        }

        return imageData;
    }

    setupEventListeners() {
        // Slice slider
        this.slider.addEventListener('input', (e) => {
            this.goToSlice(parseInt(e.target.value, 10));
        });

        // Window preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                this.currentPreset = e.target.dataset.preset;
                this.goToSlice(this.app.currentSlice); // Reload with new preset
            });
        });

        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.setZoom(this.zoomLevel + delta);
        });

        // Pan with drag
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.zoomLevel > 1.0) {
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMouseX;
                const dy = e.clientY - this.lastMouseY;
                this.panX += dx;
                this.panY += dy;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                this.redrawImage();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = this.zoomLevel > 1.0 ? 'grab' : 'default';
        });

        // Zoom buttons
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            this.setZoom(this.zoomLevel + 0.25);
        });

        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            this.setZoom(this.zoomLevel - 0.25);
        });

        document.getElementById('zoom-reset-btn').addEventListener('click', () => {
            this.resetZoom();
        });
    }

    loadStudy(study) {
        console.log('Loading study:', study);

        // Configure canvas
        this.canvas.width = 768;
        this.canvas.height = 768;

        // Configure slider
        this.slider.disabled = false;
        this.slider.min = 0;
        this.slider.max = study.num_slices - 1;
        this.slider.value = 0;

        // Hide empty state
        document.querySelector('.empty-viewer').style.display = 'none';

        // Load first slice
        this.goToSlice(0);
    }

    getSlicePriority(sliceIndex) {
        const a = this.app.currentStudy?.analysis;
        const map = a?.slice_priority_map;

        // NOTE: your current slice_priority_map seems to be an array like:
        // [{slice_index: 0, priority: 'ROUTINE'}, ...]
        // but your old code assumes map[sliceIndex] aligns by index.
        //
        // This version supports BOTH shapes:
        // 1) map[sliceIndex] exists and is correct
        // 2) map is a list of objects with slice_index fields
        if (!map) return 'ROUTINE';

        // Shape 1: direct index lookup
        if (map[sliceIndex] && map[sliceIndex].priority) {
            return map[sliceIndex].priority || 'ROUTINE';
        }

        // Shape 2: find by slice_index
        const hit = map.find?.(x => x.slice_index === sliceIndex);
        return hit?.priority || 'ROUTINE';
    }

    async goToSlice(sliceIndex) {
        if (!this.app.currentStudy) return;

        const numSlices = this.app.currentStudy.num_slices;
        if (sliceIndex < 0 || sliceIndex >= numSlices) return;

        this.app.currentSlice = sliceIndex;
        this.slider.value = sliceIndex;

        // Update counter
        document.getElementById('slice-counter').textContent = `Slice ${sliceIndex + 1} / ${numSlices}`;

        // Replace text instead of accumulating
        const p = this.getSlicePriority(sliceIndex);
        const el = document.getElementById('resolution-info');
        if (el) el.textContent = p;

        // Render slice
        await this.renderSlice(sliceIndex);
    }

    async renderSlice(sliceIndex) {
        console.log(`Rendering slice ${sliceIndex} with preset ${this.currentPreset}`);

        // HIGH QUALITY PATH: Use raw pixels
        if (this.useRawPixels) {
            await this.renderSliceRaw(sliceIndex);
            return;
        }

        // OLD PATH: Use PNG (fallback)
        this.renderSlicePNG(sliceIndex);
    }

    async renderSliceRaw(sliceIndex) {
        /**
         * HIGH QUALITY RENDERING - Uses raw pixel data
         * Zero compression artifacts, full precision
         */
        console.log('Rendering with RAW PIXELS (high quality)');

        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        try {
            // Fetch raw pixel data
            const response = await window.electronAPI.getSlicePixels(
                this.app.currentStudy.study_id,
                sliceIndex
            );

            if (!response.success) {
                console.error('Failed to get pixels:', response.error);
                return;
            }

            console.log(
                `Got raw pixels: ${response.width}x${response.height}, range: ${response.min_value.toFixed(1)} to ${response.max_value.toFixed(1)} HU`
            );

            // Decode base64 to Float32Array
            const binaryString = atob(response.pixels);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const pixelArray = new Float32Array(bytes.buffer);

            // Get window preset
            const presets = {
                brain: { center: 40, width: 80 },
                subdural: { center: 80, width: 200 },
                bone: { center: 400, width: 1800 },
                lung: { center: -600, width: 1500 },
                abdomen: { center: 40, width: 400 }
            };
            const preset = presets[this.currentPreset] || presets.brain;

            // Apply windowing CLIENT-SIDE (lossless)
            const imageData = this.applyWindowLevel(
                pixelArray,
                response.width,
                response.height,
                preset.center,
                preset.width,
                response.min_value,
                response.max_value
            );

            // Create temporary canvas at native resolution
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = response.width;
            tempCanvas.height = response.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(imageData, 0, 0);

            // Store for zoom/pan
            this.currentImage = tempCanvas;

            // Draw to main canvas
            this.redrawImage();

            console.log('✅ Raw pixel rendering complete');
        } catch (error) {
            console.error('Error rendering raw pixels:', error);
        }
    }

    async renderSlicePNG(sliceIndex) {
        /**
         * OLD RENDERING - Uses PNG (fallback for compatibility)
         */
        console.log('Rendering with PNG (legacy mode)');

        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        try {
            const response = await window.electronAPI.getSliceImage(
                this.app.currentStudy.study_id,
                sliceIndex,
                null,
                null,
                this.currentPreset
            );

            if (response.success && response.image_data) {
                const img = new Image();
                img.onload = () => {
                    this.currentImage = img;
                    this.redrawImage();
                };
                img.src = response.image_data;
            }
        } catch (error) {
            console.error('Error loading slice:', error);
        }
    }

    redrawImage() {
        if (!this.currentImage) return;

        // Clear
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate dimensions
        const aspectRatio = this.currentImage.width / this.currentImage.height;
        let baseWidth, baseHeight, offsetX, offsetY;

        if (aspectRatio > 1) {
            baseWidth = this.canvas.width;
            baseHeight = this.canvas.width / aspectRatio;
            offsetX = 0;
            offsetY = (this.canvas.height - baseHeight) / 2;
        } else {
            baseHeight = this.canvas.height;
            baseWidth = this.canvas.height * aspectRatio;
            offsetX = (this.canvas.width - baseWidth) / 2;
            offsetY = 0;
        }

        // Apply zoom
        const zoomedWidth = baseWidth * this.zoomLevel;
        const zoomedHeight = baseHeight * this.zoomLevel;
        const zoomedX = offsetX + (baseWidth - zoomedWidth) / 2 + this.panX;
        const zoomedY = offsetY + (baseHeight - zoomedHeight) / 2 + this.panY;

        // Pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;

        // Draw
        this.ctx.drawImage(this.currentImage, zoomedX, zoomedY, zoomedWidth, zoomedHeight);
    }

    setZoom(newZoom) {
        this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        document.getElementById('zoom-level').textContent = `${Math.round(this.zoomLevel * 100)}%`;
        this.canvas.style.cursor = this.zoomLevel > 1.0 ? 'grab' : 'default';
        this.redrawImage();
    }

    resetZoom() {
        this.zoomLevel = 1.0;
        this.panX = 0;
        this.panY = 0;
        document.getElementById('zoom-level').textContent = '100%';
        this.canvas.style.cursor = 'default';
        this.redrawImage();
    }

    toggleOverlay(enabled) {
        console.log('AI overlay toggle:', enabled);
    }
}