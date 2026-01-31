// DICOM Viewer with DWV
class DICOMViewer {
    constructor(app) {
        this.app = app;
        this.dwvApp = null;
        this.slider = document.getElementById('slice-slider');
        this.currentPreset = 'brain';
        this.isInitialized = false;
        
        this.setupEventListeners();
        console.log('DICOMViewer initialized');
    }

    async initDWV() {
        if (this.isInitialized) {
            console.log('DWV already initialized');
            return;
        }

        try {
            console.log('Initializing DWV...');
            
            // Check if dwv is available
            if (typeof dwv === 'undefined') {
                throw new Error('DWV library not loaded');
            }
            
            // Initialize DWV application
            this.dwvApp = new dwv.App();
            console.log('DWV App created');
            
            // Configure DWV
            this.dwvApp.init({
                dataViewConfigs: {'*': [{divId: 'dwv-layer'}]},
                tools: {
                    Scroll: {},
                    ZoomAndPan: {},
                    WindowLevel: {}
                }
            });
            console.log('DWV App configured');

            // Listen for ALL events
            this.dwvApp.addEventListener('load', (event) => {
                console.log('✅ DWV LOAD EVENT:', event);
                this.dwvApp.setTool('Scroll');
                setTimeout(() => this.applyWindowPreset(this.currentPreset), 200);
            });
            
            this.dwvApp.addEventListener('loadstart', (event) => {
                console.log('📥 DWV LOADSTART:', event);
            });
            
            this.dwvApp.addEventListener('loadprogress', (event) => {
                console.log('⏳ DWV PROGRESS:', event.loaded, '/', event.total);
            });
            
            this.dwvApp.addEventListener('loadend', (event) => {
                console.log('✅ DWV LOADEND:', event);
                this.app.showToast('DICOM files loaded successfully!', 'success');
            });
            
            this.dwvApp.addEventListener('loaditem', (event) => {
                console.log('📄 DWV LOADITEM:', event);
            });

            this.dwvApp.addEventListener('positionchange', (event) => {
                const position = event.value[2];
                if (position !== undefined) {
                    this.slider.value = position;
                    this.updateSliceInfo(position);
                }
            });
            
            this.dwvApp.addEventListener('error', (event) => {
                console.error('❌ DWV ERROR:', event);
            });

            this.isInitialized = true;
            console.log('DWV initialized successfully');
            
        } catch (error) {
            console.error('Error initializing DWV:', error);
            throw error;
        }
    }

    getWindowPresets() {
        // CT Window presets
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
        console.log('=== Loading study with DWV ===');
        console.log('Study data:', study);

        if (!study.dicom_files || study.dicom_files.length === 0) {
            console.error('No DICOM files in study');
            this.app.showToast('No DICOM files found', 'error');
            return;
        }

        try {
            // Initialize DWV if not done yet
            await this.initDWV();
            console.log('DWV ready');
            
            // Get raw DICOM file data from backend
            console.log('Fetching DICOM file data for study:', study.study_id);
            const fileBuffers = await this.getDicomFileData(study.study_id);
            
            if (!fileBuffers || fileBuffers.length === 0) {
                throw new Error('No file data returned from backend');
            }
            
            console.log('Got', fileBuffers.length, 'DICOM file buffers');
            
            // Convert buffers to File objects for DWV
            const files = fileBuffers.map((buffer, index) => {
                return new File([buffer], `slice_${index}.dcm`, { type: 'application/dicom' });
            });
            
            console.log('Created', files.length, 'File objects');
            
            // Reset DWV before loading
            this.dwvApp.reset();
            
            // Load DICOM files with DWV using File objects
            console.log('Loading files into DWV...');
            this.dwvApp.loadFiles(files);

            // Configure slider
            const numSlices = study.num_slices;
            this.slider.disabled = false;
            this.slider.min = 0;
            this.slider.max = numSlices - 1;
            this.slider.value = 0;

            // Hide empty state
            document.querySelector('.empty-viewer').style.display = 'none';

            console.log(`DWV loading ${numSlices} slices...`);
            this.app.showToast('Loading DICOM files...', 'info');
            
        } catch (error) {
            console.error('Error loading study with DWV:', error);
            this.app.showToast('Error loading DICOM files: ' + error.message, 'error');
        }
    }

    async getDicomFileData(studyId) {
        // Get raw DICOM file data as array buffers
        const response = await window.electronAPI.getDicomFileData(studyId);
        if (response.success) {
            // Convert base64 to ArrayBuffer
            return response.files.map(base64 => {
                const binaryString = atob(base64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes.buffer;
            });
        }
        throw new Error('Failed to get DICOM file data');
    }

    goToSlice(sliceIndex) {
        if (!this.dwvApp || !this.app.currentStudy || !this.isInitialized) {
            console.log('Cannot change slice - not ready');
            return;
        }

        const numSlices = this.app.currentStudy.num_slices;
        if (sliceIndex < 0 || sliceIndex >= numSlices) return;

        try {
            console.log('Going to slice:', sliceIndex);
            
            // Get view controller
            const layerGroup = this.dwvApp.getActiveLayerGroup();
            const viewLayer = layerGroup.getActiveViewLayer();
            const viewController = viewLayer.getViewController();
            
            // Get current position
            const currentPos = viewController.getPosition();
            
            // Create new position with updated slice
            const newIndex = new dwv.math.Index([currentPos.get(0), currentPos.get(1), sliceIndex]);
            
            // Set new position
            viewController.setCurrentPosition(newIndex);

            this.slider.value = sliceIndex;
            this.app.currentSlice = sliceIndex;
            this.updateSliceInfo(sliceIndex);
        } catch (error) {
            console.error('Error changing slice:', error);
        }
    }

    updateSliceInfo(sliceIndex) {
        const numSlices = this.app.currentStudy ? this.app.currentStudy.num_slices : 0;
        document.getElementById('slice-counter').textContent = `Slice ${sliceIndex + 1} / ${numSlices}`;
    }

    applyWindowPreset(presetName) {
        if (!this.dwvApp || !this.isInitialized) {
            console.log('Cannot apply preset - DWV not ready');
            return;
        }

        const presets = this.getWindowPresets();
        const preset = presets[presetName];
        
        if (preset) {
            console.log(`Applying preset: ${presetName} (C=${preset.center}, W=${preset.width})`);
            
            try {
                // Get view controller
                const layerGroup = this.dwvApp.getActiveLayerGroup();
                const viewLayer = layerGroup.getActiveViewLayer();
                const viewController = viewLayer.getViewController();
                
                // Apply window level
                viewController.setWindowLevel(preset.center, preset.width);
                
                console.log('Preset applied successfully');
            } catch (error) {
                console.error('Error applying window preset:', error);
            }
        }
    }

    toggleOverlay(enabled) {
        console.log('AI overlay toggle:', enabled);
    }
}
