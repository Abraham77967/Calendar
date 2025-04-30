// Firebase configuration - REPLACE WITH YOUR OWN CONFIG from Firebase console
// Go to your Firebase project > Project Settings > Add Web App > Copy the config object
const firebaseConfig = {
    apiKey: "AIzaSyCOgSFssUQohtp7znEfq3mb2bmTH-00p4c",
    authDomain: "calendar-7f322.firebaseapp.com",
    projectId: "calendar-7f322",
    storageBucket: "calendar-7f322.firebasestorage.app",
    messagingSenderId: "127539488630",
    appId: "1:127539488630:web:5c60fb6e5417d12bd37c57"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Function to completely clear all calendar data
function clearAllCalendarData() {
    // Clear localStorage
    localStorage.removeItem('calendarNotes');
    
    // Ensure notes variable is empty when defined
    return {};
}

document.addEventListener('DOMContentLoaded', () => {
    // Start with empty data - important!
    let notes = clearAllCalendarData();
    
    // Check for redirect result first
    firebase.auth().getRedirectResult().then((result) => {
        if (result.user) {
            console.log('Google sign in successful via redirect:', result.user.email);
        }
    }).catch((error) => {
        console.error('Redirect sign-in error:', error);
        if (error.code !== 'auth/null-user') {
            alert(`Sign in failed: ${error.message}`);
        }
    });
    
    // Get references for BOTH calendars and shared controls
    const monthYearDisplayElement = document.getElementById('month-year-display');
    const calendarGrid1 = document.getElementById('calendar-grid-1');
    const monthYearElement1 = document.getElementById('month-year-1');
    const calendarGrid2 = document.getElementById('calendar-grid-2');
    const monthYearElement2 = document.getElementById('month-year-2');

    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const noteModal = document.getElementById('note-modal');
    const modalDateElement = document.getElementById('modal-date');
    const noteInputElement = document.getElementById('note-input');
    const noteTimeElement = document.getElementById('note-time');
    const saveNoteButton = document.getElementById('save-note');
    const deleteNoteButton = document.getElementById('delete-note');
    const closeButton = document.querySelector('.close-button');
    const checklistItemsElement = document.getElementById('checklist-items');
    const newItemInputElement = document.getElementById('new-checklist-item');
    const addItemButton = document.getElementById('add-item-button');
    const eventProgressPanel = document.getElementById('event-progress-panel'); // Get panel element
    
    // Authentication elements
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const googleSignInButton = document.getElementById('google-signin-button');
    const logoutButton = document.getElementById('logout-button');

    let currentStartDate = new Date(2025, 3, 1); // Start with April 2025 (Month is 0-indexed)
    let selectedDateString = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- Firebase Authentication Logic ---
    
    // Google Sign-in
    googleSignInButton.addEventListener('click', () => {
        console.log('Starting Google sign in process');
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Add scopes if needed
        provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
        
        // Set custom parameters
        provider.setCustomParameters({
            'login_hint': 'user@example.com',
            'prompt': 'select_account'
        });
        
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                console.log('Google sign in successful:', result.user.email);
            })
            .catch((error) => {
                console.error('Google sign in error:', error);
                
                // Try redirect method if popup fails
                if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                    console.log('Popup was blocked or closed, trying redirect method');
                    firebase.auth().signInWithRedirect(provider);
                } else {
                    alert(`Sign in failed: ${error.message}`);
                }
            });
    });
    
    // Logout event
    logoutButton.addEventListener('click', () => {
        firebase.auth().signOut()
            .then(() => {
                console.log('User signed out successfully');
                // Force a complete page reload to ensure clean state
                window.location.reload(true);
            })
            .catch((error) => {
                console.error('Sign out error:', error);
            });
    });
    
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            console.log('User detected:', user.email);
            loginForm.style.display = 'none';
            userInfo.style.display = 'block';
            userEmail.textContent = user.email;
            
            // Fetch notes from Firestore
            console.log('Fetching notes for user:', user.uid);
            db.collection('userNotes').doc(user.uid).get()
                .then(doc => {
                    console.log('Firestore response:', doc.exists ? 'Document exists' : 'No document found');
                    if (doc.exists && doc.data().notes) {
                        // Use cloud data only when signed in
                        notes = doc.data().notes;
                        console.log('Loaded notes from cloud');
                        renderBothCalendars();
                    } else {
                        // No cloud data, start with empty notes
                        notes = {};
                        console.log('No existing notes found in cloud, starting fresh');
                        renderBothCalendars();
                    }
                })
                .catch(error => {
                    console.error("Error fetching notes:", error);
                    alert("Error fetching your calendar data: " + error.message);
                });
        } else {
            // User is signed out - aggressively clear all data
            console.log('No user logged in - clearing all data');
            loginForm.style.display = 'block';
            userInfo.style.display = 'none';
            
            // Clear all calendar data completely
            notes = clearAllCalendarData();
            console.log('All calendar data cleared');
            
            // Re-render with empty data
            renderBothCalendars();
        }
    });
    
    // --- End Firebase Authentication Logic ---

    // --- Helper Function: Format Time Difference ---
    function formatTimeDifference(date1, date2) {
        const diffTime = date1.getTime() - date2.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Difference in days

        if (diffDays === 0) {
            return "(Today)";
        } else if (diffDays === 1) {
            return "(Tomorrow)";
        } else if (diffDays === -1) {
            return "(Yesterday)";
        } else if (diffDays > 1) {
            return `(in ${diffDays} days)`;
        } else { // diffDays < -1
            return `(${-diffDays} days ago)`;
        }
    }
    // --- End Helper Function ---

    // --- Refactored Rendering Function ---
    function renderCalendar(targetDate, gridElement, monthYearElement) {
        // Safety check - don't display notes if not logged in
        if (!firebase.auth().currentUser) {
            notes = clearAllCalendarData();
        }
        
        // Clear previous grid except headers
        while (gridElement.children.length > 7) {
            gridElement.removeChild(gridElement.lastChild);
        }

        const year = targetDate.getFullYear();
        const month = targetDate.getMonth(); // 0-indexed

        monthYearElement.textContent = `${targetDate.toLocaleString('default', { month: 'long' })} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ...
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty divs for days before the 1st
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.classList.add('day', 'other-month');
            gridElement.appendChild(emptyDiv);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('day');
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayElement.dataset.date = dateString;

            const dayNumber = document.createElement('span');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = day;
            dayElement.appendChild(dayNumber);

            // Check if this day is today
            const cellDate = new Date(year, month, day);
            cellDate.setHours(0, 0, 0, 0); // Ensure no time component for comparison
            if (cellDate.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            // Display note text, time, and time difference if note exists
            const noteData = notes[dateString];
            if (firebase.auth().currentUser && noteData && noteData.text) {
                const noteTextElement = document.createElement('div');
                noteTextElement.classList.add('note-text');
                let displayText = noteData.text;
                if (noteData.time) displayText = `${noteData.time} - ${displayText}`;
                noteTextElement.textContent = displayText;
                dayElement.appendChild(noteTextElement);

                const noteDate = new Date(year, month, day); // Use cellDate defined above?
                noteDate.setHours(0,0,0,0);
                const timeDiffString = formatTimeDifference(noteDate, today);
                const timeDiffElement = document.createElement('span');
                timeDiffElement.classList.add('time-diff');
                timeDiffElement.textContent = ` ${timeDiffString}`;
                noteTextElement.appendChild(timeDiffElement);
            }

            dayElement.addEventListener('click', () => openNoteModal(dateString));
            gridElement.appendChild(dayElement);
        }
    }
    // --- End Refactored Rendering Function ---

    // --- NEW: Render Event Progress Panel ---
    function renderEventProgressPanel() {
        // Skip rendering if not logged in
        if (!firebase.auth().currentUser) {
            // Clear panel except title
            const existingItems = eventProgressPanel.querySelectorAll('.progress-item');
            existingItems.forEach(item => item.remove());
            return;
        }
        
        // Clear existing panel content except the H3 title
        const existingItems = eventProgressPanel.querySelectorAll('.progress-item');
        existingItems.forEach(item => item.remove());

        // Get all notes with checklists and sort them by date
        const notesWithChecklists = Object.entries(notes)
            .filter(([dateString, noteData]) => noteData.checklist && noteData.checklist.length > 0)
            .map(([dateString, noteData]) => ({ dateString, ...noteData }))
            .sort((a, b) => new Date(a.dateString) - new Date(b.dateString));

        // Create and append elements for each note
        notesWithChecklists.forEach(noteData => {
            const dateString = noteData.dateString;
            
            // Create the card container
            const itemContainer = document.createElement('div');
            itemContainer.classList.add('progress-item');

            // Create header section with date and title
            const headerSection = document.createElement('div');
            headerSection.classList.add('progress-item-header');
            
            // Add Date
            const itemDate = document.createElement('span');
            itemDate.classList.add('item-date');
            const [year, month, day] = dateString.split('-');
            itemDate.textContent = new Date(year, month-1, day).toLocaleDateString('en-US', { 
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
            });
            headerSection.appendChild(itemDate);

            // Add Text (with Time)
            const itemText = document.createElement('div');
            itemText.classList.add('item-text');
            let displayText = noteData.text;
            if (noteData.time) displayText = `${noteData.time} - ${displayText}`;
            itemText.textContent = displayText || '(No description)';
            headerSection.appendChild(itemText);
            
            itemContainer.appendChild(headerSection);

            // Add Progress Bar Section
            const totalItems = noteData.checklist.length;
            const completedItems = noteData.checklist.filter(item => item.done).length;
            const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

            const progressContainer = document.createElement('div');
            progressContainer.classList.add('progress-container');
            
            const progressBarContainer = document.createElement('div');
            progressBarContainer.classList.add('progress-bar-container');
            
            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
            progressBar.style.width = `${progress}%`;
            
            progressBarContainer.appendChild(progressBar);
            progressContainer.appendChild(progressBarContainer);

            const progressSummary = document.createElement('div');
            progressSummary.classList.add('progress-summary');
            progressSummary.textContent = `${completedItems}/${totalItems} Tasks Completed`;
            progressContainer.appendChild(progressSummary);
            
            itemContainer.appendChild(progressContainer);
            
            // Add Checklist Section
            const checklistContainer = document.createElement('div');
            checklistContainer.classList.add('checklist-container');
            
            const checklistElement = document.createElement('ul');
            checklistElement.classList.add('panel-checklist');

            noteData.checklist.forEach((item, index) => {
                const li = document.createElement('li');

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.done;
                const checkboxId = `panel-${dateString}-item-${index}`;
                checkbox.id = checkboxId;

                // Add event listener to update data on change
                checkbox.addEventListener('change', () => {
                    // Update the underlying data
                    notes[dateString].checklist[index].done = checkbox.checked;
                    
                    // Save to Firebase if user is logged in
                    const user = firebase.auth().currentUser;
                    if (user) {
                        db.collection('userNotes').doc(user.uid).set({
                            notes: notes
                        })
                        .catch(error => {
                            console.error("Error updating checklist:", error);
                        });
                    }
                    
                    // Toggle the completed class on the label
                    label.classList.toggle('completed', checkbox.checked);
                    // Update progress bar and summary
                    updateProgressForItem(dateString, itemContainer);
                });

                const label = document.createElement('label');
                label.htmlFor = checkboxId;
                label.textContent = item.task;
                if (item.done) {
                    label.classList.add('completed');
                }

                li.appendChild(checkbox);
                li.appendChild(label);
                checklistElement.appendChild(li);
            });
            
            checklistContainer.appendChild(checklistElement);
            itemContainer.appendChild(checklistContainer);

            eventProgressPanel.appendChild(itemContainer);
        });
    }
    
    // Helper function to update progress bar and text when checkbox changes
    function updateProgressForItem(dateString, itemContainer) {
        const noteData = notes[dateString];
        if (!noteData || !noteData.checklist) return;
        
        const totalItems = noteData.checklist.length;
        const completedItems = noteData.checklist.filter(item => item.done).length;
        const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        
        // Update progress bar width
        const progressBar = itemContainer.querySelector('.progress-bar');
        if (progressBar) progressBar.style.width = `${progress}%`;
        
        // Update progress text
        const progressSummary = itemContainer.querySelector('.progress-summary');
        if (progressSummary) progressSummary.textContent = `${completedItems}/${totalItems} Tasks Completed`;
    }
    // --- End Event Progress Panel Rendering ---

    // --- Function to Render Both Calendars ---
    function renderBothCalendars() {
        // Check if user is signed in - if not, ensure notes is empty
        if (!firebase.auth().currentUser) {
            // Aggressively clear notes to ensure nothing is displayed when logged out
            notes = clearAllCalendarData();
            console.log('Cleared calendar data before rendering (not logged in)');
        }
        
        const firstMonthDate = new Date(currentStartDate);
        const secondMonthDate = new Date(currentStartDate);
        secondMonthDate.setMonth(secondMonthDate.getMonth() + 1);

        renderCalendar(firstMonthDate, calendarGrid1, monthYearElement1);
        renderCalendar(secondMonthDate, calendarGrid2, monthYearElement2);

        // Update the main display header
        const month1Name = firstMonthDate.toLocaleString('default', { month: 'long' });
        const month2Name = secondMonthDate.toLocaleString('default', { month: 'long' });
        const year1 = firstMonthDate.getFullYear();
        const year2 = secondMonthDate.getFullYear();
        monthYearDisplayElement.textContent = year1 === year2 ? `${month1Name} & ${month2Name} ${year1}` : `${month1Name} ${year1} & ${month2Name} ${year2}`;

        renderEventProgressPanel(); // Render the panel after calendars
    }
    // --- End Function to Render Both Calendars ---

    // --- Modal Functions (open, close - unchanged, save, delete - updated selector) ---
    function openNoteModal(dateString) {
        // Don't allow adding notes if not signed in
        if (!firebase.auth().currentUser) {
            alert("Please sign in to add or view notes");
            return;
        }
        
        selectedDateString = dateString;
        const [year, month, day] = dateString.split('-');
        const dateObj = new Date(year, month - 1, day);
        modalDateElement.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const noteData = notes[selectedDateString] || { text: '', time: '', checklist: [] }; // Default to empty checklist
        noteInputElement.value = noteData.text || '';
        noteTimeElement.value = noteData.time || '';
        renderChecklistInModal(noteData.checklist || []); // Render checklist
        noteModal.style.display = 'block';
    }

    function closeNoteModal() {
        noteModal.style.display = 'none';
        selectedDateString = null;
        checklistItemsElement.innerHTML = ''; // Clear checklist on close
        newItemInputElement.value = ''; // Clear add item input
    }

    // NEW: Render checklist items in the modal
    function renderChecklistInModal(checklist) {
        checklistItemsElement.innerHTML = ''; // Clear existing items
        checklist = checklist || []; // Ensure checklist is an array
        checklist.forEach((item, index) => {
            const li = document.createElement('li');
            li.dataset.index = index; // Store index for deletion

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.done;
            checkbox.id = `item-${index}`;
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });

            const label = document.createElement('label');
            label.htmlFor = `item-${index}`;
            label.textContent = item.task;
            if (item.done) {
                label.classList.add('completed');
            }

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.innerHTML = '&times;'; // Multiplication sign X
            deleteButton.type = 'button'; // Prevent form submission
            deleteButton.addEventListener('click', () => {
                 deleteChecklistItem(index);
            });

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deleteButton);
            checklistItemsElement.appendChild(li);
        });
    }

    // NEW: Add item to modal checklist UI
    function addChecklistItem() {
        const taskText = newItemInputElement.value.trim();
        if (taskText) {
            const newItem = { task: taskText, done: false };
            // Create elements without saving yet - save happens on main Save Note button
            const index = checklistItemsElement.children.length;
            const li = document.createElement('li');
             li.dataset.index = index; // Store index for deletion

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `item-${index}`;
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });

            const label = document.createElement('label');
            label.htmlFor = `item-${index}`;
            label.textContent = newItem.task;

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.innerHTML = '&times;';
            deleteButton.type = 'button';
            deleteButton.addEventListener('click', () => {
                 // This delete needs to remove the item from the UI immediately
                 li.remove();
                 // Re-index remaining items if necessary (or handle deletion during save)
            });

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deleteButton);
            checklistItemsElement.appendChild(li);
            newItemInputElement.value = ''; // Clear input
        }
    }

     // NEW: Delete item from modal checklist UI (called by item's delete button)
    function deleteChecklistItem(indexToDelete) {
        const itemElement = checklistItemsElement.querySelector(`li[data-index="${indexToDelete}"]`);
        if (itemElement) {
            itemElement.remove();
        }
        // Note: Actual deletion from data happens on Save Note
    }

    // UPDATED: Save note including checklist data and syncing to Firebase
    function saveNote() {
        // Don't save if not signed in
        if (!firebase.auth().currentUser) {
            alert("Please sign in to save notes");
            closeNoteModal();
            return;
        }
        
        if (selectedDateString) {
            const noteText = noteInputElement.value.trim();
            const noteTime = noteTimeElement.value;

            // Gather checklist data from the modal UI
            const checklist = [];
            const items = checklistItemsElement.querySelectorAll('li');
            items.forEach(li => {
                const checkbox = li.querySelector('input[type="checkbox"]');
                const label = li.querySelector('label');
                if (checkbox && label) {
                    checklist.push({ task: label.textContent, done: checkbox.checked });
                }
            });

            if (noteText || checklist.length > 0) { // Save if there's text OR checklist items
                notes[selectedDateString] = { text: noteText, time: noteTime, checklist: checklist };
            } else {
                delete notes[selectedDateString]; // Delete only if everything is empty
            }
            
            // Save to Firebase if user is logged in
            const user = firebase.auth().currentUser;
            if (user) {
                console.log('Saving note to Firestore for user:', user.uid);
                db.collection('userNotes').doc(user.uid).set({
                    notes: notes
                })
                .then(() => {
                    console.log('Note saved successfully to Firestore');
                })
                .catch(error => {
                    console.error("Error saving notes:", error);
                    alert("Error saving to cloud: " + error.message);
                });
            }
            
            closeNoteModal();
            renderBothCalendars(); // Re-render to show changes immediately
        }
    }

    // UPDATED: Delete note (also removes checklist) and syncs with Firebase
    function deleteNote() {
        // Don't delete if not signed in
        if (!firebase.auth().currentUser) {
            alert("Please sign in to delete notes");
            closeNoteModal();
            return;
        }
        
        if (selectedDateString) {
            delete notes[selectedDateString];
            
            // Save to Firebase if user is logged in
            const user = firebase.auth().currentUser;
            if (user) {
                console.log('Deleting note from Firestore for user:', user.uid);
                db.collection('userNotes').doc(user.uid).set({
                    notes: notes
                })
                .then(() => {
                    console.log('Note deleted successfully from Firestore');
                })
                .catch(error => {
                    console.error("Error deleting note:", error);
                    alert("Error syncing deletion to cloud: " + error.message);
                });
            }
            
            closeNoteModal();
            renderBothCalendars(); // Re-render to remove the note visually
        }
    }
    // --- End Modal Functions ---

    // --- Event Listeners (Add listener for checklist add button) ---
    prevMonthButton.addEventListener('click', () => {
        currentStartDate.setMonth(currentStartDate.getMonth() - 1);
        renderBothCalendars();
    });

    nextMonthButton.addEventListener('click', () => {
        currentStartDate.setMonth(currentStartDate.getMonth() + 1);
        renderBothCalendars();
    });

    closeButton.addEventListener('click', closeNoteModal);
    saveNoteButton.addEventListener('click', saveNote);
    deleteNoteButton.addEventListener('click', deleteNote);

    // Listener for adding checklist item
    addItemButton.addEventListener('click', addChecklistItem);
    newItemInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addChecklistItem();
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target == noteModal) {
            closeNoteModal();
        }
    });
    // --- End Event Listeners ---

    renderBothCalendars(); // Initial render of both calendars
}); 