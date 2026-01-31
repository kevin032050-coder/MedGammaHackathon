// DICOM Viewer with Canvas (Working Version)
class DICOMViewer {
    constructor(app) {
        this.app = app;
        this.canvas = document.getElementById('image-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.slider = document.getElementById('slice-slider');
        this.currentImage = null;
        this.currentPreset = 'brain';
        
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
        console.log('DICOMViewer initialized');
    }

    setupEventListeners() {
        // Slice slider
        this.slider.addEventListener('input', (e) => {
            this.goToSlice(parseInt(e.target.value));
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

    async goToSlice(sliceIndex) {
        if (!this.app.currentStudy) return;

        const numSlices = this.app.currentStudy.num_slices;
        if (sliceIndex < 0 || sliceIndex >= numSlices) return;

        this.app.currentSlice = sliceIndex;
        this.slider.value = sliceIndex;

        // Update counter
        document.getElementById('slice-counter').textContent = `Slice ${sliceIndex + 1} / ${numSlices}`;

        // Render slice
        await this.renderSlice(sliceIndex);
    }

    async renderSlice(sliceIndex) {
        console.log(`Rendering slice ${sliceIndex} with preset ${this.currentPreset}`);
        
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
