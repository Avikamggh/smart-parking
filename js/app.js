/**
 * SKYSTACK - Smart Campus Parking System
 * Cloud Wars University Hackathon (Final Round)
 * Interactive Application Engine & Cloud Simulation
 */

// Sound Synthesizer (Web Audio API)
class AudioFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBeep(freq = 600, duration = 0.08, type = 'sine') {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback
    }
  }

  playPacketStream() {
    if (!this.enabled) return;
    this.playBeep(880, 0.05, 'triangle');
    setTimeout(() => this.playBeep(1174, 0.06, 'sine'), 120);
    setTimeout(() => this.playBeep(1480, 0.08, 'sine'), 240);
  }

  playSlotClick(isOccupied) {
    if (isOccupied) {
      this.playBeep(440, 0.06, 'sawtooth');
    } else {
      this.playBeep(880, 0.08, 'sine');
    }
  }
}

const audio = new AudioFX();

// Parking State Management (100 total campus slots)
// Prompt requirement: "TOTAL SLOTS: 100 | AVAILABLE: 37 (green) | OCCUPIED: 63 (orange)"
class ParkingState {
  constructor() {
    this.currentZone = 'A';
    this.activeFilter = 'all';
    this.autoStreaming = false;
    this.streamInterval = null;
    this.selectedTimeHour = 16; // 4:00 PM default to highlight peak alert
    this.zones = {
      'A': { name: 'ZONE A - Engineering Block', total: 30, prefix: 'A' },
      'B': { name: 'ZONE B - Main Quad & Library', total: 25, prefix: 'B' },
      'C': { name: 'ZONE C - Student Center & Sports', total: 25, prefix: 'C' },
      'D': { name: 'ZONE D - Admin & Faculty', total: 20, prefix: 'D' }
    };
    this.slots = [];
    this.initSlots();
  }

  initSlots() {
    this.slots = [];
    const carModels = ['Tesla Model 3', 'Hyundai Ioniq 5', 'Honda Civic', 'Ford Mustang Mach-E', 'BMW 330e', 'Toyota RAV4', 'Audi e-tron', 'Nissan Leaf'];
    
    // Exactly 100 slots across 4 zones
    // We will assign 63 occupied and 37 available
    let totalGenerated = 0;
    
    // Distribution across zones:
    // Zone A: 30 slots (19 occupied, 11 available)
    // Zone B: 25 slots (16 occupied, 9 available)
    // Zone C: 25 slots (16 occupied, 9 available)
    // Zone D: 20 slots (12 occupied, 8 available)
    // Total occupied: 19 + 16 + 16 + 12 = 63. Total available: 11 + 9 + 9 + 8 = 37. Total = 100.
    const zoneDistribution = {
      'A': { total: 30, occupiedCount: 19 },
      'B': { total: 25, occupiedCount: 16 },
      'C': { total: 25, occupiedCount: 16 },
      'D': { total: 20, occupiedCount: 12 }
    };

    for (const [zoneKey, config] of Object.entries(zoneDistribution)) {
      // Deterministic spread of occupied slots
      const occupiedIndices = new Set();
      const step = config.total / config.occupiedCount;
      for (let i = 0; i < config.occupiedCount; i++) {
        occupiedIndices.add(Math.floor(i * step) % config.total);
      }
      // Fill remaining if collision happened
      let cur = 0;
      while (occupiedIndices.size < config.occupiedCount && cur < config.total) {
        occupiedIndices.add(cur);
        cur++;
      }

      for (let num = 1; num <= config.total; num++) {
        const index = num - 1;
        const isOccupied = occupiedIndices.has(index);
        const id = `${zoneKey}${num < 10 ? '0' + num : num}`;
        const isEV = (num % 5 === 0);
        const isAccessible = (num === 1 || num === 2);
        
        this.slots.push({
          id,
          zone: zoneKey,
          num,
          isOccupied,
          isEV,
          isAccessible,
          batteryLevel: Math.floor(88 + Math.random() * 11),
          occupiedSince: isOccupied ? `${Math.floor(1 + Math.random() * 3)}h ${Math.floor(Math.random() * 59)}m ago` : null,
          vehicleModel: isOccupied ? carModels[Math.floor(Math.random() * carModels.length)] : null,
          distanceToEntrance: `${Math.floor(15 + num * 3)} meters`,
          lastUpdated: 'Just now'
        });
      }
    }
  }

  getMetrics() {
    const total = this.slots.length;
    const occupied = this.slots.filter(s => s.isOccupied).length;
    const available = total - occupied;
    const rate = Math.round((occupied / total) * 100);
    return { total, available, occupied, rate };
  }

