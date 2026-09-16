// ========== DOCUMENT DATA STRUCTURE (HL7-CDA) =========
class ClinicalDocument {
    constructor(data) {
        this.id = this.generateUUID();
        this.timestamp = new Date();
        this.patient = data.patient;
        this.author = data.author;
        this.documentType = data.type;
        this.title = data.title;
        this.content = data.content;
        this.diagnosis = data.diagnosis;
        this.treatment = data.treatment;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    toHL7CDA() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
    <realmCode code="PL"/>
    <typeId root="2.16.840.1.113883.1.3"/>
    <templateId root="2.16.840.1.113883.3.27.1.1"/>
    <id extension="${this.id}" root="2.16.840.1.113883.3.27"/>
    <code code="${this.getDocumentCode()}" displayName="${this.documentType}"/>
    <title>${this.title}</title>
    <effectiveTime value="${this.formatDate(this.timestamp)}"/>
    <confidentialityCode code="N"/>
    <languageCode code="pl-PL"/>
    
    <recordTarget typeCode="RCT">
        <patientRole classCode="PAT">
            <id extension="${this.patient.pesel}" root="2.16.840.1.113883.3.27.100"/>
            <addr>
                <streetAddressLine>${this.patient.address || 'N/A'}</streetAddressLine>
            </addr>
            <telecom value="${this.patient.phone}" use="MC"/>
            <patient>
                <name>
                    <given>${this.patient.firstName}</given>
                    <family>${this.patient.lastName}</family>
                </name>
                <administrativeGenderCode code="${this.patient.gender || 'U'}"/>
                <birthTime value="${this.patient.birthDate}"/>
            </patient>
        </patientRole>
    </recordTarget>

    <author typeCode="AUT">
        <time value="${this.formatDate(this.timestamp)}"/>
        <assignedAuthor classCode="ASSIGNED">
            <id root="2.16.840.1.113883.3.27.1"/>
            <assignedPerson>
                <name>
                    <given>${this.author.firstName}</given>
                    <family>${this.author.lastName}</family>
                </name>
            </assignedPerson>
        </assignedAuthor>
    </author>

    <custodian typeCode="CST">
        <assignedCustodian classCode="ASSIGNED">
            <representedCustodianOrganization classCode="ORG">
                <id root="2.16.840.1.113883.3.27.2"/>
                <name>Przychnia MEDYC</name>
                <telecom value="+48 22 123 45 67" use="WP"/>
            </representedCustodianOrganization>
        </assignedCustodian>
    </custodian>

    <component typeCode="COMP">
        <structuredBody>
            <component typeCode="COMP">
                <section>
                    <title>Historia choroby</title>
                    <text>${this.content}</text>
                </section>
            </component>
            <component typeCode="COMP">
                <section>
                    <title>Diagnoza (ICD-10)</title>
                    <text>${this.diagnosis || 'Brak diagnozy'}</text>
                </section>
            </component>
            <component typeCode="COMP">
                <section>
                    <title>Zalecenia i leczenie</title>
                    <text>${this.treatment || 'Brak zaleceń'}</text>
                </section>
            </component>
        </structuredBody>
    </component>
</ClinicalDocument>`;
    }

    getDocumentCode() {
        const codes = {
            'history': '11490-0',
            'referral': '34117-2',
            'prescription': '52291-2',
            'test': '34794-3',
            'report': '18842-5'
        };
        return codes[this.documentType] || '34794-3';
    }

    formatDate(date) {
        return date.toISOString().replace(/[-:]/g, '').substring(0, 14);
    }
}

// ========== INITIALIZATION =========
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupNavigation();
    setupEventListeners();
    initializeCalendar();
    loadStoredData();
}

// ========== NAVIGATION =========
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);
            
            navBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.classList.add('active');
    }
}

// ========== EVENT LISTENERS =========
function setupEventListeners() {
    // Pacjenci section
    document.getElementById('btn-dodaj-pacjenta')?.addEventListener('click', () => openModal('modal-pacjent'));
    document.getElementById('form-pacjent')?.addEventListener('submit', addPatient);
    document.getElementById('search-pacjent')?.addEventListener('input', searchPatients);

    // Admin tabs
    const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
    adminTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            showAdminTab(tabName);
            
            adminTabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Close modal
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });

    // Document form
    document.getElementById('document-form')?.addEventListener('submit', createDocument);

    // Appointment form
    document.getElementById('appointment-form')?.addEventListener('submit', scheduleAppointment);
}

// ========== MODAL FUNCTIONS =========
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
});

// ========== PATIENT MANAGEMENT =========
let patients = [];

function addPatient(e) {
    e.preventDefault();
    
    const patient = {
        id: Date.now(),
        firstName: document.getElementById('pacjent-imie').value,
        lastName: document.getElementById('pacjent-nazwisko').value,
        pesel: document.getElementById('pacjent-pesel').value,
        birthDate: document.getElementById('pacjent-data-ur').value,
        phone: document.getElementById('pacjent-telefon').value,
        email: document.getElementById('pacjent-email').value,
        address: document.getElementById('pacjent-adres').value
    };

    patients.push(patient);
    saveData('patients', patients);
    
    const tbody = document.getElementById('pacjenci-table-body');
    addPatientRow(tbody, patient);
    
    closeModal('modal-pacjent');
    document.getElementById('form-pacjent').reset();
    
    showAlert('Pacjent dodany pomyślnie!', 'success');
}

function addPatientRow(tbody, patient) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${patient.firstName} ${patient.lastName}</td>
        <td>${patient.phone}</td>
        <td>${patient.email}</td>
        <td>${patient.pesel}</td>
        <td>${patient.birthDate}</td>
        <td class="actions">
            <button class="action-btn edit">✏️</button>
            <button class="action-btn delete">🗑️</button>
        </td>
    `;
    
    row.querySelector('.delete').addEventListener('click', () => {
        patients = patients.filter(p => p.id !== patient.id);
        saveData('patients', patients);
        row.remove();
        showAlert('Pacjent usunięty!', 'info');
    });
    
    tbody.appendChild(row);
}

function searchPatients(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#pacjenci-table-body tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ========== DOCUMENT MANAGEMENT =========
let documents = [];

function createDocument(e) {
    e.preventDefault();
    
    const pacientSelect = document.getElementById('doc-pacient');
    const pacientValue = pacientSelect.value;
    const pacient = patients.find(p => p.id == pacientValue);
    
    if (!pacient) {
        showAlert('Proszę wybrać pacjenta!', 'error');
        return;
    }

    const doctor = {
        firstName: 'Dr.',
        lastName: document.getElementById('doc-doctor').value
    };

    const docData = {
        patient: pacient,
        author: doctor,
        type: document.getElementById('doc-type').value,
        title: document.getElementById('doc-title').value,
        content: document.getElementById('doc-content').value,
        diagnosis: document.getElementById('doc-diagnosis').value,
        treatment: document.getElementById('doc-treatment').value
    };

    const clinicalDoc = new ClinicalDocument(docData);
    documents.push(clinicalDoc);
    saveData('documents', documents);

    addDocumentToTable(clinicalDoc);
    document.getElementById('document-form').reset();
    
    showAlert('Dokument HL7-CDA utworzony pomyślnie!', 'success');
}

function addDocumentToTable(doc) {
    const tbody = document.getElementById('documents-table-body');
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${doc.timestamp.toLocaleDateString('pl-PL')}</td>
        <td>${doc.documentType}</td>
        <td>${doc.patient.firstName} ${doc.patient.lastName}</td>
        <td>${doc.author.firstName} ${doc.author.lastName}</td>
        <td>${doc.title}</td>
        <td class="actions">
            <button class="action-btn" onclick="viewDocument('${doc.id}')">👁️</button>
            <button class="action-btn" onclick="downloadCDA('${doc.id}')">📥</button>
            <button class="action-btn delete" onclick="deleteDocument('${doc.id}')">🗑️</button>
        </td>
    `;
    
    tbody.appendChild(row);
}

function viewDocument(docId) {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
        const cdaContent = doc.toHL7CDA();
        const blob = new Blob([cdaContent], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        window.open(url);
    }
}

function downloadCDA(docId) {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
        const cdaContent = doc.toHL7CDA();
        const blob = new Blob([cdaContent], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dokument_${doc.id}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showAlert('Dokument pobrany!', 'success');
    }
}

function deleteDocument(docId) {
    if (confirm('Czy na pewno chcesz usunąć ten dokument?')) {
        documents = documents.filter(d => d.id !== docId);
        saveData('documents', documents);
        location.reload();
        showAlert('Dokument usunięty!', 'info');
    }
}

// ========== APPOINTMENT SCHEDULING =========
let appointments = [];

function scheduleAppointment(e) {
    e.preventDefault();
    
    const appointment = {
        id: Date.now(),
        pacient: document.getElementById('appointment-pacient').value,
        date: document.getElementById('appointment-date').value,
        time: document.getElementById('appointment-time').value,
        doctor: document.getElementById('appointment-doctor').value,
        type: document.getElementById('appointment-type').value,
        notes: document.getElementById('appointment-notes').value
    };

    appointments.push(appointment);
    saveData('appointments', appointments);
    
    document.getElementById('appointment-form').reset();
    showAlert('Wizyta zapisana pomyślnie!', 'success');
}

// ========== CALENDAR =========
let currentDate = new Date();

function initializeCalendar() {
    renderCalendar();
    
    document.querySelector('.nav-prev')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.querySelector('.nav-next')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
    
    document.getElementById('calendar-title').textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const grid = document.querySelector('.calendar-grid');
    const dayElements = grid.querySelectorAll('.calendar-day');
    
    dayElements.forEach((el, index) => {
        if (index < startingDayOfWeek || index >= startingDayOfWeek + daysInMonth) {
            el.style.opacity = '0.3';
            el.innerHTML = '';
        } else {
            const dayNum = index - startingDayOfWeek + 1;
            el.style.opacity = '1';
            el.innerHTML = `<div class="day-number">${dayNum}</div><div class="appointments"></div>`;
        }
    });
}

// ========== ADMIN TABS =========
function showAdminTab(tabName) {
    const contents = document.querySelectorAll('.admin-tab-content');
    contents.forEach(content => content.classList.remove('active'));
    
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

// ========== LOCAL STORAGE =========
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function loadStoredData() {
    patients = JSON.parse(localStorage.getItem('patients')) || [];
    documents = JSON.parse(localStorage.getItem('documents')) || [];
    appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    
    // Render stored patients
    const tbody = document.getElementById('pacjenci-table-body');
    if (tbody && patients.length > 0) {
        tbody.innerHTML = '';
        patients.forEach(patient => addPatientRow(tbody, patient));
    }
    
    // Render stored documents
    const docTbody = document.getElementById('documents-table-body');
    if (docTbody && documents.length > 0) {
        docTbody.innerHTML = '';
        documents.forEach(doc => addDocumentToTable(doc));
    }
}

// ========== ALERTS =========
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(alert, mainContent.firstChild);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// ========== EXPORT & UTILITIES =========
function exportPatientsList() {
    const csv = 'IMIĘ,NAZWISKO,PESEL,DATA URODZENIA,TELEFON,EMAIL\n' +
        patients.map(p => `${p.firstName},${p.lastName},${p.pesel},${p.birthDate},${p.phone},${p.email}`).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pacjenci_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function printDocument() {
    window.print();
}

// ========== KEYBOARD SHORTCUTS =========
document.addEventListener('keydown', function(e) {
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        showAlert('Dane zapisane!', 'success');
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => modal.classList.remove('active'));
    }
});
