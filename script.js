document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const labSelect = document.getElementById('lab-select');
    const pcIdInput = document.getElementById('pc-id');
    const studentNameInput = document.getElementById('student-name');
    const rollNumberInput = document.getElementById('roll-number');
    const studentClassInput = document.getElementById('student-class');
    const studentDivInput = document.getElementById('student-div');
    const fromTimeInput = document.getElementById('from-time');
    const toTimeInput = document.getElementById('to-time');
    const pcTableBody = document.querySelector('#pc-table tbody');
    const recordsTableBody = document.querySelector('#records-table tbody');
    const filterLabSelect = document.getElementById('filter-lab');
    const filterDateInput = document.getElementById('filter-date');

    // Application State
    let labs = {};
    let currentLab = null;
    let currentPc = null;
    let usageRecords = [];

    function initialize() {
        loadFromLocalStorage();
        updateLabSelector();
        setupTimeInputs();
        setupEventListeners();
        fromTimeInput.value = '09:00';
        toTimeInput.value = '11:00';
        filterDateInput.valueAsDate = new Date();
    }

    // Data persistence functions
    function saveToLocalStorage() {
        localStorage.setItem('labPcData', JSON.stringify({ labs, usageRecords }));
    }

    function loadFromLocalStorage() {
        const savedData = localStorage.getItem('labPcData');
        if (savedData) {
            const data = JSON.parse(savedData);
            labs = data.labs || {};
            usageRecords = data.usageRecords || [];
            updateRecordsTable(usageRecords);
        }
    }

    function setupTimeInputs() {
        fromTimeInput.step = '900';
        toTimeInput.step = '900';
    }

    function formatTimeAMPM(timeStr) {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes.padStart(2, '0')} ${ampm}`;
    }

    // Lab management functions
    function updateLabSelector() {
        const labOptions = Object.keys(labs).map(lab => 
            `<option value="${lab}">${lab.toUpperCase()}</option>`
        ).join('');
        labSelect.innerHTML = '<option value="">Select Lab</option>' + labOptions;
        filterLabSelect.innerHTML = '<option value="">All Labs</option>' + labOptions;
    }

    function handleAddLab() {
        const labName = prompt('Enter new lab name:');
        if (labName && labName.trim()) {
            const labId = labName.trim().toLowerCase();
            if (!labs[labId]) {
                labs[labId] = [];
                updateLabSelector();
                saveToLocalStorage();
                alert(`Lab ${labId.toUpperCase()} created`);
            } else {
                alert('Lab already exists');
            }
        }
    }

    function handleUpdateLab() {
        if (!currentLab) return alert('Select a lab first');
        const newName = prompt('Enter new lab name:', currentLab);
        if (newName && newName.trim() && newName !== currentLab) {
            const newId = newName.trim().toLowerCase();
            if (!labs[newId]) {
                usageRecords = usageRecords.map(record => 
                    record.lab === currentLab ? {...record, lab: newId} : record
                );
                labs[newId] = labs[currentLab];
                delete labs[currentLab];
                currentLab = newId;
                updateLabSelector();
                labSelect.value = newId;
                saveToLocalStorage();
                alert('Lab updated');
            } else {
                alert('Lab name exists');
            }
        }
    }

    function handleDeleteLab() {
        if (!currentLab) return alert('Select a lab first');
        if (confirm(`Delete lab ${currentLab.toUpperCase()}?`)) {
            delete labs[currentLab];
            currentLab = null;
            labSelect.value = '';
            pcTableBody.innerHTML = '';
            updateLabSelector();
            saveToLocalStorage();
            alert('Lab deleted');
        }
    }

    // PC management functions
    function loadLabPcs() {
        currentLab = labSelect.value;
        if (!currentLab) {
            pcTableBody.innerHTML = '';
            return;
        }

        if (!labs[currentLab]) labs[currentLab] = [];

        pcTableBody.innerHTML = labs[currentLab].map(pc => `
            <tr>
                <td>${pc.id}</td>
                <td>${pc.name}</td>
                <td>${pc.roll}</td>
                <td>${pc.class}</td>
                <td>${pc.div}</td>
                <td class="time-display">${formatTimeAMPM(pc.from)} - ${formatTimeAMPM(pc.to)}</td>
                <td>
                    <button class="action-btn edit-btn" data-id="${pc.id}">Edit</button>
                    <button class="action-btn delete-btn" data-id="${pc.id}">Delete</button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => editPc(btn.getAttribute('data-id')));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm(`Delete PC ${btn.getAttribute('data-id')}?`)) {
                    deletePc(btn.getAttribute('data-id'));
                }
            });
        });
    }

    function handleAddPc() {
        if (!currentLab) return alert('Select a lab first');
        const pcId = pcIdInput.value.trim();
        if (!pcId) return alert('Enter PC ID');
        
        // Check if PC exists in any lab
        let existingPc = null;
        let sourceLab = null;
        for (const [labId, pcs] of Object.entries(labs)) {
            const foundPc = pcs.find(pc => pc.id === pcId);
            if (foundPc) {
                existingPc = foundPc;
                sourceLab = labId;
                break;
            }
        }

        if (existingPc) {
            if (confirm(`Move PC ${pcId} from ${sourceLab} to ${currentLab}?`)) {
                labs[sourceLab] = labs[sourceLab].filter(pc => pc.id !== pcId);
                labs[currentLab].push(existingPc);
                loadLabPcs();
                saveToLocalStorage();
            }
            return;
        }

        labs[currentLab].push({
            id: pcId,
            name: '',
            roll: '',
            class: '',
            div: '',
            from: fromTimeInput.value,
            to: toTimeInput.value
        });

        pcIdInput.value = '';
        loadLabPcs();
        saveToLocalStorage();
    }

    function editPc(pcId) {
        // Remove highlight from all rows
        document.querySelectorAll('#pc-table tr').forEach(row => {
          row.classList.remove('currently-editing');
        });
      
        const pc = labs[currentLab].find(pc => pc.id === pcId);
        if (!pc) return;
      
        currentPc = pc;
        
        // Apply highlight to the edited row
        const rows = document.querySelectorAll('#pc-table tr');
        for (const row of rows) {
          if (row.querySelector('td:first-child')?.textContent === pcId) {
            row.classList.add('currently-editing');
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            break;
          }
        }
      
        // Fill form
        studentNameInput.value = pc.name;
        rollNumberInput.value = pc.roll;
        studentClassInput.value = pc.class;
        studentDivInput.value = pc.div;
        fromTimeInput.value = pc.from;
        toTimeInput.value = pc.to;
      }

    function updatePc() {
        if (!currentPc) return alert('Select a PC first');
        const newId = pcIdInput.value.trim();
        if (!newId) return alert('Enter new PC ID');
        
        if (labs[currentLab].some(pc => pc.id === newId && pc !== currentPc)) {
            return alert('PC ID exists in this lab');
        }

        // Check other labs
        for (const [labId, pcs] of Object.entries(labs)) {
            if (labId !== currentLab && pcs.some(pc => pc.id === newId)) {
                return alert('PC ID exists in another lab');
            }
        }

        currentPc.id = newId;
        loadLabPcs();
        pcIdInput.value = '';
        currentPc = null;
        saveToLocalStorage();
    }

    function savePcDetails() {
        if (!currentPc) return alert('No PC selected');
        
        const wasInUse = currentPc.name && currentPc.from && currentPc.to;
        const prevFrom = currentPc.from;
        const prevTo = currentPc.to;

        currentPc.name = studentNameInput.value.trim();
        currentPc.roll = rollNumberInput.value.trim();
        currentPc.class = studentClassInput.value;
        currentPc.div = studentDivInput.value;
        currentPc.from = fromTimeInput.value;
        currentPc.to = toTimeInput.value;

        const isNowInUse = currentPc.name && currentPc.from && currentPc.to;
        const timeChanged = prevFrom !== currentPc.from || prevTo !== currentPc.to;
        
        if ((!wasInUse && isNowInUse) || (wasInUse && isNowInUse && timeChanged)) {
            recordPcUsage(currentPc);
        }

        document.querySelectorAll('#pc-table tr').forEach(row => {
            row.classList.remove('currently-editing');
          });

        loadLabPcs();
        clearForm();
        currentPc = null;
        saveToLocalStorage();
    }

    function deletePc(pcId) {
        if (!pcId) {
            pcId = pcIdInput.value.trim();
            if (!pcId) {
                alert('Please enter a PC ID to delete');
                return;
            }
        }
    
        if (!currentLab) {
            alert('Please select a lab first');
            return;
        }
    
        const index = labs[currentLab].findIndex(pc => pc.id === pcId);
        if (index === -1) {
            alert('PC not found in this lab');
            return;
        }
    
        // Remove PC from lab
        labs[currentLab].splice(index, 1);
        
        // Remove all usage records for this PC
        usageRecords = usageRecords.filter(record => record.pcId !== pcId);
        
        // Update UI and storage
        loadLabPcs();
        updateRecordsTable(usageRecords);
        pcIdInput.value = '';
        currentPc = null;
        saveToLocalStorage();
        
        alert(`PC ${pcId} and its usage records deleted successfully`);
    }

    function handleDeleteLab() {
        if (!currentLab) {
            alert('Please select a lab to delete');
            return;
        }
    
        if (confirm(`Are you sure you want to delete lab ${currentLab.toUpperCase()}? This will also delete all its PCs and records.`)) {
            // Remove all records for this lab
            usageRecords = usageRecords.filter(record => record.lab !== currentLab);
            
            // Delete the lab
            delete labs[currentLab];
            currentLab = null;
            
            // Update UI
            labSelect.value = '';
            pcTableBody.innerHTML = '';
            updateRecordsTable(usageRecords);
            updateLabSelector();
            
            saveToLocalStorage();
            alert('Lab and all associated records deleted successfully');
        }
    }

    // Record management functions
    function recordPcUsage(pc) {
        const now = new Date();
        const record = {
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().substring(0, 5),
            lab: currentLab,
            pcId: pc.id,
            studentName: pc.name,
            rollNumber: pc.roll,
            studentClass: pc.class,
            division: pc.div,
            fromTime: formatTimeAMPM(pc.from),
            toTime: formatTimeAMPM(pc.to),
            duration: calculateDuration(pc.from, pc.to)
        };
        
        const existingIndex = usageRecords.findIndex(r => 
            r.pcId === pc.id && r.date === record.date
        );
        
        if (existingIndex >= 0) {
            usageRecords[existingIndex] = record;
        } else {
            usageRecords.push(record);
        }
        
        updateRecordsTable(usageRecords);
        saveToLocalStorage();
    }

    function calculateDuration(from, to) {
        const [fromH, fromM] = from.split(':').map(Number);
        const [toH, toM] = to.split(':').map(Number);
        const duration = (toH - fromH) * 60 + (toM - fromM);
        return `${Math.floor(duration/60)}h ${duration%60}m`;
    }

    function updateRecordsTable(records) {
        recordsTableBody.innerHTML = records.map(record => `
            <tr>
                <td>${record.date}</td>
                <td>${record.lab.toUpperCase()}</td>
                <td>${record.pcId}</td>
                <td>${record.studentName}</td>
                <td>${record.rollNumber}</td>
                <td>${record.studentClass}</td>
                <td>${record.division}</td>
                <td class="time-display">${record.fromTime} - ${record.toTime}</td>
                <td class="duration-cell">${record.duration}</td>
            </tr>
        `).join('');
    }

    function filterRecords() {
        const labFilter = filterLabSelect.value;
        const dateFilter = filterDateInput.value;
        
        let filtered = usageRecords;
        if (labFilter) filtered = filtered.filter(r => r.lab === labFilter);
        if (dateFilter) filtered = filtered.filter(r => r.date === dateFilter);
        updateRecordsTable(filtered);
    }

    function exportRecords() {
        if (!usageRecords.length) return alert('No records to export');
        
        const csv = [
            ['Date', 'Lab', 'PC ID', 'Student Name', 'Roll No.', 'Class', 'Division', 'Time Slot', 'Duration'],
            ...usageRecords.map(r => [
                r.date, r.lab, r.pcId, r.studentName, r.rollNumber, 
                r.studentClass, r.division, `${r.fromTime}-${r.toTime}`, r.duration
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pc_records_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    }

    // Clear functions
    function clearAllRecords() {
        if (confirm('Delete ALL data?') && prompt('Type "DELETE ALL"') === 'DELETE ALL') {
            labs = {};
            usageRecords = [];
            currentLab = null;
            currentPc = null;
            labSelect.innerHTML = '<option value="">Select Lab</option>';
            filterLabSelect.innerHTML = '<option value="">All Labs</option>';
            pcTableBody.innerHTML = '';
            recordsTableBody.innerHTML = '';
            clearForm();
            localStorage.removeItem('labPcData');
        }
    }

    function clearUsageRecords() {
        if (confirm('Delete ALL usage records?') && prompt('Type "DELETE RECORDS"') === 'DELETE RECORDS') {
            usageRecords = [];
            updateRecordsTable(usageRecords);
            saveToLocalStorage();
        }
    }

    function clearForm() {
        studentNameInput.value = '';
        rollNumberInput.value = '';
        studentClassInput.value = '';
        studentDivInput.value = '';
        fromTimeInput.value = '09:00';
        toTimeInput.value = '11:00';

        document.querySelectorAll('#pc-table tr').forEach(row => {
            row.classList.remove('currently-editing');
        });
    }

    // Event listeners setup
    function setupEventListeners() {
        document.getElementById('add-lab-btn').addEventListener('click', handleAddLab);
        document.getElementById('update-lab-btn').addEventListener('click', handleUpdateLab);
        document.getElementById('delete-lab-btn').addEventListener('click', handleDeleteLab);
        document.getElementById('add-pc-btn').addEventListener('click', handleAddPc);
        document.getElementById('update-pc-btn').addEventListener('click', updatePc);
        document.getElementById('delete-pc-btn').addEventListener('click', () => {
            const pcId = pcIdInput.value.trim();
            if (!pcId) return alert('Enter PC ID to delete');
            deletePc(pcId);
        });
        document.getElementById('save-details-btn').addEventListener('click', savePcDetails);
        document.getElementById('filter-btn').addEventListener('click', filterRecords);
        document.getElementById('export-btn').addEventListener('click', exportRecords);
        document.getElementById('clear-all-btn').addEventListener('click', clearAllRecords);
        document.getElementById('clear-records-btn').addEventListener('click', clearUsageRecords);
        labSelect.addEventListener('change', loadLabPcs);
    }

    initialize();
});