  getZoneMetrics(zoneKey) {
    const zoneSlots = this.slots.filter(s => s.zone === zoneKey);
    const total = zoneSlots.length;
    const occupied = zoneSlots.filter(s => s.isOccupied).length;
    const available = total - occupied;
    const rate = Math.round((occupied / total) * 100);
    return { total, available, occupied, rate };
  }

  toggleSlot(slotId) {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) return null;
    slot.isOccupied = !slot.isOccupied;
    if (slot.isOccupied) {
      const carModels = ['Tesla Model 3', 'Hyundai Ioniq 5', 'Honda Civic', 'Ford Mach-E', 'BMW i4'];
      slot.vehicleModel = carModels[Math.floor(Math.random() * carModels.length)];
      slot.occupiedSince = 'Just now';
    } else {
      slot.vehicleModel = null;
      slot.occupiedSince = null;
    }
    slot.lastUpdated = 'Just now';
    return slot;
  }

  simulateEvent() {
    // Pick a random slot to toggle
    const randomIndex = Math.floor(Math.random() * this.slots.length);
    const slot = this.slots[randomIndex];
    const previousState = slot.isOccupied;
    slot.isOccupied = !previousState;
    if (slot.isOccupied) {
      slot.vehicleModel = 'Guest Vehicle (EV)';
      slot.occupiedSince = 'Just now';
    } else {
      slot.vehicleModel = null;
      slot.occupiedSince = null;
    }
    slot.lastUpdated = 'Just now';
    return { slot, previousState };
  }

  applyTimeScrub(hour) {
    this.selectedTimeHour = hour;
    // Hourly baseline occupancy profile for university campus:
    // 8 AM: 35%, 10 AM: 65%, 12 PM: 80%, 2 PM: 85%, 4 PM: 94% (PEAK), 6 PM: 60%, 8 PM: 28%
    const hourProfiles = {
      8: 35, 9: 50, 10: 68, 11: 76, 12: 82, 13: 80, 14: 86, 15: 89, 16: 94, 17: 85, 18: 62, 19: 45, 20: 25
    };
    const targetOccupiedCount = hourProfiles[hour] || 63;
    
    // Sort slots by ID and assign occupied status to reach targetOccupiedCount
    const sorted = [...this.slots].sort((a, b) => (a.num % 7) - (b.num % 7));
    sorted.forEach((slot, idx) => {
      slot.isOccupied = idx < targetOccupiedCount;
      if (slot.isOccupied && !slot.vehicleModel) {
        slot.vehicleModel = 'Campus Permit Driver';
        slot.occupiedSince = '45m ago';
      }
    });
  }
}

const state = new ParkingState();

// UI Rendering Engine
class DashboardUI {
  constructor() {
    this.initElements();
    this.bindEvents();
    this.renderAll();
    this.initHeroMiniGrid();
  }

  initElements() {
    // Navigation
    this.navLinks = document.querySelectorAll('.nav-link');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    
    // Summary HUD
    this.kpiTotal = document.getElementById('kpiTotal');
    this.kpiAvailable = document.getElementById('kpiAvailable');
    this.kpiOccupied = document.getElementById('kpiOccupied');
    this.kpiRate = document.getElementById('kpiRate');
    
    // Hero HUD
    this.heroAvailable = document.getElementById('heroAvailable');
    this.heroOccupancy = document.getElementById('heroOccupancy');
    this.heroMiniGrid = document.getElementById('heroMiniGrid');

    // Peak Alert Banner
    this.peakAlertBanner = document.getElementById('peakAlertBanner');
    this.peakAlertText = document.getElementById('peakAlertText');

    // Controls
    this.zoneSelect = document.getElementById('zoneSelect');
    this.filterBtns = document.querySelectorAll('.filter-btn');
    this.btnSimEntry = document.getElementById('btnSimEntry');
    this.btnSimExit = document.getElementById('btnSimExit');
    this.btnAutoStream = document.getElementById('btnAutoStream');
    this.timeScrubber = document.getElementById('timeScrubber');
    this.scrubberTimeDisplay = document.getElementById('scrubberTimeDisplay');

    // Grid Arena
    this.parkingSlotsGrid = document.getElementById('parkingSlotsGrid');
    this.activeZoneTitle = document.getElementById('activeZoneTitle');

    // Log Feed
    this.telemetryLogsContainer = document.getElementById('telemetryLogsContainer');

    // Modal
    this.slotModal = document.getElementById('slotModal');
    this.modalCloseBtn = document.getElementById('modalCloseBtn');
    this.modalBayId = document.getElementById('modalBayId');
    this.modalBayStatus = document.getElementById('modalBayStatus');
    this.modalBayZone = document.getElementById('modalBayZone');
    this.modalBayVehicle = document.getElementById('modalBayVehicle');
    this.modalBayDuration = document.getElementById('modalBayDuration');
    this.modalBayDistance = document.getElementById('modalBayDistance');
    this.modalBayBattery = document.getElementById('modalBayBattery');
    this.modalBtnToggle = document.getElementById('modalBtnToggle');
    this.currentInspectedSlot = null;

    // Architecture Simulation
    this.btnTriggerPipeline = document.getElementById('btnTriggerPipeline');
    this.pipelinePacket1 = document.getElementById('pipelinePacket1');
    this.pipelinePacket2 = document.getElementById('pipelinePacket2');
    this.stage1 = document.getElementById('stage1');
    this.stage2 = document.getElementById('stage2');
    this.stage3 = document.getElementById('stage3');
    this.archInspectorCode = document.getElementById('archInspectorCode');
    this.archStatusText = document.getElementById('archStatusText');
  }

