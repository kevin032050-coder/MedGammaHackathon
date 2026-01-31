// DICOM Viewer with DWV
import * as dwv from '../../../node_modules/dwv/dist/dwv.mjs';

class DICOMViewer {
    constructor(app) {
        this.app = app;
        this.dwvApp = null;
        this.slider = document.getElementById('slice-slider');
        this.currentPreset = 'brain';
        
        this.setupEventListeners();
        this.initDWV();
    }

    initDWV() {
        // Initialize DWV application
        this.dwvApp = new dwv.App();
        
        // Configure DWV
        this.dwvApp.init({
            dataViewConfigs: {'*': [{divId: 'dwv-layer'}]},
            tools: {
                Scroll: {},
                ZoomAndPan: {},
                WindowLevel: {presets: this.getWindowPresets()}
            }
        });

        // Set initial tool
        this.dwvApp.addEventListener('load', () => {
            console.log('DWV loaded successfully');
            this.dwvApp.setTool('Scroll');
        });

        // Handle slice change
        this.dwvApp.addEventListener('positionchange', (event) => {
            const position = event.value[2]; // Z position (slice)
            if (position !== undefined) {
                this.slider.value = position;
                this.updateSliceInfo(position);
            }
        });
    }

    getWindowPresets() {
        // CT Window presets in DWV format
        return {
            'brain': {center: 40, width: 80},
            'subdural': {center: 80, width: 200},
            'bone': {center: 400, width: 1800},
            'lung': {center: -600, width: 1500},
            'abdomen': {center: 40, width: 400}
        };
    }

