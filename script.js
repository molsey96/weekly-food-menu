// Menu data structure
let menuData = {
    monday: { breakfast: '', lunch: '', dinner: '' },
    tuesday: { breakfast: '', lunch: '', dinner: '' },
    wednesday: { breakfast: '', lunch: '', dinner: '' },
    thursday: { breakfast: '', lunch: '', dinner: '' },
    friday: { breakfast: '', lunch: '', dinner: '' },
    saturday: { breakfast: '', lunch: '', dinner: '' },
    sunday: { breakfast: '', lunch: '', dinner: '' }
};

// Read-only mode flag
let isReadOnlyMode = false;

// Cloud sync storage ID (will be created on first sync)
let cloudBlobId = localStorage.getItem('cloudBlobId') || null;
const BLOB_API_URL = 'https://jsonblob.com/api/jsonBlob';

// DOM Elements
const modal = document.getElementById('mealModal');
const shareModal = document.getElementById('shareModal');
const importModal = document.getElementById('importModal');
const clearWeekBtn = document.getElementById('clearWeekBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const mealForm = document.getElementById('mealForm');
const cancelBtn = document.getElementById('cancelBtn');
const closeBtn = document.querySelectorAll('.close');
const daySelect = document.getElementById('daySelect');
const mealSelect = document.getElementById('mealSelect');
const mealInput = document.getElementById('mealInput');
const shareLinkInput = document.getElementById('shareLinkInput');
const shareTextInput = document.getElementById('shareTextInput');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const copyTextBtn = document.getElementById('copyTextBtn');
const closeShareBtn = document.getElementById('closeShareBtn');
const importInput = document.getElementById('importInput');
const cancelImportBtn = document.getElementById('cancelImportBtn');
const confirmImportBtn = document.getElementById('confirmImportBtn');

// Load menu from localStorage
function loadMenu() {
    const saved = localStorage.getItem('weeklyMenu');
    if (saved) {
        menuData = JSON.parse(saved);
    }
    updateDisplay();
}

// Save menu to localStorage
function saveMenu() {
    localStorage.setItem('weeklyMenu', JSON.stringify(menuData));
}

// Save menu to cloud (JSONBlob)
async function saveToCloud() {
    try {
        if (cloudBlobId) {
            // Update existing blob
            const response = await fetch(`${BLOB_API_URL}/${cloudBlobId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(menuData)
            });
            if (!response.ok) throw new Error('Failed to update');
            return true;
        } else {
            // Create new blob
            const response = await fetch(BLOB_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(menuData)
            });
            if (!response.ok) throw new Error('Failed to create');
            
            // Extract blob ID from x-jsonblob-id header (CORS-safe)
            cloudBlobId = response.headers.get('x-jsonblob-id');
            
            // Fallback: try Location header
            if (!cloudBlobId) {
                const location = response.headers.get('Location');
                if (location) {
                    cloudBlobId = location.split('/').pop();
                }
            }
            
            // Final fallback: parse from response URL
            if (!cloudBlobId && response.url) {
                cloudBlobId = response.url.split('/').pop();
            }
            
            if (!cloudBlobId) {
                throw new Error('Could not get blob ID');
            }
            
            localStorage.setItem('cloudBlobId', cloudBlobId);
            return true;
        }
    } catch (error) {
        console.error('Cloud sync failed:', error);
        return false;
    }
}

// Load menu from cloud
async function loadFromCloud(blobId) {
    try {
        const response = await fetch(`${BLOB_API_URL}/${blobId}`);
        if (!response.ok) throw new Error('Failed to load');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Failed to load from cloud:', error);
        return null;
    }
}

// Show sync status message
function showSyncStatus(message, isSuccess) {
    let statusEl = document.getElementById('syncStatus');
    if (!statusEl) {
        statusEl = document.createElement('div');
        statusEl.id = 'syncStatus';
        statusEl.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;font-weight:500;z-index:9999;transition:opacity 0.3s;';
        document.body.appendChild(statusEl);
    }
    statusEl.textContent = message;
    statusEl.style.background = isSuccess ? '#10b981' : '#ef4444';
    statusEl.style.color = 'white';
    statusEl.style.opacity = '1';
    
    setTimeout(() => {
        statusEl.style.opacity = '0';
    }, 3000);
}

// Format meal text as bullet points
function formatMealText(text) {
    if (!text || text.trim() === '') {
        return '-';
    }
    
    // Split by newlines or commas
    const items = text
        .split(/[\n,]/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    
    if (items.length === 0) {
        return '-';
    }
    
    // Create bullet point list
    return items.map(item => `• ${item}`).join('\n');
}

// Parse meal text from display format back to input format
function parseMealText(text) {
    if (!text || text.trim() === '' || text === '-') {
        return '';
    }
    
    // Remove bullet points and split by newlines
    return text
        .split('\n')
        .map(line => line.replace(/^•\s*/, '').trim())
        .filter(line => line.length > 0)
        .join('\n');
}

// Update the display with current menu data
function updateDisplay() {
    Object.keys(menuData).forEach(day => {
        ['breakfast', 'lunch', 'dinner'].forEach(meal => {
            const mealItem = document.querySelector(
                `.day-card[data-day="${day}"] .meal-item[data-meal="${meal}"] .meal-text`
            );
            if (mealItem) {
                const mealText = menuData[day][meal] || '';
                const formattedText = formatMealText(mealText);
                mealItem.textContent = formattedText;
                mealItem.style.whiteSpace = 'pre-line';
            }
        });
    });
}

// Open modal for adding/editing meal
function openModal(day = null, meal = null) {
    modal.style.display = 'block';
    
    if (day && meal) {
        // Editing existing meal
        document.getElementById('modalTitle').textContent = 'Edit Meal';
        daySelect.value = day;
        mealSelect.value = meal;
        // The stored text is already in input format (raw, without bullet points)
        mealInput.value = menuData[day][meal] || '';
    } else {
        // Adding new meal
        document.getElementById('modalTitle').textContent = 'Add Meal';
        daySelect.value = 'monday';
        mealSelect.value = 'breakfast';
        mealInput.value = '';
    }
}

// Close modal
function closeModal() {
    modal.style.display = 'none';
    mealForm.reset();
}

// Handle form submission
mealForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const day = daySelect.value;
    const meal = mealSelect.value;
    const mealText = mealInput.value.trim();
    
    // Store the raw text (will be formatted on display, empty string is allowed)
    menuData[day][meal] = mealText;
    saveMenu();
    updateDisplay();
    closeModal();
});

// Clear week button click
clearWeekBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all meals for the week?')) {
        Object.keys(menuData).forEach(day => {
            menuData[day] = { breakfast: '', lunch: '', dinner: '' };
        });
        saveMenu();
        updateDisplay();
    }
});

// Edit button clicks
document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const day = btn.getAttribute('data-day');
        const meal = btn.getAttribute('data-meal');
        openModal(day, meal);
    });
});

// Day and meal short codes for compact URLs
const dayShortCodes = {
    monday: 'mo', tuesday: 'tu', wednesday: 'we', thursday: 'th',
    friday: 'fr', saturday: 'sa', sunday: 'su'
};
const dayFromShortCode = {
    mo: 'monday', tu: 'tuesday', we: 'wednesday', th: 'thursday',
    fr: 'friday', sa: 'saturday', su: 'sunday'
};
const mealShortCodes = { breakfast: 'b', lunch: 'l', dinner: 'd' };
const mealFromShortCode = { b: 'breakfast', l: 'lunch', d: 'dinner' };

// Encode menu to compact format (only non-empty meals)
function encodeMenuCompact() {
    const parts = [];
    Object.keys(menuData).forEach(day => {
        ['breakfast', 'lunch', 'dinner'].forEach(meal => {
            const text = menuData[day][meal];
            if (text && text.trim()) {
                // Replace | and ~ with safe alternatives
                const safeText = text.replace(/\|/g, '¦').replace(/~/g, '≈');
                parts.push(`${dayShortCodes[day]}${mealShortCodes[meal]}~${safeText}`);
            }
        });
    });
    return encodeURIComponent(parts.join('|'));
}

// Decode compact format back to menu data
function decodeMenuCompact(encoded) {
    const decoded = decodeURIComponent(encoded);
    const newMenuData = {
        monday: { breakfast: '', lunch: '', dinner: '' },
        tuesday: { breakfast: '', lunch: '', dinner: '' },
        wednesday: { breakfast: '', lunch: '', dinner: '' },
        thursday: { breakfast: '', lunch: '', dinner: '' },
        friday: { breakfast: '', lunch: '', dinner: '' },
        saturday: { breakfast: '', lunch: '', dinner: '' },
        sunday: { breakfast: '', lunch: '', dinner: '' }
    };
    
    if (!decoded) return newMenuData;
    
    const parts = decoded.split('|');
    parts.forEach(part => {
        const tildeIndex = part.indexOf('~');
        if (tildeIndex > 0) {
            const key = part.substring(0, tildeIndex);
            const text = part.substring(tildeIndex + 1).replace(/¦/g, '|').replace(/≈/g, '~');
            const dayCode = key.substring(0, 2);
            const mealCode = key.substring(2, 3);
            const day = dayFromShortCode[dayCode];
            const meal = mealFromShortCode[mealCode];
            if (day && meal) {
                newMenuData[day][meal] = text;
            }
        }
    });
    
    return newMenuData;
}

// Export menu as shareable link (read-only view)
function exportMenuAsLink() {
    const encoded = encodeMenuCompact();
    const currentUrl = window.location.origin + window.location.pathname;
    return `${currentUrl}?v=${encoded}`;
}

// Export menu as formatted text
function exportMenuAsText() {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const mealNames = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
    
    let text = '🍽️ WEEKLY FOOD MENU\n';
    text += '='.repeat(50) + '\n\n';
    
    days.forEach((day, index) => {
        text += `${dayNames[index].toUpperCase()}\n`;
        text += '-'.repeat(30) + '\n';
        
        ['breakfast', 'lunch', 'dinner'].forEach(meal => {
            const mealText = menuData[day][meal];
            if (mealText && mealText.trim()) {
                text += `\n${mealNames[meal]}:\n`;
                const items = mealText.split(/[\n,]/).map(item => item.trim()).filter(item => item);
                items.forEach(item => {
                    text += `  • ${item}\n`;
                });
            }
        });
        text += '\n';
    });
    
    return text;
}

// Shorten URL using is.gd service
async function shortenUrl(longUrl) {
    try {
        const apiUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`;
        const response = await fetch(apiUrl);
        if (response.ok) {
            const shortUrl = await response.text();
            // Validate that we got a proper URL back
            if (shortUrl.startsWith('https://is.gd/')) {
                return shortUrl;
            }
        }
        return null;
    } catch (error) {
        console.error('URL shortening failed:', error);
        return null;
    }
}

// Open share modal
async function openShareModal() {
    if (!shareModal) {
        alert('Share modal not found. Please refresh the page.');
        return;
    }
    
    shareModal.style.display = 'block';
    
    // Generate share text first (doesn't need async)
    const shareText = exportMenuAsText();
    if (shareTextInput) {
        shareTextInput.value = shareText;
    }
    
    // Generate and shorten share link
    const longUrl = exportMenuAsLink();
    if (shareLinkInput) {
        shareLinkInput.value = 'Generating short link...';
        shareLinkInput.disabled = true;
        
        const shortUrl = await shortenUrl(longUrl);
        
        if (shortUrl) {
            shareLinkInput.value = shortUrl;
        } else {
            // Fallback to long URL if shortening fails
            shareLinkInput.value = longUrl;
        }
        shareLinkInput.disabled = false;
    }
    
    // Generate cook's permanent link
    const cookLinkInput = document.getElementById('cookLinkInput');
    if (cookLinkInput) {
        if (cloudBlobId) {
            const cookUrl = `${window.location.origin}${window.location.pathname}?cook=${cloudBlobId}`;
            cookLinkInput.value = cookUrl;
            cookLinkInput.style.color = '';
        } else {
            cookLinkInput.value = '⚠️ Click "Sync to Cloud" button first!';
            cookLinkInput.style.color = '#f59e0b';
        }
    }
}

// Sync menu to cloud and update cook link
async function syncToCloud() {
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
        syncBtn.textContent = '⏳ Syncing...';
        syncBtn.disabled = true;
    }
    
    const success = await saveToCloud();
    
    if (success) {
        showSyncStatus('✓ Menu synced to cloud!', true);
        
        // Update cook link input if share modal is open
        const cookLinkInput = document.getElementById('cookLinkInput');
        if (cookLinkInput && cloudBlobId) {
            const cookUrl = `${window.location.origin}${window.location.pathname}?cook=${cloudBlobId}`;
            cookLinkInput.value = cookUrl;
        }
    } else {
        showSyncStatus('✗ Sync failed. Try again.', false);
    }
    
    if (syncBtn) {
        syncBtn.textContent = '☁️ Sync to Cloud';
        syncBtn.disabled = false;
    }
}

// Close share modal
function closeShareModal() {
    shareModal.style.display = 'none';
}

// Import menu from data
function importMenu(data) {
    try {
        let importedData;
        
        // Check if it's a URL with menu parameter
        if (data.includes('?menu=') || data.includes('menu=')) {
            const url = new URL(data.includes('http') ? data : `http://dummy.com?${data}`);
            const menuParam = url.searchParams.get('menu');
            if (menuParam) {
                const decoded = decodeURIComponent(atob(menuParam));
                importedData = JSON.parse(decoded);
            } else {
                throw new Error('Invalid share link');
            }
        } else {
            // Try to parse as JSON directly
            importedData = JSON.parse(data);
        }
        
        // Validate structure
        const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const requiredMeals = ['breakfast', 'lunch', 'dinner'];
        
        if (!requiredDays.every(day => importedData[day] && 
            requiredMeals.every(meal => importedData[day].hasOwnProperty(meal)))) {
            throw new Error('Invalid menu structure');
        }
        
        // Import the data
        menuData = importedData;
        saveMenu();
        updateDisplay();
        return true;
    } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import menu. Please check that the data is valid.');
        return false;
    }
}

// Open import modal
function openImportModal() {
    importModal.style.display = 'block';
    importInput.value = '';
}

// Close import modal
function closeImportModal() {
    importModal.style.display = 'none';
    importInput.value = '';
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (err) {
            document.body.removeChild(textarea);
            return false;
        }
    }
}