  bindEvents() {
    // Zone selection
    this.zoneSelect.addEventListener('change', (e) => {
      state.currentZone = e.target.value;
      audio.playBeep(700, 0.04);
      this.renderSlots();
    });

    // Filter selection
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeFilter = btn.dataset.filter;
        audio.playBeep(650, 0.04);
        this.renderSlots();
      });
    });

    // Modal close
    this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    this.slotModal.addEventListener('click', (e) => {
      if (e.target === this.slotModal) this.closeModal();
    });

    // Modal Action (Reserve/Free slot)
    this.modalBtnToggle.addEventListener('click', () => {
      if (!this.currentInspectedSlot) return;
      const updated = state.toggleSlot(this.currentInspectedSlot.id);
      audio.playSlotClick(updated.isOccupied);
      this.addTelemetryLog(updated.id, updated.isOccupied ? 'ENTRY' : 'EXIT', `Manual dashboard action on ${updated.id}`);
      this.populateModal(updated);
      this.renderAll();
      this.triggerCloudPacket(updated.id, updated.isOccupied ? 'OCCUPIED' : 'AVAILABLE');
    });

    // Simulate Entry
    this.btnSimEntry.addEventListener('click', () => {
      const availableSlots = state.slots.filter(s => !s.isOccupied);
      if (availableSlots.length > 0) {
        const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        state.toggleSlot(slot.id);
        audio.playBeep(520, 0.1, 'sawtooth');
        this.addTelemetryLog(slot.id, 'ENTRY', `Ultrasonic node detected car arrival at ${slot.id}`);
        this.renderAll();
        this.triggerCloudPacket(slot.id, 'OCCUPIED');
      }
    });

    // Simulate Exit
    this.btnSimExit.addEventListener('click', () => {
      const occupiedSlots = state.slots.filter(s => s.isOccupied);
      if (occupiedSlots.length > 0) {
        const slot = occupiedSlots[Math.floor(Math.random() * occupiedSlots.length)];
        state.toggleSlot(slot.id);
        audio.playBeep(880, 0.1, 'sine');
        this.addTelemetryLog(slot.id, 'EXIT', `IR beam cleared: Vehicle departed from ${slot.id}`);
        this.renderAll();
        this.triggerCloudPacket(slot.id, 'AVAILABLE');
      }
    });

    // Auto Stream toggle
    this.btnAutoStream.addEventListener('click', () => {
      state.autoStreaming = !state.autoStreaming;
      if (state.autoStreaming) {
        this.btnAutoStream.classList.add('auto-active');
        this.btnAutoStream.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>
          Pause Live Stream
        `;
        audio.playBeep(920, 0.1);
        state.streamInterval = setInterval(() => {
          const { slot } = state.simulateEvent();
          this.addTelemetryLog(slot.id, slot.isOccupied ? 'ENTRY' : 'EXIT', `IoT sensor event streamed for ${slot.id}`);
          this.renderAll();
        }, 2600);
      } else {
        this.btnAutoStream.classList.remove('auto-active');
        this.btnAutoStream.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Auto-Stream Sensor Events
        `;
        clearInterval(state.streamInterval);
        audio.playBeep(440, 0.08);
      }
    });

    // Time Scrubber
    this.timeScrubber.addEventListener('input', (e) => {
      const hour = parseInt(e.target.value, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      const timeStr = `${displayHour}:00 ${ampm}`;
      this.scrubberTimeDisplay.textContent = timeStr;
      
      state.applyTimeScrub(hour);
      audio.playBeep(400 + hour * 30, 0.03);
      this.renderAll();
    });

    // Audio Mute/Unmute toggle
    this.soundToggleBtn.addEventListener('click', () => {
      audio.enabled = !audio.enabled;
      this.soundToggleBtn.title = audio.enabled ? "Mute audio cues" : "Unmute audio cues";
      this.soundToggleBtn.style.opacity = audio.enabled ? "1" : "0.5";
      if (audio.enabled) audio.playBeep(880, 0.08);
    });

    // Architecture Pipeline Trigger Button
    this.btnTriggerPipeline.addEventListener('click', () => {
      const randomSlot = state.slots[Math.floor(Math.random() * state.slots.length)];
      this.triggerCloudPacket(randomSlot.id, randomSlot.isOccupied ? 'OCCUPIED' : 'AVAILABLE');
    });

    // Scrollspy for nav links
    window.addEventListener('scroll', () => {
      const sections = document.querySelectorAll('section[id]');
      const scrollY = window.pageYOffset;
      sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 120;
        const sectionId = section.getAttribute('id');
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
              link.classList.add('active');
            }
          });
        }
      });
    });
  }

  renderAll() {
    this.renderKPIs();
    this.renderSlots();
    this.updatePeakAlert();
  }

  renderKPIs() {
    const metrics = state.getMetrics();
    this.kpiTotal.textContent = metrics.total;
    this.kpiAvailable.textContent = metrics.available;
    this.kpiOccupied.textContent = metrics.occupied;
    this.kpiRate.textContent = `${metrics.rate}%`;

    if (this.heroAvailable) this.heroAvailable.textContent = metrics.available;
    if (this.heroOccupancy) this.heroOccupancy.textContent = `${metrics.rate}%`;
  }

  updatePeakAlert() {
    const metrics = state.getMetrics();
    // At 4 PM or occupancy > 85%, show high alert
    if (state.selectedTimeHour === 16 || metrics.rate >= 85) {
      this.peakAlertBanner.style.display = 'flex';
      this.peakAlertText.textContent = `PEAK ALERT 4 PM: Campus occupancy at ${metrics.rate}% — High demand detected in Zone A & B. Recommend Zone C (Student Center).`;
    } else if (metrics.rate >= 75) {
      this.peakAlertBanner.style.display = 'flex';
      this.peakAlertText.textContent = `MODERATE LOAD: Campus occupancy at ${metrics.rate}%. Slots filling rapidly.`;
    } else {
      this.peakAlertBanner.style.display = 'none';
    }
  }

  renderSlots() {
    const zoneInfo = state.zones[state.currentZone];
    this.activeZoneTitle.textContent = `${zoneInfo.name} (${state.currentZone}01 - ${state.currentZone}${zoneInfo.total})`;

    let filtered = state.slots.filter(s => s.zone === state.currentZone);
    if (state.activeFilter === 'available') filtered = filtered.filter(s => !s.isOccupied);
    if (state.activeFilter === 'occupied') filtered = filtered.filter(s => s.isOccupied);
    if (state.activeFilter === 'ev') filtered = filtered.filter(s => s.isEV);
    if (state.activeFilter === 'accessible') filtered = filtered.filter(s => s.isAccessible);

    this.parkingSlotsGrid.innerHTML = '';

    filtered.forEach(slot => {
      const card = document.createElement('div');
      card.className = `parking-slot-card ${slot.isOccupied ? 'occupied' : 'available'}`;
      card.dataset.slotId = slot.id;

      card.innerHTML = `
        <span class="slot-id-label">${slot.id}</span>
        ${slot.isEV ? `<span class="slot-ev-marker" title="EV Charging Station">⚡</span>` : ''}
        <div class="slot-center-icon">
          ${slot.isOccupied ? `
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="8"></circle>
              <polyline points="12 8 12 12 14 14"></polyline>
            </svg>
          `}
        </div>
        <span class="slot-footer-badge">${slot.isOccupied ? 'OCCUPIED' : 'OPEN'}</span>
      `;

      card.addEventListener('click', () => {
        this.openModal(slot);
      });

      this.parkingSlotsGrid.appendChild(card);
    });
  }

  initHeroMiniGrid() {
    if (!this.heroMiniGrid) return;
    this.heroMiniGrid.innerHTML = '';
    
    // 18 mini slots preview for the hero card
    const heroSlots = state.slots.slice(0, 18);
    heroSlots.forEach(slot => {
      const mini = document.createElement('div');
      mini.className = `mini-slot ${slot.isOccupied ? 'occupied' : 'available'}`;
      mini.textContent = slot.id;
      mini.title = `${slot.id}: ${slot.isOccupied ? 'Occupied' : 'Available'}`;
      mini.addEventListener('click', () => {
        state.toggleSlot(slot.id);
        mini.className = `mini-slot ${slot.isOccupied ? 'occupied' : 'available'}`;
        audio.playSlotClick(slot.isOccupied);
        this.renderAll();
      });
      this.heroMiniGrid.appendChild(mini);
    });
  }

  openModal(slot) {
    this.currentInspectedSlot = slot;
    this.populateModal(slot);
    this.slotModal.classList.add('active');
    audio.playBeep(750, 0.05);
  }

  populateModal(slot) {
    this.modalBayId.textContent = `SLOT ${slot.id}`;
    this.modalBayStatus.textContent = slot.isOccupied ? 'OCCUPIED' : 'AVAILABLE';
    this.modalBayStatus.className = `modal-bay-badge ${slot.isOccupied ? 'occupied' : 'available'}`;
    this.modalBayZone.textContent = state.zones[slot.zone].name;
    this.modalBayVehicle.textContent = slot.isOccupied ? slot.vehicleModel : 'None (Ready for Parking)';
    this.modalBayDuration.textContent = slot.isOccupied ? slot.occupiedSince : 'Open for arrival';
    this.modalBayDistance.textContent = slot.distanceToEntrance;
    this.modalBayBattery.textContent = `${slot.batteryLevel}% (Solar Mesh)`;

    if (slot.isOccupied) {
      this.modalBtnToggle.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        Simulate Vehicle Departure
      `;
      this.modalBtnToggle.className = 'btn-primary';
    } else {
      this.modalBtnToggle.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        Simulate Vehicle Parking
      `;
      this.modalBtnToggle.className = 'btn-primary';
    }
  }

  closeModal() {
    this.slotModal.classList.remove('active');
    this.currentInspectedSlot = null;
    audio.playBeep(500, 0.04);
  }

  addTelemetryLog(slotId, type, message) {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = document.createElement('div');
    entry.className = 'log-entry-item';
    entry.innerHTML = `
      <span class="log-timestamp">[${time}]</span>
      <span class="log-msg ${type === 'ENTRY' ? 'entry' : 'exit'}">● ${type}</span>
      <span>${message}</span>
    `;
    this.telemetryLogsContainer.insertBefore(entry, this.telemetryLogsContainer.firstChild);
    
    // Trim to 15 logs max
    while (this.telemetryLogsContainer.children.length > 15) {
      this.telemetryLogsContainer.removeChild(this.telemetryLogsContainer.lastChild);
    }
  }

  triggerCloudPacket(slotId, status) {
    audio.playPacketStream();
    this.archStatusText.textContent = `Streaming packet: Node ${slotId} -> AWS API Gateway`;
    
    // Highlight Stage 1
    this.stage1.classList.add('active-stage');
    this.pipelinePacket1.classList.add('animating');

    const timestamp = new Date().toISOString();
    const mockPayload = {
      eventVersion: "1.0",
      source: "skystack.sensor.iot",
      timestamp,
      detail: {
        sensorId: `SN-ESP32-${slotId}`,
        zone: slotId.charAt(0),
        slotId,
        status,
        confidence: 0.994,
        battery: "97.8%",
        latencyMs: 18.2
      }
    };

    this.archInspectorCode.textContent = JSON.stringify(mockPayload, null, 2);

    setTimeout(() => {
      this.stage1.classList.remove('active-stage');
      this.stage2.classList.add('active-stage');
      this.archStatusText.textContent = `AWS Lambda invoking handler: Processing state for ${slotId}`;
    }, 450);

    setTimeout(() => {
      this.pipelinePacket1.classList.remove('animating');
      this.pipelinePacket2.classList.add('animating');
      this.stage2.classList.remove('active-stage');
      this.stage3.classList.add('active-stage');
      this.archStatusText.textContent = `DynamoDB PutItem successful: State synchronized to Dashboard`;
    }, 900);

    setTimeout(() => {
      this.pipelinePacket2.classList.remove('animating');
      this.stage3.classList.remove('active-stage');
      this.archStatusText.textContent = `Cloud Pipeline IDLE • Waiting for next sensor event`;
    }, 1400);
  }
}

// Boot up once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.skystackDashboard = new DashboardUI();
});
