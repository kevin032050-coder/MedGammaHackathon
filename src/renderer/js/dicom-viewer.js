// DICOM Viewer
class DICOMViewer {
    constructor(app) {
        this.app = app;
        this.canvas = document.getElementById('image-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlayCanvas = document.getElementById('overlay-canvas');
        this.slider = document.getElementById('slice-slider');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.slider.addEventListener('input', (e) => {
            this.goToSlice(parseInt(e.target.value));
        });

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
    }

    loadStudy(study) {
        this.canvas.width = 512;
        this.canvas.height = 512;

        // Enable controls
        this.slider.disabled = false;
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
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Try to load real DICOM image
        try {
            const response = await window.electronAPI.getSliceImage(
                this.app.currentStudy.study_id,
                sliceIndex,
                40, // window center
                80  // window width
            );

            if (response.success && response.image_data) {
                // Load image from base64
                const img = new Image();
                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                };
                img.src = response.image_data;
                return;
            }
        } catch (error) {
            console.error('Error loading DICOM image:', error);
        }

        // Fallback to simulated CT if real image fails
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