    setupEventListeners() {
        this.slider.addEventListener('input', (e) => {
            const sliceIndex = parseInt(e.target.value);
            this.goToSlice(sliceIndex);
        });

        // Window preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentPreset = e.target.dataset.preset;
                this.applyWindowPreset(this.currentPreset);
            });
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.app.currentStudy) return;

            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                e.preventDefault();
                const currentSlice = parseInt(this.slider.value);
                this.goToSlice(currentSlice + 1);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const currentSlice = parseInt(this.slider.value);
                this.goToSlice(currentSlice - 1);
            }
        });
    }

    async loadStudy(study) {
        console.log('Loading study with DWV:', study);

        if (!study.dicom_files || study.dicom_files.length === 0) {
            console.error('No DICOM files in study');
            return;
        }

        try {
            // Get DICOM file URLs from backend
            const fileUrls = await this.getDicomUrls(study.study_id);
            
            // Load DICOM files with DWV
            await this.dwvApp.loadURLs(fileUrls);

            // Configure slider
            const numSlices = study.num_slices;
            this.slider.disabled = false;
            this.slider.min = 0;
            this.slider.max = numSlices - 1;
            this.slider.value = 0;

            // Hide empty state
            document.querySelector('.empty-viewer').style.display = 'none';

            // Apply default window preset
            this.applyWindowPreset(this.currentPreset);

            console.log(`DWV loaded ${numSlices} slices`);
            
        } catch (error) {
            console.error('Error loading study with DWV:', error);
            this.app.showToast('Error loading DICOM files', 'error');
        }
    }

    async getDicomUrls(studyId) {
        // Get DICOM file URLs from backend
        const response = await window.electronAPI.getDicomUrls(studyId);
        if (response.success) {
            return response.urls;
        }
        throw new Error('Failed to get DICOM URLs');
    }

    goToSlice(sliceIndex) {
        if (!this.dwvApp || !this.app.currentStudy) return;

        const numSlices = this.app.currentStudy.num_slices;
        if (sliceIndex < 0 || sliceIndex >= numSlices) return;

        // Set position in DWV (position is [x, y, z])
        const currentPos = this.dwvApp.getActiveLayerGroup().getActiveViewLayer().getViewController().getPosition();
        this.dwvApp.getActiveLayerGroup().getActiveViewLayer().getViewController().setPosition(
            new dwv.math.Index([currentPos[0], currentPos[1], sliceIndex])
        );

        this.slider.value = sliceIndex;
        this.app.currentSlice = sliceIndex;
        this.updateSliceInfo(sliceIndex);
    }

    updateSliceInfo(sliceIndex) {
        const numSlices = this.app.currentStudy ? this.app.currentStudy.num_slices : 0;
        document.getElementById('slice-counter').textContent = `Slice ${sliceIndex + 1} / ${numSlices}`;
    }

    applyWindowPreset(presetName) {
        if (!this.dwvApp) return;

        const presets = this.getWindowPresets();
        const preset = presets[presetName];
        
        if (preset) {
            console.log(`Applying preset: ${presetName} (C=${preset.center}, W=${preset.width})`);
            
            // Apply window level to DWV
            const viewController = this.dwvApp.getActiveLayerGroup().getActiveViewLayer().getViewController();
            viewController.setWindowLevel(preset.center, preset.width);
        }
    }

    toggleOverlay(enabled) {
        // AI overlay will be handled separately
        console.log('AI overlay toggle:', enabled);
    }

    generateSimulatedCT(sliceIndex) {
        // Not needed with DWV - it handles everything
    }
}

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.app.currentStudy) return;

            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.goToSlice(this.app.currentSlice + 1);
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                e.preventDefault();
                this.goToSlice(this.app.currentSlice - 1);
            }
        });

        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.setZoom(this.zoomLevel + delta);
        });

        // Pan with mouse drag
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

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
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

    redrawImage() {
        if (!this.currentImage) return;

        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate image dimensions with zoom
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

        // Disable smoothing for pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;

        // Draw zoomed image
        this.ctx.drawImage(this.currentImage, zoomedX, zoomedY, zoomedWidth, zoomedHeight);
    }

    loadStudy(study) {
        console.log('Loading study:', study);
        console.log('Number of slices:', study.num_slices);
        
        // Use larger canvas for better quality
        this.canvas.width = 768;
        this.canvas.height = 768;

        // Enable controls
        this.slider.disabled = false;
        this.slider.max = study.num_slices - 1;
        this.slider.value = 0;
        
        console.log('Slider configured - max:', this.slider.max);

        // Hide empty state
        document.querySelector('.empty-viewer').style.display = 'none';

        // Load first slice
        this.goToSlice(0);
    }

    async goToSlice(sliceIndex) {
        if (!this.app.currentStudy) return;

        const numSlices = this.app.currentStudy.num_slices;
        
        // Bounds check
        if (sliceIndex < 0 || sliceIndex >= numSlices) return;

        this.app.currentSlice = sliceIndex;
        this.slider.value = sliceIndex;

        // Update slice counter
        document.getElementById('slice-counter').textContent = `Slice ${sliceIndex + 1} / ${numSlices}`;

        // Render slice
        await this.renderSlice(sliceIndex);

        // Start dwell timer
        this.startDwellTimer(sliceIndex);

        // Analyze slice if not cached
        if (!this.app.sliceAnalysisCache[sliceIndex]) {
            await this.analyzeSlice(sliceIndex);
        }

        // Update overlay
        this.updateOverlay(sliceIndex);
    }

    async renderSlice(sliceIndex) {
        console.log(`Rendering slice ${sliceIndex}`);
        
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Try to load real DICOM image
        try {
            const response = await window.electronAPI.getSliceImage(
                this.app.currentStudy.study_id,
                sliceIndex,
                null, // window center
                null, // window width  
                this.currentPreset // Use current preset
            );

            if (response.success && response.image_data) {
                // Load image from base64
                const img = new Image();
                img.onload = () => {
                    console.log('Image loaded successfully');
                    console.log(`Image dimensions: ${img.width}x${img.height}`);
                    
                    // Store current image for zoom/pan
                    this.currentImage = img;
                    
                    // Display resolution info
                    document.getElementById('resolution-info').textContent = `${img.width}x${img.height}px`;
                    
                    // Draw with current zoom/pan
                    this.redrawImage();
                };
                img.onerror = (error) => {
                    console.error('Image failed to load:', error);
                    this.generateSimulatedCT(sliceIndex);
                };
                img.src = response.image_data;
                return;
            } else {
                console.warn('No image data in response');
            }
        } catch (error) {
            console.error('Error loading DICOM image:', error);
        }

        // Fallback to simulated CT if real image fails
        console.log('Using simulated CT');
        this.generateSimulatedCT(sliceIndex);
    }

    generateSimulatedCT(sliceIndex) {
        // Create brain-like pattern with geometric shapes
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Brain outline (ellipse)
        this.ctx.fillStyle = '#303030';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, 180, 200, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Ventricles (darker regions)
        this.ctx.fillStyle = '#151515';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX - 40, centerY, 20, 30, 0, 0, Math.PI * 2);
        this.ctx.ellipse(centerX + 40, centerY, 20, 30, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // If there's a finding on this slice, draw it
        const study = this.app.currentStudy;
        if (study && study.analysis && study.analysis.findings) {
            study.analysis.findings.forEach(finding => {
                if (finding.slice_range && 
                    sliceIndex >= finding.slice_range[0] && 
                    sliceIndex <= finding.slice_range[1]) {
                    
                    // Draw hyperdensity (bright spot for hemorrhage)
                    const intensity = 1 - Math.abs(sliceIndex - (finding.slice_range[0] + finding.slice_range[1]) / 2) / 
                                        (finding.slice_range[1] - finding.slice_range[0]);
                    
                    this.ctx.fillStyle = `rgba(200, 200, 200, ${0.5 + intensity * 0.5})`;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX + 60, centerY - 30, 40, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
        }

        // Add noise for realism
        this.addNoise();
    }

    addNoise() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 20;
            data[i] += noise;
            data[i + 1] += noise;
            data[i + 2] += noise;
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    async analyzeSlice(sliceIndex) {
        try {
            const response = await window.electronAPI.analyzeSlice(
                this.app.currentStudy.study_id, 
                sliceIndex
            );

            if (response.success) {
                this.app.sliceAnalysisCache[sliceIndex] = response.slice_analysis;
            }
        } catch (error) {
            console.error('Error analyzing slice:', error);
        }
    }

    updateOverlay(sliceIndex) {
        // Clear overlay
        this.overlayCanvas.innerHTML = '';

        if (!this.app.aiOverlayEnabled) return;

        const analysis = this.app.sliceAnalysisCache[sliceIndex];
        if (!analysis || !analysis.has_findings) return;

        // Draw bounding boxes
        analysis.findings.forEach(finding => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const bbox = finding.bbox;
            
            rect.setAttribute('x', bbox.x);
            rect.setAttribute('y', bbox.y);
            rect.setAttribute('width', bbox.width);
            rect.setAttribute('height', bbox.height);
            rect.setAttribute('class', 'ai-bbox');
            
            this.overlayCanvas.appendChild(rect);
        });
    }

    toggleOverlay(enabled) {
        this.app.aiOverlayEnabled = enabled;
        this.updateOverlay(this.app.currentSlice);
    }

    startDwellTimer(sliceIndex) {
        // Clear existing timer
        if (this.app.dwellTimer) {
            clearTimeout(this.app.dwellTimer);
        }

        // Hide tooltip
        document.getElementById('dwell-tooltip').classList.add('hidden');

        // Start new timer
        this.app.dwellTimer = setTimeout(() => {
            this.showDwellTooltip(sliceIndex);
        }, this.app.dwellTimeThreshold);
    }

    showDwellTooltip(sliceIndex) {
        // Only show once per slice
        const tooltipKey = `${this.app.currentStudy.study_id}-${sliceIndex}`;
        if (this.app.shownTooltips.has(tooltipKey)) return;

        const analysis = this.app.sliceAnalysisCache[sliceIndex];
        if (!analysis || !analysis.has_findings) return;

        const tooltip = document.getElementById('dwell-tooltip');
        const content = tooltip.querySelector('.tooltip-content');
        
        content.textContent = analysis.findings[0].description;
        tooltip.classList.remove('hidden');

        this.app.shownTooltips.add(tooltipKey);

        // Close button
        tooltip.querySelector('.tooltip-close').onclick = () => {
            tooltip.classList.add('hidden');
        };
    }
}