// Enable read-only mode (hide edit controls)
function enableReadOnlyMode() {
    isReadOnlyMode = true;
    
    // Hide all edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.style.display = 'none';
    });
    
    // Hide control buttons
    const controls = document.querySelector('.controls');
    if (controls) {
        controls.style.display = 'none';
    }
    
    // Update header to show it's a shared menu
    const header = document.querySelector('header');
    if (header) {
        const subtitle = header.querySelector('.subtitle');
        if (subtitle) {
            subtitle.innerHTML = '📋 Shared Menu <span class="readonly-badge">View Only</span>';
        }
    }
    
    // Add body class for additional styling
    document.body.classList.add('readonly-mode');
}

// Check for menu in URL parameters (for sharing)
async function checkUrlForMenu() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for cook mode - load latest from cloud
    const cookMode = urlParams.get('cook');
    if (cookMode) {
        const cloudData = await loadFromCloud(cookMode);
        if (cloudData) {
            menuData = cloudData;
            updateDisplay();
            enableReadOnlyMode();
            // Update header for cook
            const subtitle = document.querySelector('.subtitle');
            if (subtitle) {
                subtitle.innerHTML = '👨‍🍳 Cook\'s View <span class="readonly-badge">Auto-Updated</span>';
            }
            return;
        } else {
            alert('Could not load menu. The link may be invalid.');
        }
    }
    
    // Check for compact read-only view parameter (?v=)
    const compactViewParam = urlParams.get('v');
    if (compactViewParam) {
        try {
            menuData = decodeMenuCompact(compactViewParam);
            updateDisplay();
            enableReadOnlyMode();
            return;
        } catch (error) {
            console.error('Failed to load shared menu from URL:', error);
        }
    }
    
    // Legacy support: Check for old base64 view parameter (?view=)
    const viewParam = urlParams.get('view');
    if (viewParam) {
        try {
            const decoded = decodeURIComponent(atob(viewParam));
            const importedData = JSON.parse(decoded);
            
            const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const requiredMeals = ['breakfast', 'lunch', 'dinner'];
            
            if (requiredDays.every(day => importedData[day] && 
                requiredMeals.every(meal => importedData[day].hasOwnProperty(meal)))) {
                menuData = importedData;
                updateDisplay();
                enableReadOnlyMode();
                return;
            }
        } catch (error) {
            console.error('Failed to load shared menu from URL:', error);
        }
    }
    
    // Legacy support: Check for old import-style menu parameter
    const menuParam = urlParams.get('menu');
    if (menuParam) {
        try {
            const decoded = decodeURIComponent(atob(menuParam));
            const importedData = JSON.parse(decoded);
            if (confirm('A menu was found in the link. Would you like to import it?')) {
                if (importMenu(`?menu=${menuParam}`)) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        } catch (error) {
            console.error('Failed to load menu from URL:', error);
        }
    }
}

