const App = {
    currentLevel: 1,
    completedLevels: new Set(),
    location: null,
    photoData: null,
    worker: null,
    level5Stats: null,

    init() {
        this.loadState();
        this.bindEvents();
        this.restoreButtons();
        this.showLevel(1);
        this.updateProgress();
        if (this.photoData) {
            this.displaySavedPhoto();
        }
    },

    loadState() {
        try {
            const saved = localStorage.getItem('escapeRoomCompleted');
            if (saved) {
                JSON.parse(saved).forEach(l => {
                    if (l >= 1 && l <= 5) this.completedLevels.add(l);
                });
            }
            const loc = localStorage.getItem('escapeRoomLocation');
            if (loc) {
                this.location = JSON.parse(loc);
            }
            const photo = localStorage.getItem('escapeRoomPhoto');
            if (photo) {
                this.photoData = photo;
            }
        } catch (e) {}
    },

    saveCompleted() {
        localStorage.setItem('escapeRoomCompleted', JSON.stringify([...this.completedLevels]));
    },

    restoreButtons() {
        for (const level of this.completedLevels) {
            const nextBtn = document.querySelector(`.next-level-btn[data-next="${level + 1}"]`);
            if (nextBtn) nextBtn.disabled = false;
        }
        if (this.completedLevels.has(5)) {
            const btn5 = document.querySelector('.next-level-btn[data-next="complete"]');
            if (btn5) btn5.disabled = false;
        }
    },

    bindEvents() {
        document.getElementById('getLocationBtn').addEventListener('click', () => this.getLocation());
        document.getElementById('drawMapBtn').addEventListener('click', () => this.drawMap());
        document.getElementById('startCameraBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('captureBtn').addEventListener('click', () => this.capturePhoto());
        document.getElementById('photoUpload').addEventListener('change', (e) => this.handlePhotoUpload(e));
        document.getElementById('processLevel4Btn').addEventListener('click', () => this.processLevel4());
        document.getElementById('processLevel5Btn').addEventListener('click', () => this.processLevel5());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportJSON());

        document.querySelectorAll('.next-level-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const next = e.currentTarget.dataset.next;
                if (next === 'complete') {
                    this.showCompletion();
                } else {
                    this.goToLevel(parseInt(next));
                }
            });
        });

        document.querySelectorAll('.prev-level-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.goToLevel(parseInt(e.currentTarget.dataset.prev));
            });
        });
    },

    showLevel(num) {
        document.querySelectorAll('.level-section').forEach(s => s.classList.remove('active'));
        const section = document.getElementById(`level${num}`);
        if (section) {
            section.classList.add('active');
            this.currentLevel = num;
        }
        document.getElementById('levelBadge').textContent = `Nivel ${num}/5`;

        if (num === 2 && this.completedLevels.has(2)) {
            this.drawMapInstant();
            const b2 = document.getElementById('drawMapBtn');
            b2.disabled = true;
            b2.innerHTML = '<i class="bi bi-check-circle"></i> Mapa Dibujado';
        } else if (num === 2 && this.location) {
            document.getElementById('drawMapBtn').disabled = false;
        }

        if (num === 3 && this.photoData) {
            this.displaySavedPhoto();
            const btn = document.getElementById('captureBtn');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-camera-fill"></i> Recapturar';
        }
    },

    goToLevel(num) {
        if (num > 1 && !this.completedLevels.has(num - 1)) {
            this.showAlert('Debes completar el nivel anterior primero.', 'warning');
            return;
        }
        this.showLevel(num);
    },

    updateProgress() {
        const pct = (this.completedLevels.size / 5) * 100;
        document.getElementById('progressBar').style.width = `${pct}%`;
    },

    showAlert(msg, type = 'danger') {
        const container = document.getElementById('alertContainer');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        container.appendChild(alert);
        setTimeout(() => alert.remove(), 5000);
    },

    completeLevel(num) {
        this.completedLevels.add(num);
        this.saveCompleted();
        this.updateProgress();
        const btn = document.querySelector(`.next-level-btn[data-next="${num + 1}"]`);
        if (btn) btn.disabled = false;
        if (num === 5) {
            const btn5 = document.querySelector('.next-level-btn[data-next="complete"]');
            if (btn5) btn5.disabled = false;
        }
        this.showAlert(`Nivel ${num} completado!`, 'success');
    },

    // ============ LEVEL 1 ============
    getLocation() {
        const btn = document.getElementById('getLocationBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Obteniendo...';

        if (!navigator.geolocation) {
            this.showGeoError('Geolocalización no soportada en este navegador.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-crosshair"></i> Obtener Ubicación';
            return;
        }

        const options = {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000
        };

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.setLocation(pos.coords.latitude, pos.coords.longitude, btn);
            },
            (err) => {
                console.warn('Geolocation error:', err.code, err.message);
                if (err.code === err.PERMISSION_DENIED) {
                    this.showGeoError('Permiso denegado. Activa la geolocalización en tu navegador.');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-crosshair"></i> Obtener Ubicación';
                    return;
                }
                this.tryIpFallback(btn);
            },
            options
        );
    },

    setLocation(lat, lng, btn) {
        this.location = { lat, lng };
        localStorage.setItem('escapeRoomLocation', JSON.stringify(this.location));
        document.getElementById('latitude').textContent = lat.toFixed(6);
        document.getElementById('longitude').textContent = lng.toFixed(6);
        document.getElementById('locationResult').classList.remove('d-none');
        document.getElementById('locationError').classList.add('d-none');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle"></i> Ubicación Obtenida';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-success');
        this.completeLevel(1);
    },

    async tryIpFallback(btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Intentando por IP...';
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            if (data.latitude && data.longitude) {
                this.setLocation(data.latitude, data.longitude, btn);
            } else {
                this.showGeoError('No se pudo determinar tu ubicación. En Firefox, ve a about:config y verifica que geo.enabled = true.');
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-crosshair"></i> Obtener Ubicación';
            }
        } catch (e) {
            console.error('IP fallback error:', e);
            this.showGeoError('No se pudo determinar tu ubicación. En Firefox, ve a about:config y verifica que geo.enabled = true.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-crosshair"></i> Obtener Ubicación';
        }
    },

    showGeoError(msg) {
        const el = document.getElementById('locationError');
        el.textContent = msg;
        el.classList.remove('d-none');
        document.getElementById('locationResult').classList.add('d-none');
    },

    // ============ LEVEL 2 ============
    drawMap(redraw = false) {
        if (!this.location) {
            this.showAlert('Debes completar el Nivel 1 primero.', 'warning');
            return;
        }
        if (this.completedLevels.has(2) && !redraw) {
            this.drawMapInstant();
            return;
        }

        const canvas = document.getElementById('mapCanvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const btn = document.getElementById('drawMapBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Dibujando...';

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#e8f5e9';
        ctx.fillRect(0, 0, w, h);

        const status = document.getElementById('canvasStatus');
        status.className = 'text-muted small';

        const steps = [
            {
                label: 'Parque Central',
                draw: () => {
                    ctx.fillStyle = '#a5d6a7';
                    ctx.fillRect(50, 50, 200, 150);
                    ctx.fillStyle = '#2e7d32';
                    ctx.font = '14px sans-serif';
                    ctx.fillText('PARQUE CENTRAL', 90, 140);
                }
            },
            {
                label: 'Lago',
                draw: () => {
                    ctx.fillStyle = '#90caf9';
                    ctx.fillRect(400, 200, 150, 100);
                    ctx.fillStyle = '#1565c0';
                    ctx.font = '14px sans-serif';
                    ctx.fillText('LAGO', 460, 260);
                }
            },
            {
                label: 'Av. Central',
                draw: () => {
                    ctx.fillStyle = '#795548';
                    ctx.fillRect(250, 0, 8, h);
                    ctx.fillStyle = '#5d4037';
                    ctx.font = '12px sans-serif';
                    ctx.fillText('Av. Central', 180, 20);
                }
            },
            {
                label: 'Calle 1',
                draw: () => {
                    ctx.fillStyle = '#795548';
                    ctx.fillRect(0, 200, w, 6);
                    ctx.fillStyle = '#5d4037';
                    ctx.font = '12px sans-serif';
                    ctx.fillText('Calle 1', 20, 195);
                }
            },
            {
                label: 'Edificio A',
                draw: () => {
                    ctx.fillStyle = '#ffcc80';
                    ctx.fillRect(300, 50, 80, 60);
                    ctx.fillStyle = '#e65100';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Edificio A', 340, 85);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: 'Museo',
                draw: () => {
                    ctx.fillStyle = '#ce93d8';
                    ctx.fillRect(350, 300, 70, 70);
                    ctx.fillStyle = '#6a1b9a';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Museo', 385, 340);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: 'Rectángulo (Zona Restringida)',
                draw: () => {
                    ctx.strokeStyle = '#d32f2f';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(420, 50, 120, 80);
                    ctx.fillStyle = '#d32f2f';
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Zona Restringida', 480, 100);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: 'Línea de límite',
                draw: () => {
                    ctx.strokeStyle = '#1976d2';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(50, 320);
                    ctx.lineTo(250, 350);
                    ctx.stroke();
                    ctx.fillStyle = '#1976d2';
                    ctx.font = '11px sans-serif';
                    ctx.fillText('Línea de límite', 60, 315);
                }
            },
            {
                label: 'Círculo (Zona de seguridad)',
                draw: () => {
                    ctx.strokeStyle = '#f57c00';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(550, 100, 40, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = '#f57c00';
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('Zona de seguridad', 550, 105);
                    ctx.textAlign = 'left';
                }
            },
            {
                label: '📍 Tu ubicación',
                draw: () => {
                    const px = { x: w / 2, y: h / 2 };
                    ctx.beginPath();
                    ctx.arc(px.x, px.y, 10, 0, Math.PI * 2);
                    ctx.fillStyle = '#e53935';
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('📍', px.x, px.y - 18);
                    ctx.textAlign = 'left';
                }
            }
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i >= steps.length) {
                clearInterval(interval);
                status.textContent = 'Mapa dibujado correctamente con tu ubicación marcada.';
                status.classList.remove('text-muted');
                status.classList.add('text-success', 'fw-bold');
                btn.disabled = true;
                btn.innerHTML = '<i class="bi bi-check-circle"></i> Mapa Dibujado';
                this.completeLevel(2);
                return;
            }
            status.textContent = `Dibujando: ${steps[i].label}...`;
            steps[i].draw();
            i++;
        }, 200);
    },

    drawMapInstant() {
        const canvas = document.getElementById('mapCanvas');
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const status = document.getElementById('canvasStatus');

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#e8f5e9';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#a5d6a7';
        ctx.fillRect(50, 50, 200, 150);
        ctx.fillStyle = '#2e7d32';
        ctx.font = '14px sans-serif';
        ctx.fillText('PARQUE CENTRAL', 90, 140);

        ctx.fillStyle = '#90caf9';
        ctx.fillRect(400, 200, 150, 100);
        ctx.fillStyle = '#1565c0';
        ctx.font = '14px sans-serif';
        ctx.fillText('LAGO', 460, 260);

        ctx.fillStyle = '#795548';
        ctx.fillRect(250, 0, 8, h);
        ctx.fillStyle = '#5d4037';
        ctx.font = '12px sans-serif';
        ctx.fillText('Av. Central', 180, 20);

        ctx.fillStyle = '#795548';
        ctx.fillRect(0, 200, w, 6);
        ctx.fillStyle = '#5d4037';
        ctx.font = '12px sans-serif';
        ctx.fillText('Calle 1', 20, 195);

        ctx.fillStyle = '#ffcc80';
        ctx.fillRect(300, 50, 80, 60);
        ctx.fillStyle = '#e65100';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Edificio A', 340, 85);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#ce93d8';
        ctx.fillRect(350, 300, 70, 70);
        ctx.fillStyle = '#6a1b9a';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Museo', 385, 340);
        ctx.textAlign = 'left';

        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 3;
        ctx.strokeRect(420, 50, 120, 80);
        ctx.fillStyle = '#d32f2f';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Zona Restringida', 480, 100);
        ctx.textAlign = 'left';

        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(50, 320);
        ctx.lineTo(250, 350);
        ctx.stroke();
        ctx.fillStyle = '#1976d2';
        ctx.font = '11px sans-serif';
        ctx.fillText('Línea de límite', 60, 315);

        ctx.strokeStyle = '#f57c00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(550, 100, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f57c00';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Zona de seguridad', 550, 105);
        ctx.textAlign = 'left';

        const px = { x: w / 2, y: h / 2 };
        ctx.beginPath();
        ctx.arc(px.x, px.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#e53935';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📍', px.x, px.y - 18);
        ctx.textAlign = 'left';

        status.textContent = 'Mapa (nivel completado)';
        status.classList.remove('text-muted');
        status.classList.add('text-success', 'fw-bold');
    },

    // ============ LEVEL 3 ============
    async startCamera() {
        const startBtn = document.getElementById('startCameraBtn');
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Iniciando...';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            const video = document.getElementById('video');
            video.srcObject = stream;
            video.play();
            document.getElementById('captureBtn').disabled = false;
            document.getElementById('cameraError').classList.add('d-none');
            document.getElementById('cameraFallback').classList.add('d-none');
            startBtn.innerHTML = '<i class="bi bi-check-circle"></i> Cámara Activa';
            startBtn.classList.remove('btn-warning');
            startBtn.classList.add('btn-success');
            if (this.photoData) {
                this.displaySavedPhoto();
            }
        } catch (err) {
            let msg = '';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg = 'Permiso denegado. Permite el acceso a la cámara en tu navegador.';
            } else if (err.name === 'NotFoundError') {
                msg = 'Cámara no encontrada. Puedes subir una imagen como evidencia.';
                document.getElementById('cameraFallback').classList.remove('d-none');
            } else {
                msg = 'Error al acceder a la cámara: ' + err.message;
            }
            const errEl = document.getElementById('cameraError');
            errEl.textContent = msg;
            errEl.classList.remove('d-none');
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="bi bi-camera-video-fill"></i> Reintentar Cámara';
        }
    },

    capturePhoto() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('photoCanvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        this.photoData = canvas.toDataURL('image/png');
        localStorage.setItem('escapeRoomPhoto', this.photoData);
        this.displaySavedPhoto();
        if (!this.completedLevels.has(3)) {
            this.completeLevel(3);
            document.getElementById('captureBtn').innerHTML = '<i class="bi bi-camera-fill"></i> Capturar Otra';
        } else {
            document.getElementById('captureBtn').innerHTML = '<i class="bi bi-camera-fill"></i> Recapturar';
        }
    },

    displaySavedPhoto() {
        const canvas = document.getElementById('photoCanvas');
        const placeholder = document.getElementById('photoPlaceholder');
        canvas.classList.remove('d-none');
        placeholder.classList.add('d-none');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
        img.src = this.photoData;
    },

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.photoData = ev.target.result;
            localStorage.setItem('escapeRoomPhoto', this.photoData);
            this.displaySavedPhoto();
            document.getElementById('cameraError').classList.add('d-none');
            if (!this.completedLevels.has(3)) {
                this.completeLevel(3);
                document.getElementById('captureBtn').innerHTML = '<i class="bi bi-camera-fill"></i> Capturar Otra';
            }
        };
        reader.readAsDataURL(file);
    },

    // ============ LEVEL 4 ============
    processLevel4() {
        const btn = document.getElementById('processLevel4Btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';

        const progressContainer = document.getElementById('progressContainer4');
        const progressBar = document.getElementById('progressBar4');
        progressContainer.classList.remove('d-none');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        const total = 20000;
        const data = [];
        for (let i = 0; i < total; i++) {
            data.push({
                temperature: 15 + Math.random() * 30,
                humidity: 30 + Math.random() * 70
            });
        }

        this.worker = new Worker('worker.js');

        this.worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'progress') {
                progressBar.style.width = msg.progress + '%';
                progressBar.textContent = msg.progress + '%';
            } else if (msg.type === 'result') {
                const s = msg.stats;
                document.getElementById('avgTemp4').textContent = s.avgTemp + '°C';
                document.getElementById('avgHum4').textContent = s.avgHum + '%';
                document.getElementById('maxTemp4').textContent = s.maxTemp + '°C';
                document.getElementById('maxHum4').textContent = s.maxHum + '%';
                document.getElementById('minTemp4').textContent = s.minTemp + '°C';
                document.getElementById('minHum4').textContent = s.minHum + '%';
                document.getElementById('statsContainer4').classList.remove('d-none');
                progressBar.classList.remove('progress-bar-animated');
                progressBar.style.width = '100%';
                progressBar.textContent = 'Completado';
                progressBar.classList.add('bg-success');
                btn.innerHTML = '<i class="bi bi-check-circle"></i> Procesado';
                this.completeLevel(4);
            }
        };

        this.worker.postMessage({ type: 'level4', data });
    },

    // ============ LEVEL 5 ============
    processLevel5() {
        const btn = document.getElementById('processLevel5Btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Generando 250,000 registros...';

        const progressContainer = document.getElementById('progressContainer5');
        const progressBar = document.getElementById('progressBar5');
        progressContainer.classList.remove('d-none');
        progressBar.style.width = '0%';
        progressBar.textContent = '0%';

        const total = 250000;
        const data = [];

        setTimeout(() => {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';

            for (let i = 0; i < total; i++) {
                let temp = 10 + Math.random() * 35;
                let hum = 20 + Math.random() * 80;
                let pres = 980 + Math.random() * 60;

                if (Math.random() < 0.05) {
                    temp = -Math.random() * 10;
                }
                if (Math.random() < 0.05) {
                    hum = -Math.random() * 10;
                }
                if (Math.random() < 0.05) {
                    pres = -Math.random() * 10;
                }

                data.push({ temperature: temp, humidity: hum, pressure: pres });
            }

            this.worker = new Worker('worker.js');

            this.worker.onmessage = (e) => {
                const msg = e.data;
                if (msg.type === 'progress') {
                    progressBar.style.width = msg.progress + '%';
                    progressBar.textContent = msg.progress + '%';
                } else if (msg.type === 'result') {
                    const s = msg.stats;
                    document.getElementById('avgTemp5').textContent = s.avgTemp + '°C';
                    document.getElementById('avgHum5').textContent = s.avgHum + '%';
                    document.getElementById('avgPres5').textContent = s.avgPres + ' hPa';
                    document.getElementById('topTemps5').textContent = s.top10Temps.join(', ');
                    document.getElementById('topPress5').textContent = s.top10Press.join(', ');
                    document.getElementById('validCount5').textContent = s.validCount.toLocaleString();
                    document.getElementById('statsContainer5').classList.remove('d-none');
                    progressBar.classList.remove('progress-bar-animated');
                    progressBar.style.width = '100%';
                    progressBar.textContent = 'Completado';
                    progressBar.classList.add('bg-success');
                    btn.innerHTML = '<i class="bi bi-check-circle"></i> Procesado';
                    this.level5Stats = s;
                    this.completeLevel(5);
                }
            };

            this.worker.postMessage({ type: 'level5', data });
        }, 100);
    },

    // ============ EXPORT JSON ============
    exportJSON() {
        if (!this.level5Stats) {
            this.showAlert('No hay datos para exportar.', 'warning');
            return;
        }
        const jsonStr = JSON.stringify(this.level5Stats, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'portal_cuantico_estadisticas.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showAlert('JSON exportado correctamente.', 'success');
    },

    showCompletion() {
        const main = document.querySelector('main');
        main.innerHTML = `
            <div class="card shadow text-center">
                <div class="card-body py-5">
                    <div class="display-1 text-success mb-3">🎉</div>
                    <h2 class="mb-3">¡Felicidades!</h2>
                    <p class="lead">Has completado los 5 niveles y recuperado el acceso al sistema.</p>
                    <div class="row justify-content-center mt-4">
                        <div class="col-md-6">
                            <ul class="list-group">
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 1: El Guardián de la Ubicación
                                    <span class="badge bg-success rounded-pill">✓</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 2: El Cartógrafo Perdido
                                    <span class="badge bg-success rounded-pill">✓</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 3: La Evidencia del Explorador
                                    <span class="badge bg-success rounded-pill">✓</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 4: El Núcleo de Procesamiento
                                    <span class="badge bg-success rounded-pill">✓</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    Nivel 5: El Portal Cuántico
                                    <span class="badge bg-success rounded-pill">✓</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-lg mt-4" onclick="location.reload()">
                        <i class="bi bi-arrow-counterclockwise"></i> Jugar de Nuevo
                    </button>
                </div>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
