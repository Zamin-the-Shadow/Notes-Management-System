// State Variables
let notes = [];
let token = localStorage.getItem('token') || '';
let currentUserEmail = localStorage.getItem('userEmail') || '';

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const userDisplayEmail = document.getElementById('user-display-email');
const logoutBtn = document.getElementById('logout-btn');
const searchInput = document.getElementById('search-input');

const noteForm = document.getElementById('note-form');
const noteIdInput = document.getElementById('note-id');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const editorTitleText = document.getElementById('editor-title-text');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const notesGrid = document.getElementById('notes-grid');
const emptyState = document.getElementById('empty-state');
const noSearchResults = document.getElementById('no-search-results');
const toastContainer = document.getElementById('toast-container');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    showDashboardDirectly();
  } else {
    showAuthDirectly();
  }
});

// Toast Helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" title="Close">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  
  // Set up click handler for close button
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  });

  toastContainer.appendChild(toast);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }
  }, 4000);
}

// Initial/Direct View switches without animations to prevent flicker on load
function showAuthDirectly() {
  dashboardSection.classList.remove('active');
  dashboardSection.style.display = 'none';
  authSection.style.display = 'flex';
  authSection.classList.add('active');
}

function showDashboardDirectly() {
  authSection.classList.remove('active');
  authSection.style.display = 'none';
  dashboardSection.style.display = 'flex';
  dashboardSection.classList.add('active');
  userDisplayEmail.textContent = currentUserEmail;
  fetchNotes();
}

// Smooth transition view switches
function transitionToAuth() {
  dashboardSection.classList.remove('active');
  setTimeout(() => {
    dashboardSection.style.display = 'none';
    authSection.style.display = 'flex';
    // Small delay to trigger entry transition
    setTimeout(() => {
      authSection.classList.add('active');
    }, 50);
  }, 300);
}

function transitionToDashboard() {
  authSection.classList.remove('active');
  setTimeout(() => {
    authSection.style.display = 'none';
    dashboardSection.style.display = 'flex';
    userDisplayEmail.textContent = currentUserEmail;
    // Small delay to trigger entry transition
    setTimeout(() => {
      dashboardSection.classList.add('active');
      fetchNotes();
    }, 50);
  }, 300);
}

// Tab Switching
window.switchAuthTab = function(tab) {
  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
  } else {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
  }
};

// Form Submit Event Handlers
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    token = data.token;
    currentUserEmail = data.user.email;
    localStorage.setItem('token', token);
    localStorage.setItem('userEmail', currentUserEmail);
    
    showToast('Successfully logged in!', 'success');
    loginForm.reset();
    transitionToDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;

  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Signup failed');
    }

    token = data.token;
    currentUserEmail = data.user.email;
    localStorage.setItem('token', token);
    localStorage.setItem('userEmail', currentUserEmail);

    showToast('Account created successfully!', 'success');
    signupForm.reset();
    transitionToDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  token = '';
  currentUserEmail = '';
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  notes = [];
  resetNoteEditor();
  searchInput.value = '';
  showToast('Logged out successfully', 'success');
  transitionToAuth();
});

// CRUD Operations: Fetch all notes
async function fetchNotes() {
  try {
    const res = await fetch('/api/notes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.status === 401) {
      // Access unauthorized: token has likely expired or is invalid
      logoutBtn.click();
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    
    notes = data;
    renderNotes();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// CRUD Operations: Add / Edit Note
noteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = noteIdInput.value;
  const title = noteTitleInput.value.trim();
  const content = noteContentInput.value.trim();

  const noteData = { title, content };
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/notes/${id}` : '/api/notes';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(noteData)
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    if (id) {
      // Update local state
      notes = notes.map(note => note._id === id ? data : note);
      showToast('Note updated successfully', 'success');
    } else {
      // Add new note state at top
      notes.unshift(data);
      showToast('Note created successfully', 'success');
    }

    renderNotes();
    resetNoteEditor();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Prepare editor for editing
function editNote(id) {
  const note = notes.find(n => n._id === id);
  if (!note) return;

  noteIdInput.value = note._id;
  noteTitleInput.value = note.title;
  noteContentInput.value = note.content;
  
  editorTitleText.textContent = 'Edit Note';
  saveNoteBtn.querySelector('span').textContent = 'Update Note';
  cancelEditBtn.classList.remove('hidden');
  
  // Responsive focus scroll on smaller layouts
  if (window.innerWidth <= 768) {
    document.querySelector('.note-input-container').scrollIntoView({ behavior: 'smooth' });
  }
}

cancelEditBtn.addEventListener('click', resetNoteEditor);

function resetNoteEditor() {
  noteForm.reset();
  noteIdInput.value = '';
  editorTitleText.textContent = 'Create Note';
  saveNoteBtn.querySelector('span').textContent = 'Save Note';
  cancelEditBtn.classList.add('hidden');
}

// CRUD Operations: Delete with slide-out transition
window.deleteNote = function(id, btnElement) {
  const noteCard = btnElement.closest('.note-card');
  noteCard.classList.add('removing');
  
  // Wait for the CSS slide-out/scale transition animation (250ms) to complete
  setTimeout(async () => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Remove from state array
      notes = notes.filter(n => n._id !== id);
      showToast('Note deleted successfully', 'success');
      
      // If we are currently editing the deleted note, reset the editor
      if (noteIdInput.value === id) {
        resetNoteEditor();
      }
      
      renderNotes();
    } catch (err) {
      showToast(err.message, 'error');
      // If server deletion fails, re-render list to restore the note item card
      renderNotes();
    }
  }, 250);
};

window.triggerEditNote = function(id) {
  editNote(id);
};

// Render notes dashboard layout
function renderNotes() {
  const query = searchInput.value.toLowerCase().trim();
  
  // Filter notes array
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(query) || 
    note.content.toLowerCase().includes(query)
  );

  // Clean dashboard grid contents
  notesGrid.innerHTML = '';

  // Handle Empty State displays
  if (notes.length === 0) {
    emptyState.classList.remove('hidden');
    noSearchResults.classList.add('hidden');
    return;
  } else {
    emptyState.classList.add('hidden');
  }

  if (filteredNotes.length === 0) {
    noSearchResults.classList.remove('hidden');
    return;
  } else {
    noSearchResults.classList.add('hidden');
  }

  // Populate list cards
  filteredNotes.forEach((note, index) => {
    const card = document.createElement('div');
    card.className = 'note-card';
    
    // Stagger slide entry animation for premium loading feel
    card.style.animationDelay = `${Math.min(index * 0.04, 0.4)}s`;
    
    const formattedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    card.innerHTML = `
      <h3 class="note-card-title">${escapeHtml(note.title)}</h3>
      <p class="note-card-content">${escapeHtml(note.content)}</p>
      <div class="note-card-footer">
        <span class="note-card-date">${formattedDate}</span>
        <div class="note-card-actions">
          <button class="btn-edit" onclick="triggerEditNote('${note._id}')" title="Edit Note">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-danger" onclick="deleteNote('${note._id}', this)" title="Delete Note">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
    notesGrid.appendChild(card);
  });
}

// Live Search Event Listener
searchInput.addEventListener('input', renderNotes);

// Utility functions
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