// Event listeners - with null checks
if (exportBtn) {
    exportBtn.addEventListener('click', openShareModal);
} else {
    console.error('Export button not found in DOM');
}
if (importBtn) {
    importBtn.addEventListener('click', openImportModal);
}
if (closeShareBtn) {
    closeShareBtn.addEventListener('click', closeShareModal);
}
if (cancelImportBtn) {
    cancelImportBtn.addEventListener('click', closeImportModal);
}

// Sync button
const syncBtn = document.getElementById('syncBtn');
if (syncBtn) {
    syncBtn.addEventListener('click', syncToCloud);
}

// Copy cook link button
const copyCookLinkBtn = document.getElementById('copyCookLinkBtn');
const cookLinkInput = document.getElementById('cookLinkInput');
if (copyCookLinkBtn && cookLinkInput) {
    copyCookLinkBtn.addEventListener('click', async () => {
        if (cookLinkInput.value.includes('Sync to Cloud')) {
            alert('Please click "Sync to Cloud" first to generate a cook link.');
            return;
        }
        if (await copyToClipboard(cookLinkInput.value)) {
            copyCookLinkBtn.textContent = '✓ Copied!';
            setTimeout(() => {
                copyCookLinkBtn.textContent = 'Copy Cook Link';
            }, 2000);
        }
    });
}

if (copyLinkBtn && shareLinkInput) {
    copyLinkBtn.addEventListener('click', async () => {
        if (await copyToClipboard(shareLinkInput.value)) {
            copyLinkBtn.textContent = '✓ Copied!';
            setTimeout(() => {
                copyLinkBtn.textContent = 'Copy Link';
            }, 2000);
        }
    });
}

if (copyTextBtn && shareTextInput) {
    copyTextBtn.addEventListener('click', async () => {
        if (await copyToClipboard(shareTextInput.value)) {
            copyTextBtn.textContent = '✓ Copied!';
            setTimeout(() => {
                copyTextBtn.textContent = 'Copy Text';
            }, 2000);
        }
    });
}

if (confirmImportBtn && importInput) {
    confirmImportBtn.addEventListener('click', () => {
        const importData = importInput.value.trim();
        if (!importData) {
            alert('Please paste menu data to import.');
            return;
        }
        
        if (importMenu(importData)) {
            closeImportModal();
            alert('Menu imported successfully!');
        }
    });
}

// Close modal events
closeBtn.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modalName = btn.getAttribute('data-modal');
        if (modalName === 'mealModal') {
            closeModal();
        } else if (modalName === 'shareModal') {
            closeShareModal();
        } else if (modalName === 'importModal') {
            closeImportModal();
        }
    });
});

cancelBtn.addEventListener('click', closeModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
    if (e.target === shareModal) {
        closeShareModal();
    }
    if (e.target === importModal) {
        closeImportModal();
    }
});

// Initialize
loadMenu();
checkUrlForMenu();

