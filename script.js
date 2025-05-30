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

// Global temporary storage for task promotion data
let tempPromotionData = null;

// Function to completely clear all calendar data
function clearAllCalendarData() {
    console.log('[CLEAR DATA] Clearing all calendar data');
    
    // Clear localStorage
    localStorage.removeItem('calendarNotes');
    localStorage.removeItem('mainGoals');
    
    // Create a new empty object
    window.calendarNotes = {};
    
    console.log('[CLEAR DATA] Calendar data cleared');
    return window.calendarNotes;
}

document.addEventListener('DOMContentLoaded', () => {
    // Declare notes as a global variable outside of the function scope
    // This was the main issue - the 'notes' variable was being reset each time
    window.calendarNotes = window.calendarNotes || {};
    let notes = window.calendarNotes;

    // Only initialize if empty
    if (Object.keys(notes).length === 0) {
        notes = {};
        window.calendarNotes = notes;
    }
    
    // Initialize main goals array (limited to 3)
    // Ensure goals are objects: { text: string, completed: boolean }
    let mainGoals = JSON.parse(localStorage.getItem('mainGoals')) || [];
    mainGoals = mainGoals.map(goal => {
        if (typeof goal === 'string') {
            return { text: goal, completed: false }; // Convert old string goals
        }
        return goal; // Already an object, or will be filtered if invalid
    }).filter(goal => goal && typeof goal.text === 'string'); // Ensure valid structure
    
    // --- News Integration ---
    const refreshNewsButton = document.getElementById('refresh-news-button');
    let currentNewsCategory = 'technology'; // Default category

    // RSS Feed URLs by category
    const newsFeedsByCategory = {
        technology: {
            primary: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
            fallback: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
            sourceName: 'BBC Technology'
        },
        education: {
            primary: 'https://rss.nytimes.com/services/xml/rss/nyt/Education.xml',
            fallback: 'https://feeds.bbci.co.uk/news/education/rss.xml',
            sourceName: 'NY Times Education'
        },
        economics: {
            primary: 'https://feeds.bbci.co.uk/news/business/economy/rss.xml',
            fallback: 'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
            sourceName: 'BBC Economy'
        }
    };

    // Initialize news tabs
    function initializeNewsTabs() {
        const newsTabs = document.querySelectorAll('.news-tab');
        if (!newsTabs || newsTabs.length === 0) return;
        
        newsTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Update active tab
                newsTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Get category and fetch news
                const category = tab.dataset.category;
                if (category && newsFeedsByCategory[category]) {
                    currentNewsCategory = category;
                    fetchNews(category);
                }
            });
        });
    }

    // Function to fetch and display news using RSS feeds
    function fetchNews(category = currentNewsCategory) {
        const newsList = document.getElementById('news-list');
        if (!newsList) return;
        
        newsList.innerHTML = '<li class="news-loading">Loading latest news...</li>'; // Loading indicator
        
        const feedData = newsFeedsByCategory[category] || newsFeedsByCategory.technology;
        const rssFeedUrl = feedData.primary;
        const rssToJsonServiceUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssFeedUrl)}`;

        fetch(rssToJsonServiceUrl)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                console.log(`[NEWS] Fetched ${category} news data:`, data);
                
                if (data.status !== 'ok' || !data.items || data.items.length === 0) {
                    throw new Error('No articles found or API error');
                }
                
                newsList.innerHTML = ''; // Clear previous items
                
                // Process articles (limit to 5)
                data.items.slice(0, 5).forEach(article => {
                    const li = document.createElement('li');
                    
                    // Create and format date
                    const publishDate = new Date(article.pubDate);
                    const formattedDate = publishDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                    });
                    
                    // HTML structure with title, source, and date
                    li.innerHTML = `
                        <a href="${article.link}" target="_blank">${article.title}</a>
                        <span class="news-source">${feedData.sourceName}</span>
                        <span class="news-date">${formattedDate}</span>
                    `;
                    
                    newsList.appendChild(li);
                });
            })
            .catch(error => {
                console.error(`[NEWS] Error fetching ${category} news:`, error);
                
                // If that fails, try fallback feed
                fetchNewsFallback(newsList, category);
            });
    }
    
    // Fallback function using another news source
    function fetchNewsFallback(newsList, category = currentNewsCategory) {
        const feedData = newsFeedsByCategory[category] || newsFeedsByCategory.technology;
        const fallbackFeedUrl = feedData.fallback;
        const fallbackServiceUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(fallbackFeedUrl)}`;
        const fallbackSourceName = feedData.sourceName.includes('BBC') ? 'NY Times' : 'BBC News';
        
        fetch(fallbackServiceUrl)
            .then(res => res.json())
            .then(data => {
                if (data.status !== 'ok' || !data.items || data.items.length === 0) {
                    throw new Error('No articles found in fallback feed');
                }
                
                newsList.innerHTML = ''; // Clear loading indicator
                
                // Process articles (limit to 5)
                data.items.slice(0, 5).forEach(article => {
                    const li = document.createElement('li');
                    
                    // Create and format date
                    const publishDate = new Date(article.pubDate);
                    const formattedDate = publishDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                    });
                    
                    li.innerHTML = `
                        <a href="${article.link}" target="_blank">${article.title}</a>
                        <span class="news-source">${fallbackSourceName} ${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                        <span class="news-date">${formattedDate}</span>
                    `;
                    
                    newsList.appendChild(li);
                });
            })
            .catch(error => {
                console.error(`[NEWS] Error fetching fallback ${category} news:`, error);
                newsList.innerHTML = `
                    <li class="news-loading">
                        Unable to load ${category} news. Please check your internet connection and try again.
                    </li>`;
            });
    }
    
    // Add event listener for refresh button
    if (refreshNewsButton) {
        refreshNewsButton.addEventListener('click', () => {
            refreshNewsButton.style.transform = 'rotate(360deg)';
            fetchNews(currentNewsCategory); // Refresh current category
            setTimeout(() => {
                refreshNewsButton.style.transform = 'rotate(0deg)';
            }, 600);
        });
    }
    
    // Initialize news tabs
    initializeNewsTabs();
    
    // Fetch news on initial load
    fetchNews();
    
    // --- End News Integration ---

    // Function to standardize all delete buttons to use × character
    function standardizeDeleteButtons() {
        // Find all functions that create delete buttons and update them
        const script = document.querySelector('script[src="script.js"]');
        if (script) {
            const scriptContent = script.textContent;
            // This is just for visual feedback - the actual replacements are done below
            console.log('[STANDARDIZE] Standardizing delete buttons to use × character');
        }
        
        // The actual standardization happens in the individual functions
        // when buttons are created, by using textContent = '×' instead of innerHTML = '&times;'
    }
    
    // Call the standardization function
    standardizeDeleteButtons();
    
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
    
    // Get references for calendar and shared controls
    const monthYearElement1 = document.getElementById('month-year-1');
    const calendarGrid1 = document.getElementById('calendar-grid-1');
    const toggleViewButton = document.getElementById('toggle-view-button');

    const prevButton = document.getElementById('prev-month'); 
    const nextButton = document.getElementById('next-month'); 
    
    const noteModal = document.getElementById('note-modal');
    const modalDateElement = document.getElementById('modal-date');
    const noteCloseButton = document.getElementById('note-close-button');
    
    // New modal elements for multi-event support
    const eventsListElement = document.getElementById('events-list');
    
    // Add new event section elements
    const newEventTimeElement = document.getElementById('new-event-time');
    const newEventTextElement = document.getElementById('new-event-text');
    const newEventChecklistElement = document.getElementById('new-event-checklist');
    const newChecklistItemElement = document.getElementById('new-checklist-item');
    const addItemButton = document.getElementById('add-item-button');
    const addEventButton = document.getElementById('add-event-button');
    
    // Edit event section elements
    const editEventSection = document.getElementById('edit-event-section');
    const editEventTimeElement = document.getElementById('edit-event-time');
    const editEventTextElement = document.getElementById('edit-event-text');
    const editEventChecklistElement = document.getElementById('edit-event-checklist');
    const editChecklistItemElement = document.getElementById('edit-checklist-item');
    const editAddItemButton = document.getElementById('edit-add-item-button');
    const saveEditedEventButton = document.getElementById('save-edited-event');
    const cancelEditButton = document.getElementById('cancel-edit');
    const deleteEventButton = document.getElementById('delete-event');
    
    // Progress panel elements
    const eventProgressPanel = document.getElementById('event-progress-panel');
    const progressItemsContainer = document.getElementById('progress-items-container');
    
    // Authentication elements
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const googleSignInButton = document.getElementById('google-signin-button');
    const logoutButton = document.getElementById('logout-button');

    // Main Goals elements
    const goalsContainer = document.getElementById('goals-container');
    const editGoalsButton = document.getElementById('edit-goals-button');
    const goalsModal = document.getElementById('goals-modal');
    const goalInputs = [
        document.getElementById('goal-1'),
        document.getElementById('goal-2'),
        document.getElementById('goal-3'),
        document.getElementById('goal-4'),
        document.getElementById('goal-5')
    ];
    const saveGoalsButton = document.getElementById('save-goals-button');
    const goalsCloseButton = document.getElementById('goals-close-button');
    
    // Debug log
    console.log('Goals close button:', goalsCloseButton);

    // New Goals Modal Tab Elements
    const selectTasksTab = document.getElementById('select-tasks-tab');
    const customGoalsTab = document.getElementById('custom-goals-tab');
    const selectTasksContainer = document.getElementById('select-tasks-container');
    const customGoalsContainer = document.getElementById('custom-goals-container');
    const taskSearchInput = document.getElementById('task-search-input');
    const availableTasksContainer = document.getElementById('available-tasks-container');
    const selectedGoalsContainer = document.getElementById('selected-goals');
    const noTasksMessage = document.querySelector('.no-tasks-message');
    
    // Track selected tasks for goals
    let selectedTasks = [];

    let currentView = 'week'; // Mobile view state: 'week' or 'month'

    // Create fresh date objects for the current date
    const currentDate = new Date();
    // Reset time portions to zero for accurate date comparison
    currentDate.setHours(0, 0, 0, 0);
    
    // Set up month view (start at first day of current month)
    let currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    currentMonthDate.setHours(0, 0, 0, 0);
    console.log('[INIT] Current month date:', currentMonthDate);
    
    // Set up mobile week view (start at current date)
    let mobileWeekStartDate = new Date(currentDate);
    mobileWeekStartDate.setHours(0, 0, 0, 0);
    console.log('[INIT] Mobile week start date:', mobileWeekStartDate);
    
    let selectedDateString = null;
    // Create a fresh today variable with the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Debug output for today's date
    console.log('[INIT] Today date:', today);
    console.log('[INIT] Today date string:', 
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);

    // Add variable to track current event being edited
    let currentEditingEventId = null;

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
            console.log('[AUTH] User detected:', user.email);
            loginForm.style.display = 'none';
            userInfo.style.display = 'block';
            userEmail.textContent = user.email;
            
            // Fetch notes from Firestore
            console.log('[AUTH] Fetching notes for user:', user.uid);
            db.collection('userNotes').doc(user.uid).get()
                .then(doc => {
                    console.log('[AUTH] Firestore response:', doc.exists ? 'Document exists' : 'No document found');
                    if (doc.exists) {
                        // Use cloud data only when signed in
                        if (doc.data().notes) {
                            // Update the global notes object
                            window.calendarNotes = doc.data().notes;
                            // Update our local reference
                            notes = window.calendarNotes;
                            console.log('[AUTH] Loaded notes from cloud');
                        }
                        
                        // Load main goals if they exist in cloud data
                        if (doc.data().mainGoals) {
                            mainGoals = doc.data().mainGoals;
                            localStorage.setItem('mainGoals', JSON.stringify(mainGoals));
                            console.log('[AUTH] Loaded main goals from cloud');
                        }
                        
                        renderCalendarView();
                        renderMainGoals();
                    } else {
                        // No cloud data, start with empty notes
                        // Keep using our global object, but reset it if empty
                        if (Object.keys(window.calendarNotes).length === 0) {
                            window.calendarNotes = {};
                            notes = window.calendarNotes;
                        }
                        console.log('[AUTH] No existing notes found in cloud, using current data');
                        renderCalendarView();
                        renderMainGoals();
                    }
                })
                .catch(error => {
                    console.error("[AUTH] Error fetching notes:", error);
                    alert("Error fetching your calendar data: " + error.message);
                    // Keep using our global object, but reset it if empty
                    if (Object.keys(window.calendarNotes).length === 0) {
                        window.calendarNotes = {};
                        notes = window.calendarNotes;
                    }
                    renderCalendarView(); // Render view with existing data
                    renderMainGoals();
                });
        } else {
            // User is signed out - for testing purposes, allow using the app
            console.log('[AUTH] No user logged in - using test mode');
            loginForm.style.display = 'block';
            userInfo.style.display = 'none';
            
            // Keep using our global notes object 
            if (Object.keys(window.calendarNotes).length === 0) {
                window.calendarNotes = {}; // Only initialize if empty
                notes = window.calendarNotes;
                console.log('[AUTH] Using empty notes object for testing');
            } else {
                notes = window.calendarNotes;
                console.log('[AUTH] Using existing notes data for testing');
            }
            
            // Render with test data
            renderCalendarView();
            renderMainGoals();
        }
    });
    
    // --- End Firebase Authentication Logic ---

    // --- Main Goals Functions ---
    function renderMainGoals() {
        goalsContainer.innerHTML = '';
        if (mainGoals.length === 0) {
            goalsContainer.innerHTML = `
                <p class="no-goals-message">
                    <span class="placeholder-emoji">✏️</span> Add tasks like "Finish Math HW" or "Prepare for photo shoot."
                    <br><br>
                    <small>Click "Edit List" to get started!</small>
                </p>`;
            return;
        }
        mainGoals.forEach((goal, index) => {
            const goalItem = document.createElement('div');
            goalItem.classList.add('goal-item');
            if (goal.completed) {
                goalItem.classList.add('completed-goal');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = goal.completed;
            checkbox.id = `main-goal-cb-${index}`;
            checkbox.dataset.goalIndex = index;
            checkbox.addEventListener('change', handleMainGoalCheckboxChange);

            const goalText = document.createElement('label');
            goalText.htmlFor = checkbox.id;
            goalText.textContent = goal.text;
            
            goalItem.appendChild(checkbox);
            goalItem.appendChild(goalText);
            
            // Extract deadline information from goal text if it exists
            // Format: "Task (from "Event" on Jan 1) [Due: 2023-01-15]"
            const deadlineRegex = /\[Due: (\d{4}-\d{2}-\d{2})\]/;
            const deadlineMatch = goal.text.match(deadlineRegex);
            
            if (deadlineMatch && deadlineMatch[1]) {
                const deadline = deadlineMatch[1];
                const deadlineElement = createDeadlineElement(deadline);
                if (deadlineElement) {
                    // Apply additional styling for goal deadline elements
                    deadlineElement.style.marginLeft = 'auto';
                    deadlineElement.style.order = '2';
                    goalItem.appendChild(deadlineElement);
                }
            }
            
            goalsContainer.appendChild(goalItem);
        });
    }

    function handleMainGoalCheckboxChange(event) {
        const goalIndex = parseInt(event.target.dataset.goalIndex);
        if (goalIndex >= 0 && goalIndex < mainGoals.length) {
            mainGoals[goalIndex].completed = event.target.checked;
            localStorage.setItem('mainGoals', JSON.stringify(mainGoals));
            renderMainGoals();
        }
    }

    function openGoalsModal() {
        // Reset selected tasks
        selectedTasks = [];
        
        // Load tasks from events for selection
        loadTasksFromEvents();
        
        // Show the appropriate tab
        selectTasksTab.classList.add('active');
        customGoalsTab.classList.remove('active');
        selectTasksContainer.style.display = 'block';
        customGoalsContainer.style.display = 'none';
        
        // Set existing goals in the custom inputs
        goalInputs.forEach((input, index) => {
            if (mainGoals[index]) {
                input.value = mainGoals[index].text;
            } else {
                input.value = '';
            }
        });
        
        goalsModal.style.display = 'block';
    }

    function loadTasksFromEvents() {
        // Get all tasks from all events in the calendar
        const allTasks = getAllTasksFromEvents();
        
        // Clear the container
        availableTasksContainer.innerHTML = '';
        
        // Show message if no tasks
        if (allTasks.length === 0) {
            noTasksMessage.style.display = 'block';
            return;
        }
        
        noTasksMessage.style.display = 'none';
        
        // Add each task to the container
        allTasks.forEach(task => {
            const taskItem = createTaskElement(task);
            availableTasksContainer.appendChild(taskItem);
        });
        
        // Refresh selected goals container
        renderSelectedGoals();
    }

    function getAllTasksFromEvents() {
        const allTasks = [];
        const globalNotes = window.calendarNotes;
        
        // Loop through all dates with events
        for (const dateString in globalNotes) {
            const eventsForDay = globalNotes[dateString] || [];
            
            // Convert date to readable format
            const [year, month, day] = dateString.split('-');
            const dateObj = new Date(year, month - 1, day);
            const formattedDate = dateObj.toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric' 
            });
            
            // Loop through all events on this date
            eventsForDay.forEach(event => {
                const eventText = event.text || "(No description)";
                
                // Check if this event has a checklist
                if (event.checklist && event.checklist.length > 0) {
                    // Add each task from the checklist
                    event.checklist.forEach(item => {
                        allTasks.push({
                            text: item.task,
                            done: item.done,
                            deadline: item.deadline || null,
                            dateString: dateString,
                            formattedDate: formattedDate,
                            eventText: eventText
                        });
                    });
                }
            });
        }
        
        return allTasks;
    }

    function createTaskElement(task) {
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item');
        
        // Mark as selected if already in goals
        const isSelected = selectedTasks.some(selectedTask => 
            selectedTask.text === task.text && 
            selectedTask.dateString === task.dateString
        );
        
        if (isSelected) {
            taskItem.classList.add('selected');
        }
        
        const taskInfo = document.createElement('div');
        taskInfo.classList.add('task-info');
        
        const taskText = document.createElement('div');
        taskText.classList.add('task-text');
        taskText.textContent = task.text;
        
        const taskSource = document.createElement('div');
        taskSource.classList.add('task-source');
        taskSource.textContent = `From "${task.eventText}" on ${task.formattedDate}`;
        
        taskInfo.appendChild(taskText);
        taskInfo.appendChild(taskSource);
        
        // Add deadline display if task has a deadline
        if (task.deadline) {
            const deadlineElement = createDeadlineElement(task.deadline);
            if (deadlineElement) {
                taskInfo.appendChild(deadlineElement);
            }
        }
        
        const taskAction = document.createElement('div');
        taskAction.classList.add('task-action');
        
        const actionButton = document.createElement('button');
        
        if (isSelected) {
            actionButton.classList.add('remove-task-button');
            actionButton.textContent = '×';
            actionButton.title = 'Remove from goals';
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                removeTaskFromSelection(task);
            });
        } else {
            actionButton.classList.add('add-task-button');
            actionButton.textContent = '+';
            actionButton.title = 'Add to goals';
            actionButton.addEventListener('click', (e) => {
                e.stopPropagation();
                addTaskToSelection(task);
            });
        }
        
        taskAction.appendChild(actionButton);
        
        taskItem.appendChild(taskInfo);
        taskItem.appendChild(taskAction);
        
        // Make the whole item clickable
        taskItem.addEventListener('click', () => {
            if (isSelected) {
                removeTaskFromSelection(task);
            } else {
                addTaskToSelection(task);
            }
        });
        
        return taskItem;
    }

    function addTaskToSelection(task) {
        // Check if already at maximum (5 goals)
        if (selectedTasks.length >= 5) {
            alert('You can only select up to 5 items. Remove one first.');
            return;
        }
        
        // Add to selected tasks
        selectedTasks.push(task);
        
        // Refresh the task list and selected goals
        loadTasksFromEvents();
    }

    function removeTaskFromSelection(taskToRemove) {
        // Remove from selected tasks
        selectedTasks = selectedTasks.filter(task => 
            !(task.text === taskToRemove.text && task.dateString === taskToRemove.dateString)
        );
        
        // Refresh the task list and selected goals
        loadTasksFromEvents();
    }

    function renderSelectedGoals() {
        // Clear the container
        selectedGoalsContainer.innerHTML = '';
        
        // Add each selected task
        selectedTasks.forEach(task => {
            const goalItem = document.createElement('div');
            goalItem.classList.add('selected-goal-item');
            
            const goalText = document.createElement('div');
            goalText.classList.add('selected-goal-text');
            goalText.textContent = task.text;
            
            const removeButton = document.createElement('button');
            removeButton.classList.add('remove-task-button');
            removeButton.textContent = '×';
            removeButton.title = 'Remove from goals';
            removeButton.addEventListener('click', () => {
                removeTaskFromSelection(task);
            });
            
            goalItem.appendChild(goalText);
            goalItem.appendChild(removeButton);
            
            selectedGoalsContainer.appendChild(goalItem);
        });
    }

    function filterTasks() {
        const searchTerm = taskSearchInput.value.toLowerCase();
        const taskItems = availableTasksContainer.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            const taskText = item.querySelector('.task-text').textContent.toLowerCase();
            const eventText = item.querySelector('.task-source').textContent.toLowerCase();
            
            if (taskText.includes(searchTerm) || eventText.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    function closeGoalsModal() {
        console.log('Closing goals modal...');
        goalsModal.style.display = 'none';
    }

    function saveMainGoals() {
        const newGoals = [];
        const activeTab = document.querySelector('.goal-tab.active').id;
        
        if (activeTab === 'select-tasks-tab') {
            // Save from selected tasks
            selectedTasks.forEach(task => {
                // Add deadline information to the goal text if available
                let goalText = `${task.text} (from "${task.eventText}" on ${task.formattedDate})`;
                
                // Append deadline information if available
                if (task.deadline) {
                    goalText += ` [Due: ${task.deadline}]`;
                }
                
                // Check if this goal text already exists in main goals
                const existingGoal = mainGoals.find(g => g.text === goalText);
                
                newGoals.push({
                    text: goalText,
                    completed: existingGoal ? existingGoal.completed : task.done
                });
            });
        } else {
            // Save from custom input fields
            goalInputs.forEach(input => {
            const text = input.value.trim();
            if (text) {
                    // Preserve completed status if goal text is the same
                const existingGoal = mainGoals.find(g => g.text === text);
                newGoals.push({ 
                    text: text, 
                        completed: existingGoal ? existingGoal.completed : false
                });
            }
        });
        }
        
        mainGoals = newGoals.slice(0, 5); // Limit to 5 goals
        localStorage.setItem('mainGoals', JSON.stringify(mainGoals));
        
        // If logged in, also save to Firebase
        if (firebase.auth().currentUser) {
            db.collection('userNotes').doc(firebase.auth().currentUser.uid).update({
                mainGoals: mainGoals
            }).catch(error => {
                console.error('Error saving main goals to Firebase:', error);
            });
        }
        
        renderMainGoals();
        closeGoalsModal();
    }
    
    // --- End Main Goals Functions ---

    // --- Helper Function: Format Time Difference ---
    function formatTimeDifference(date1, date2) {
        // Create copies of the dates and set time to midnight for accurate day comparisons
        const d1 = new Date(date1);
        d1.setHours(0, 0, 0, 0);
        const d2 = new Date(date2);
        d2.setHours(0, 0, 0, 0);

        const diffTime = d1.getTime() - d2.getTime();
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

    // --- Rendering Functions ---

    // Function to truncate text with ellipsis after a certain length
    function truncateText(text, maxLength = 25) {
        if (text && text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    }

    // Renders a single month into a specific grid/header element
    function renderCalendar(targetDate, gridElement, monthYearElement) {
        console.log(`[NEW RENDER] Starting renderCalendar for ${targetDate.toDateString()}`);
        const globalNotes = window.calendarNotes;

        const nowDate = new Date();
        nowDate.setHours(0, 0, 0, 0);
        const todayYear = nowDate.getFullYear();
        const todayMonth = nowDate.getMonth();
        const todayDay = nowDate.getDate();

        gridElement.innerHTML = ''; // Clear previous grid content VERY FIRST

        const year = targetDate.getFullYear();
        const month = targetDate.getMonth(); // 0-indexed

        monthYearElement.textContent = `${targetDate.toLocaleString('default', { month: 'long' })} ${year}`;
        console.log(`[NEW RENDER] Rendering month: ${month + 1}/${year}`);

        const firstDayOfMonth = new Date(year, month, 1);
        const firstDayIndex = firstDayOfMonth.getDay(); // 0 (Sunday) to 6 (Saturday)

        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();

        console.log(`[NEW RENDER] ${month + 1}/${year}: First day is index ${firstDayIndex}, ${daysInMonth} days total.`);

        // Use a DocumentFragment for performance and atomic updates
        const fragment = document.createDocumentFragment();

        // Add day headers (Sun-Sat)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(name => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('day-header');
            dayHeader.textContent = name;
            fragment.appendChild(dayHeader);
        });

        // Add empty cells for days before the 1st of the month
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyDayCell = document.createElement('div');
            emptyDayCell.classList.add('day', 'other-month');
            fragment.appendChild(emptyDayCell);
        }

        // Add cells for each day of the month
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
            const currentDateOfLoop = new Date(year, month, dayNum);
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

            const dayCell = document.createElement('div');
            dayCell.classList.add('day');
            dayCell.dataset.date = dateString;
            dayCell.dataset.dayNum = dayNum; // For easier debugging

            const dayNumberElement = document.createElement('div');
            dayNumberElement.classList.add('day-number');
            dayNumberElement.textContent = dayNum;
            dayCell.appendChild(dayNumberElement);

            const isToday = (dayNum === todayDay && month === todayMonth && year === todayYear);
            if (isToday) {
                dayCell.classList.add('today');
                console.log(`[NEW RENDER] Marked as TODAY: ${dateString}.`);
            }

            // --- Display Events --- 
            const eventsForDay = globalNotes[dateString] || [];
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('day-events');

            if (eventsForDay.length === 1) {
                const eventTextElement = document.createElement('div');
                eventTextElement.classList.add('note-text', 'single-event');
                let displayText = eventsForDay[0].text || '(No description)';
                if (eventsForDay[0].time) displayText = `${eventsForDay[0].time} - ${displayText}`; 
                // Truncate display text to prevent overflow
                eventTextElement.textContent = truncateText(displayText);
                eventTextElement.title = displayText; // Show full text on hover
                eventsContainer.appendChild(eventTextElement);
            } else if (eventsForDay.length > 1) {
                const eventCountElement = document.createElement('div');
                eventCountElement.classList.add('note-text', 'event-count');
                eventCountElement.textContent = `${eventsForDay.length} Events`;
                eventsContainer.appendChild(eventCountElement);
            }
            dayCell.appendChild(eventsContainer);
            // --- End Display Events ---

            dayCell.addEventListener('click', () => openNoteModal(dateString));
            fragment.appendChild(dayCell);
        }

        // Append the entire fragment to the grid at once
        gridElement.appendChild(fragment);
        console.log(`[NEW RENDER] Appended all day cells for ${month + 1}/${year}. Total children in grid: ${gridElement.children.length}`);
    }

    // Renders two adjacent months for desktop
    function renderDesktopView() {
        renderMonthView();
    }
    
    // Renders the mobile month view (uses renderCalendar)
    function renderMobileMonthView() {
        renderMonthView();
    }

    // Renders the single month view 
    function renderMonthView() {
        renderCalendar(currentMonthDate, calendarGrid1, monthYearElement1);
        
        // Update month-year display directly without relying on the removed select element
        const monthYearElement = document.getElementById('month-year-1');
        if (monthYearElement) {
            const options = { year: 'numeric', month: 'long' };
            monthYearElement.textContent = currentMonthDate.toLocaleDateString('en-US', options);
        }
    }

    // --- Event Listeners ---
    prevButton.addEventListener('click', () => {
        currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
        
        if (currentView === 'week' && window.innerWidth <= 768) {
            mobileWeekStartDate.setDate(mobileWeekStartDate.getDate() - 7);
        }
        renderCalendarView();
    });

    nextButton.addEventListener('click', () => {
        currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
        
        if (currentView === 'week' && window.innerWidth <= 768) {
            mobileWeekStartDate.setDate(mobileWeekStartDate.getDate() + 7);
        }
        renderCalendarView();
    });

    // Toggle view only affects mobile
    toggleViewButton.addEventListener('click', () => {
        currentView = (currentView === 'week') ? 'month' : 'week';
        if (currentView === 'month') {
            // When switching to month view, set month based on current week view start date
            currentMonthDate = new Date(mobileWeekStartDate);
            currentMonthDate.setDate(1);
        } else {
            // When switching back to week view, reset to today
            mobileWeekStartDate = new Date(); 
            mobileWeekStartDate.setHours(0, 0, 0, 0);
        }
        renderCalendarView(); // Re-render mobile view
    });

    // Add event listener for Today button
    document.getElementById('today-button').addEventListener('click', () => {
        console.log('[CALENDAR] Today button clicked');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Reset calendar view to current month
        currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
        currentMonthDate.setHours(0, 0, 0, 0);
        
        // Set mobile week view to start on the Sunday before the current date
        const dayOfWeek = today.getDay();
        mobileWeekStartDate = new Date(today);
        mobileWeekStartDate.setDate(today.getDate() - dayOfWeek);
            mobileWeekStartDate.setHours(0, 0, 0, 0);
            
        // Force refresh with today highlighted
        window.forceCalendarReset = true;
        renderCalendarView();
        
        console.log('[CALENDAR] Calendar reset to today');
    });

    // Handle month selection from dropdown
    if (document.getElementById('month-select')) {
        const monthSelectElement = document.getElementById('month-select');
        monthSelectElement.addEventListener('change', () => {
            const selectedMonth = parseInt(monthSelectElement.value);
            const yearDisplay = document.getElementById('year-display');
            const year = yearDisplay ? parseInt(yearDisplay.textContent) : currentMonthDate.getFullYear();
            
            // Update month view
            currentMonthDate = new Date(year, selectedMonth, 1);
            currentMonthDate.setHours(0, 0, 0, 0);
            renderCalendarView();
        });
    }

    // Update month/year display
    function updateMonthSelect() {
        // This function now only needs to update the month-year-1 display
        // since we removed the month selector dropdown
        const monthYearElement = document.getElementById('month-year-1');
        if (monthYearElement) {
            const options = { year: 'numeric', month: 'long' };
            monthYearElement.textContent = currentMonthDate.toLocaleDateString('en-US', options);
        }
    }

    // --- Event Progress Panel for Multiple Events ---
    function renderEventProgressPanel() {
        // Always use the global notes object
        const globalNotes = window.calendarNotes;
        
        console.log('[PROGRESS PANEL] Starting to render progress panel');
        
        // Clear existing panel content
        progressItemsContainer.innerHTML = '';
        
        // Get all dates with events
        const datesWithEvents = Object.entries(globalNotes);
        console.log('[PROGRESS PANEL] Found', datesWithEvents.length, 'dates with events');
        
        // Empty check for test mode
        if (datesWithEvents.length === 0) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.classList.add('no-events-message-panel');
            noEventsMessage.innerHTML = `
                <p>No tasks to track yet!</p>
                <p class="subtext">Add checklists to events to see your progress here.</p>
            `;
            progressItemsContainer.appendChild(noEventsMessage);
            return;
        }
        
        // Filter to include only events with checklists and sort by date
        let eventsWithChecklists = [];
        
        datesWithEvents.forEach(([dateString, eventsArray]) => {
            console.log(`Processing date ${dateString} with ${eventsArray.length} events`);
            
            // For each date, filter to events with checklists
            const dateEvents = eventsArray.filter(event => {
                const hasChecklist = event.checklist && event.checklist.length > 0;
                console.log(`Event ${event.id}: has checklist = ${hasChecklist}, items: ${event.checklist ? event.checklist.length : 0}`);
                return hasChecklist;
            });
            
            console.log(`Found ${dateEvents.length} events with checklists for ${dateString}`);
            
            // Add date and event details to our array
            dateEvents.forEach(event => {
                eventsWithChecklists.push({
                    dateString,
                    event
                });
            });
        });
        
        console.log('Total events with checklists:', eventsWithChecklists.length);
        
        // Sort by date
        eventsWithChecklists.sort((a, b) => new Date(a.dateString) - new Date(b.dateString));
        
        // If no events with checklists, show message
        if (eventsWithChecklists.length === 0) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.classList.add('no-events-message-panel');
            noEventsMessage.innerHTML = `
                <p>No tasks to track yet!</p>
                <p class="subtext">Add checklists to your events by clicking on a calendar date.</p>
            `;
            progressItemsContainer.appendChild(noEventsMessage);
            return;
        }
        
        // Group events by date for the panel
        const groupedByDate = {};
        
        eventsWithChecklists.forEach(item => {
            if (!groupedByDate[item.dateString]) {
                groupedByDate[item.dateString] = [];
            }
            groupedByDate[item.dateString].push(item.event);
        });
        
        // Create and append elements for each date
        Object.entries(groupedByDate).forEach(([dateString, events]) => {
            // Create the card container
            const itemContainer = document.createElement('div');
            itemContainer.classList.add('progress-item');

            // Create header section with date
            const headerSection = document.createElement('div');
            headerSection.classList.add('progress-item-header');
            
            // Add Date
            const itemDate = document.createElement('span');
            itemDate.classList.add('item-date');
            const [year, month, day] = dateString.split('-');
            const dateObj = new Date(year, month-1, day);
            
            // Format date with day of week and relative time indicator
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const relativeTimeStr = formatTimeDifference(dateObj, today);
            
            itemDate.textContent = `${dateObj.toLocaleDateString('en-US', { 
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
            })} ${relativeTimeStr}`;
            
            headerSection.appendChild(itemDate);

            // Add Date Text
            const itemText = document.createElement('div');
            itemText.classList.add('item-text');
            itemText.textContent = `${events.length} event${events.length > 1 ? 's' : ''}`;
            headerSection.appendChild(itemText);
            
            itemContainer.appendChild(headerSection);

            // Add Events Container
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            
            // Add each event
            events.forEach((event, index) => {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'panel-event';
                
                // Create event header with time, text and edit button
                const eventHeader = document.createElement('div');
                eventHeader.classList.add('panel-event-header');
                
                // Add event time and text
                const eventDetails = document.createElement('div');
                eventDetails.classList.add('panel-event-details');
                
                if (event.time) {
                    const timeElement = document.createElement('span');
                    timeElement.classList.add('panel-event-time');
                    timeElement.textContent = event.time;
                    eventDetails.appendChild(timeElement);
                }
                
                const textElement = document.createElement('span');
                textElement.classList.add('panel-event-text');
                textElement.textContent = event.text || '(No description)';
                eventDetails.appendChild(textElement);
                
                eventHeader.appendChild(eventDetails);
                
                // Create edit button
                const editButton = document.createElement('button');
                editButton.className = 'panel-event-edit';
                editButton.innerHTML = '<span class="edit-icon">✎</span> Edit';
                editButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openNoteModal(dateString);
                    // Find and click the event in the modal to edit it
                    setTimeout(() => {
                        const eventItems = eventsListElement.querySelectorAll('.event-item');
                        eventItems.forEach(item => {
                            if (item.dataset.eventId == event.id) {
                                item.click();
                            }
                        });
                    }, 100);
                });
                
                eventHeader.appendChild(editButton);
                eventDiv.appendChild(eventHeader);
                
                // Add checklist progress for this event
                if (event.checklist && event.checklist.length > 0) {
                    const totalItems = event.checklist.length;
                    const completedItems = event.checklist.filter(item => item.done).length;
                    const percent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

            const progressContainer = document.createElement('div');
            progressContainer.classList.add('progress-container');
            
            const progressBarContainer = document.createElement('div');
            progressBarContainer.classList.add('progress-bar-container');
            
            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
                    progressBar.style.width = `${percent}%`;
            
            progressBarContainer.appendChild(progressBar);
            progressContainer.appendChild(progressBarContainer);

            const progressSummary = document.createElement('div');
            progressSummary.classList.add('progress-summary');
                    progressSummary.textContent = `${completedItems}/${totalItems} Tasks`;
                    
                    // Add toggle button
                    const toggleButton = document.createElement('button');
                    toggleButton.classList.add('toggle-checklist-button');
                    toggleButton.textContent = 'Hide Tasks';
                    toggleButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent event bubble to parent
                        const checklistContainer = e.target.nextElementSibling;
                        if (checklistContainer.style.display === 'none' || !checklistContainer.style.display) {
                            checklistContainer.style.display = 'block';
                            e.target.textContent = 'Hide Tasks';
            } else {
                            checklistContainer.style.display = 'none';
                            e.target.textContent = 'Show Tasks';
                        }
                    });
                    
                    // Create checklist container (initially visible)
            const checklistContainer = document.createElement('div');
                    checklistContainer.classList.add('panel-checklist-container');
                    checklistContainer.style.display = 'block';
            
                    // Add checklist items
                    const checklistUl = document.createElement('ul');
                    checklistUl.classList.add('panel-checklist');

                    // Add clickable checklist items
                    event.checklist.forEach((item, index) => {
                const li = document.createElement('li');

                // Create checkbox with proper event handler
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `panel-cb-${event.id}-${index}`;
                checkbox.checked = item.done;
                
                // Create label once
                const label = document.createElement('label');
                label.classList.add('panel-checklist-label');
                label.htmlFor = checkbox.id;
                label.textContent = item.task;
                
                if (item.done) {
                    label.classList.add('completed');
                }
                
                // Prevent event propagation to parent
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent opening edit modal
                });
                
                label.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent opening edit modal
                });
                
                // Add elements to the list item
                li.appendChild(checkbox);
                li.appendChild(label);
                
                // Add deadline display if there is a deadline - now positioned after label
                if (item.deadline) {
                    const deadlineElement = createDeadlineElement(item.deadline);
                    if (deadlineElement) {
                        deadlineElement.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent opening edit modal
                });
                        li.appendChild(deadlineElement);
                    }
                }
                
                // Add event listener for checkbox changes
                checkbox.addEventListener('change', (e) => {
                    // Always use the global notes object
                    const globalNotes = window.calendarNotes;
                    
                    // Update the checked state in the UI
                    label.classList.toggle('completed', checkbox.checked);
                    
                    // Find and update the item in the data structure
                    const updatedEvents = globalNotes[dateString] || [];
                    const eventIndex = updatedEvents.findIndex(e => e.id === event.id);
                    
                    if (eventIndex !== -1) {
                        const checklistItems = updatedEvents[eventIndex].checklist || [];
                        const itemIndex = checklistItems.findIndex(i => i.task === item.task);
                        
                        if (itemIndex !== -1) {
                            // Update the done state
                            checklistItems[itemIndex].done = checkbox.checked;
                            
                            // Update in the data structure
                            updatedEvents[eventIndex].checklist = checklistItems;
                            globalNotes[dateString] = updatedEvents;
                            // Update local reference
                            notes = globalNotes;
                            
                            // Update progress bar
                            const totalItems = checklistItems.length;
                            const completedItems = checklistItems.filter(i => i.done).length;
                            const percent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
                            progressBar.style.width = `${percent}%`;
                            progressSummary.textContent = `${completedItems}/${totalItems} Tasks`;
                            
                            // Save to Firebase if signed in
                            if (firebase.auth().currentUser) {
                                saveNotesToFirebase();
                                console.log('[CHECKBOX] Saved change to Firebase');
                            } else {
                                console.log('[CHECKBOX] Test mode: Checklist update saved to memory only');
                            }
                        }
                    }
                });
                        
                        // Append the list item to the checklist
                        checklistUl.appendChild(li);
                    });
                    
                    checklistContainer.appendChild(checklistUl);
                    progressContainer.appendChild(progressSummary);
                    
                    eventDiv.appendChild(progressContainer);
                    eventDiv.appendChild(toggleButton);
                    eventDiv.appendChild(checklistContainer);
                }
                
                eventsContainer.appendChild(eventDiv);
            });
            
            itemContainer.appendChild(eventsContainer);
            progressItemsContainer.appendChild(itemContainer);
        });
    }

    // --- Modal Functions ---
    function openNoteModal(dateString) {
        // TEST MODE: Allow adding notes without signing in
        // if (!firebase.auth().currentUser) {
        //     alert("Please sign in to add or view notes");
        //     return;
        // }
        
        console.log('------ OPENING NOTE MODAL ------');
        console.log('Opening modal for date:', dateString);
        
        selectedDateString = dateString;
        const [year, month, day] = dateString.split('-');
        const dateObj = new Date(year, month - 1, day);
        modalDateElement.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        // Reset any editing state
        hideEditEventSection();
        
        // Reset new event form - ensure all fields are cleared
        newEventTimeElement.value = '';
        newEventTextElement.value = '';
        newEventChecklistElement.innerHTML = '';
        newChecklistItemElement.value = '';
        
        // Explicitly set display states
        editEventSection.style.display = 'none';
        
        // Get events for this date
        const eventsForDay = window.calendarNotes[dateString] || [];
        
        // Show or hide events list based on whether there are events
        if (eventsForDay.length === 0) {
            // No events - hide the events list container and focus on adding new event
            document.getElementById('events-list-container').style.display = 'none';
            document.getElementById('add-event-section').style.display = 'block';
            document.getElementById('add-event-section').querySelector('h4').textContent = 'Create New Event';
        } else {
            // Events exist - show the events list but hide the add event form initially
            document.getElementById('events-list-container').style.display = 'block';
            document.getElementById('add-event-section').style.display = 'none';
        
        // Display events for this date
        displayEventsInModal();
            
            // Make sure the "Add Event" button exists in the events list container
            if (!document.getElementById('show-add-event-button')) {
                const addEventButtonContainer = document.createElement('div');
                addEventButtonContainer.className = 'add-event-button-container';
                
                const showAddEventButton = document.createElement('button');
                showAddEventButton.id = 'show-add-event-button';
                showAddEventButton.className = 'action-button';
                showAddEventButton.textContent = 'Add New Event';
                showAddEventButton.addEventListener('click', () => {
                    // Show the add event section when button is clicked
                    document.getElementById('add-event-section').style.display = 'block';
                    document.getElementById('add-event-section').querySelector('h4').textContent = 'Add Another Event';
                    
                    // Scroll to the add event section
                    document.getElementById('add-event-section').scrollIntoView({ behavior: 'smooth' });
                });
                
                addEventButtonContainer.appendChild(showAddEventButton);
                document.getElementById('events-list-container').appendChild(addEventButtonContainer);
            }
        }
        
        // Update modal instructions
        updateModalInstructions();
        
        // Show the modal
        noteModal.style.display = 'block';
        
        console.log('------ NOTE MODAL OPENED ------');
    }

    function closeNoteModal() {
        noteModal.style.display = 'none';
        selectedDateString = null;
        currentEditingEventId = null;
    }
    
    // Display all events for the selected date
    function displayEventsInModal() {
        // Always use the global notes object
        const globalNotes = window.calendarNotes;
        
        // Get events for the selected date
        const eventsForDay = globalNotes[selectedDateString] || [];
        
        console.log('[DISPLAY EVENTS] For date:', selectedDateString);
        console.log('[DISPLAY EVENTS] Total events:', eventsForDay.length);
        
        // Only proceed if there are events or if events list is being displayed
        if (document.getElementById('events-list-container').style.display === 'none') {
            console.log('[DISPLAY EVENTS] Events list is hidden, skipping rendering');
            return;
        }
        
        // Clear the events list
        eventsListElement.innerHTML = '';
        
        if (eventsForDay.length === 0) {
            // Show "no events" message
            const noEventsMessage = document.createElement('div');
            noEventsMessage.classList.add('no-events-message');
            noEventsMessage.textContent = 'No events for this day. Add one below.';
            eventsListElement.appendChild(noEventsMessage);
        } else {
            // Create and display each event in the list
            eventsForDay.forEach((event, index) => {
                console.log(`[DISPLAY EVENTS] Rendering event ${index+1}:`, event.id);
                
                const eventItem = document.createElement('div');
                eventItem.classList.add('event-item');
                eventItem.dataset.eventId = event.id; // Store event ID for editing
                
                // Time section (if exists)
                const timeElement = document.createElement('div');
                timeElement.classList.add('event-time');
                timeElement.textContent = event.time || '-';
                
                // Text section (description)
                const textElement = document.createElement('div');
                textElement.classList.add('event-text');
                textElement.textContent = event.text || '(No description)';
                
                // Checklist indicator (if has checklist)
                if (event.checklist && event.checklist.length > 0) {
                    const completedItems = event.checklist.filter(item => item.done).length;
                    const checklistIndicator = document.createElement('div');
                    checklistIndicator.classList.add('event-checklist-indicator');
                    checklistIndicator.textContent = `✓ ${completedItems}/${event.checklist.length}`;
                    eventItem.appendChild(timeElement);
                    eventItem.appendChild(textElement);
                    eventItem.appendChild(checklistIndicator);
                } else {
                    eventItem.appendChild(timeElement);
                    eventItem.appendChild(textElement);
                }
                
                // Add click handler to edit this event
                eventItem.addEventListener('click', () => {
                    handleEditEvent(event);
                });
                
                eventsListElement.appendChild(eventItem);
            });
        }
    }
    
    // Render checklist for new event
    function renderChecklistForNewEvent(checklist = []) {
        newEventChecklistElement.innerHTML = '';
        
        checklist.forEach((item, index) => {
            const li = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.done;
            checkbox.id = `new-item-${index}`;
            
            const label = document.createElement('label');
            label.htmlFor = `new-item-${index}`;
            label.textContent = item.task;
            if (item.done) {
                label.classList.add('completed');
            }
            
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.textContent = '×';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling up
                li.remove();
            });
            
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });
            
            li.appendChild(checkbox);
            li.appendChild(label);
            
            // Add deadline display if there is a deadline - now positioned after label but before delete button
            if (item.deadline) {
                const deadlineElement = createDeadlineElement(item.deadline);
                if (deadlineElement) {
                    li.appendChild(deadlineElement);
                }
                
                // Store deadline in data attribute for later retrieval
                li.dataset.deadline = item.deadline;
            }
            
            li.appendChild(deleteButton);
            newEventChecklistElement.appendChild(li);
        });
    }
    
    // Render checklist for edit section
    function renderChecklistForEditEvent(checklist = []) {
        editEventChecklistElement.innerHTML = '';
        
        checklist.forEach((item, index) => {
            const li = document.createElement('li');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.done;
            checkbox.id = `edit-item-${index}`;

            const label = document.createElement('label');
            label.htmlFor = `edit-item-${index}`;
            label.textContent = item.task;
            if (item.done) {
                label.classList.add('completed');
            }

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.textContent = '×';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling up
                li.remove();
            });
            
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });

            li.appendChild(checkbox);
            li.appendChild(label);
            
            // Add deadline display if there is a deadline - now positioned after label but before delete button
            if (item.deadline) {
                const deadlineElement = createDeadlineElement(item.deadline);
                if (deadlineElement) {
                    li.appendChild(deadlineElement);
                }
                
                // Store deadline in data attribute for later retrieval
                li.dataset.deadline = item.deadline;
            }
            
            li.appendChild(deleteButton);
            editEventChecklistElement.appendChild(li);
        });
    }
    
    // Function to gather checklist data from UI
    function getChecklistFromUI(checklistElement) {
        const checklist = [];
        const items = checklistElement.querySelectorAll('li');
        
        console.log(`Getting checklist from UI, found ${items.length} items`);
        
        items.forEach((li, index) => {
            const checkbox = li.querySelector('input[type="checkbox"]');
            const label = li.querySelector('label');
            
            if (checkbox && label) {
                const item = {
                    task: label.textContent,
                    done: checkbox.checked,
                    deadline: li.dataset.deadline || null
                };
                console.log(`Checklist item ${index}: "${item.task}", done: ${item.done}, deadline: ${item.deadline}`);
                checklist.push(item);
            } else {
                console.log(`Checklist item ${index}: missing checkbox or label elements`);
            }
        });
        
        console.log('Final checklist items:', checklist);
        return checklist;
    }
    
    // Function to add checklist item to new event form
    function addNewEventChecklistItem() {
        const taskText = newChecklistItemElement.value.trim();
        if (taskText) {
            const deadline = document.getElementById('new-checklist-deadline').value;
            const item = { 
                task: taskText, 
                done: false,
                deadline: deadline || null
            };
            
            const li = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `new-item-${Date.now()}`; // Use timestamp for unique ID
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = item.task;
            
            // Create delete button
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.textContent = '×';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                li.remove();
            });
            
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });
            
            li.appendChild(checkbox);
            li.appendChild(label);
            
            // Add deadline display if there is a deadline - now positioned after label but before delete button
            if (deadline) {
                const deadlineElement = createDeadlineElement(deadline);
                if (deadlineElement) {
                    li.appendChild(deadlineElement);
                }
                
                // Add data attribute for the deadline to the list item
                li.dataset.deadline = deadline;
            }
            
            li.appendChild(deleteButton);
            newEventChecklistElement.appendChild(li);
            
            // Reset inputs
            newChecklistItemElement.value = '';
            document.getElementById('new-checklist-deadline').value = '';
        }
    }
    
    // Function to add checklist item to edit event form
    function addEditEventChecklistItem() {
        const taskText = editChecklistItemElement.value.trim();
        if (taskText) {
            const deadline = document.getElementById('edit-checklist-deadline').value;
            const item = { 
                task: taskText, 
                done: false,
                deadline: deadline || null
            };
            
            const li = document.createElement('li');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `edit-item-${Date.now()}`; // Use timestamp for unique ID

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = item.task;

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.textContent = '×';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                 li.remove();
            });
            
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });

            li.appendChild(checkbox);
            li.appendChild(label);
            
            // Add deadline display if there is a deadline - now positioned after label but before delete button
            if (deadline) {
                const deadlineElement = createDeadlineElement(deadline);
                if (deadlineElement) {
                    li.appendChild(deadlineElement);
                }
                
                // Add data attribute for the deadline to the list item
                li.dataset.deadline = deadline;
            }
            
            li.appendChild(deleteButton);
            editEventChecklistElement.appendChild(li);
            
            // Reset inputs
            editChecklistItemElement.value = '';
            document.getElementById('edit-checklist-deadline').value = '';
        }
    }
    
    // Add a new event - completely rewritten for reliability
    function addEvent() {
        if (!selectedDateString) {
            console.error('Cannot add event: No date selected');
            return;
        }
        
        const eventText = newEventTextElement.value.trim();
        const eventTime = newEventTimeElement.value;
        const checklist = getChecklistFromUI(newEventChecklistElement);
        
        console.log('[EVENT ADD] Starting to add new event for date:', selectedDateString);
        
        // Only save if there's content
        if (eventText || checklist.length > 0) {
            // Create new event object with guaranteed unique ID
            const uniqueId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const newEvent = {
                id: uniqueId,
                text: eventText,
                time: eventTime,
                checklist: checklist
            };
            
            console.log('[EVENT ADD] Created new event object:', newEvent);
            
            // Make sure we have direct access to global notes storage
            const globalNotes = window.calendarNotes;
            
            // IMPORTANT: Initialize array if needed with a fresh empty array
            if (!globalNotes[selectedDateString]) {
                globalNotes[selectedDateString] = [];
                console.log('[EVENT ADD] Initialized empty array for date:', selectedDateString);
            }
            
            // Add new event to the global notes array
            globalNotes[selectedDateString].push(newEvent);
            
            // Make sure our local reference is updated
            notes = globalNotes;
            
            console.log('[EVENT ADD] Updated notes array, now has', 
                globalNotes[selectedDateString].length, 'events for date', selectedDateString);
            
            // Save to Firebase if signed in, otherwise just update UI
            if (firebase.auth().currentUser) {
                saveNotesToFirebase()
                    .then(() => {
                        // Clear form fields BEFORE updating UI
                        newEventTimeElement.value = '';
                        newEventTextElement.value = '';
                        newEventChecklistElement.innerHTML = '';
                        newChecklistItemElement.value = '';
                        
                        // Update UI after firebase save completes
                        updateUIAfterEventChange();
                        console.log('[EVENT ADD] Event saved to Firebase');
                    })
                    .catch(error => {
                        console.error('[EVENT ADD] Error saving to Firebase:', error);
                        alert('There was an error saving your event. Please try again.');
                    });
            } else {
                // TEST MODE: No Firebase, just update UI
                // Clear form fields BEFORE updating UI
                newEventTimeElement.value = '';
                newEventTextElement.value = '';
                newEventChecklistElement.innerHTML = '';
                newChecklistItemElement.value = '';
                
                // Update UI with the new event
                updateUIAfterEventChange();
                console.log('Test mode: Event saved to memory only');
            }
            
            console.log('---------- EVENT ADDED ----------');
            console.log('Total events for all dates:', Object.values(notes).reduce((count, events) => count + events.length, 0));
        } else {
            console.warn('Event not added: No content provided');
        }
    }
    
    // Show edit event section for selected event
    function handleEditEvent(event) {
        currentEditingEventId = event.id;
        
        // Fill the edit form with event data
        editEventTimeElement.value = event.time || '';
        editEventTextElement.value = event.text || '';
        renderChecklistForEditEvent(event.checklist || []);
        
        // Show edit section, hide add section and events list
        editEventSection.style.display = 'block';
        document.getElementById('add-event-section').style.display = 'none';
        document.getElementById('events-list-container').style.display = 'none';
        
        // Update modal title to show we're in edit mode
        modalDateElement.textContent = modalDateElement.textContent + ' - Edit Event';
    }
    
    // Hide the edit event section
    function hideEditEventSection() {
        editEventSection.style.display = 'none';
        
        // Check if there are events for the date
        const eventsForDay = window.calendarNotes[selectedDateString] || [];
        
        if (eventsForDay.length === 0) {
            // No events - keep events list hidden and show add event form
            document.getElementById('events-list-container').style.display = 'none';
            document.getElementById('add-event-section').style.display = 'block';
            document.getElementById('add-event-section').querySelector('h4').textContent = 'Create New Event';
        } else {
            // Events exist - show the events list and hide add event form
            document.getElementById('events-list-container').style.display = 'block';
            document.getElementById('add-event-section').style.display = 'none';
            
            // Make sure the "Add Event" button exists
            if (!document.getElementById('show-add-event-button')) {
                const addEventButtonContainer = document.createElement('div');
                addEventButtonContainer.className = 'add-event-button-container';
                
                const showAddEventButton = document.createElement('button');
                showAddEventButton.id = 'show-add-event-button';
                showAddEventButton.className = 'action-button';
                showAddEventButton.textContent = 'Add New Event';
                showAddEventButton.addEventListener('click', () => {
                    // Show the add event section when button is clicked
                    document.getElementById('add-event-section').style.display = 'block';
                    document.getElementById('add-event-section').querySelector('h4').textContent = 'Add Another Event';
                    
                    // Scroll to the add event section
                    document.getElementById('add-event-section').scrollIntoView({ behavior: 'smooth' });
                });
                
                addEventButtonContainer.appendChild(showAddEventButton);
                document.getElementById('events-list-container').appendChild(addEventButtonContainer);
            }
        }
        
        // Update modal instructions
        updateModalInstructions();
        
        // Reset modal title
        const dateText = modalDateElement.textContent;
        if (dateText.includes(' - Edit Event')) {
            modalDateElement.textContent = dateText.replace(' - Edit Event', '');
        }
        
        currentEditingEventId = null;
        editEventTimeElement.value = '';
        editEventTextElement.value = '';
        editEventChecklistElement.innerHTML = '';
    }
    
    // Save edited event
    function saveEditedEvent() {
        if (!selectedDateString || !currentEditingEventId) {
            return;
        }
        
        const eventText = editEventTextElement.value.trim();
        const eventTime = editEventTimeElement.value;
        const checklist = getChecklistFromUI(editEventChecklistElement);
        
        console.log('[EDIT EVENT] Saving event ID:', currentEditingEventId);
        
        // Always use the global notes object
        const globalNotes = window.calendarNotes;
        
        // Find the event in the array
        const eventsForDay = globalNotes[selectedDateString] || [];
        const eventIndex = eventsForDay.findIndex(e => e.id === currentEditingEventId);
        
        if (eventIndex !== -1) {
            // Update event data
            eventsForDay[eventIndex] = {
                id: currentEditingEventId,
                text: eventText,
                time: eventTime,
                checklist: checklist
            };
            
            // Update global notes
            globalNotes[selectedDateString] = eventsForDay;
            // Update local reference
            notes = globalNotes;
            
            console.log('[EDIT EVENT] Updated event at index', eventIndex);
            
            // Save to Firebase if signed in, otherwise just update UI
            if (firebase.auth().currentUser) {
                saveNotesToFirebase().then(() => {
                    updateUIAfterEventChange();
                    console.log('[EDIT EVENT] Saved changes to Firebase');
                });
            } else {
                // TEST MODE: Just update UI without Firebase
                updateUIAfterEventChange();
                console.log('[EDIT EVENT] Saved changes to memory only (test mode)');
            }
        } else {
            console.error('[EDIT EVENT] Event not found with ID:', currentEditingEventId);
        }
    }
    
    // Delete an event
    function handleDeleteEvent() {
        if (!selectedDateString || !currentEditingEventId) {
            return;
        }
        
        console.log('[DELETE EVENT] Deleting event ID:', currentEditingEventId);
        
        // Always use the global notes object
        const globalNotes = window.calendarNotes;
        
        // Find the event in the array
        const eventsForDay = globalNotes[selectedDateString] || [];
        const eventIndex = eventsForDay.findIndex(e => e.id === currentEditingEventId);
        
        if (eventIndex !== -1) {
            // Remove the event from the array
            eventsForDay.splice(eventIndex, 1);
            
            // If no events left, delete the date entry
            if (eventsForDay.length === 0) {
                delete globalNotes[selectedDateString];
            } else {
                globalNotes[selectedDateString] = eventsForDay;
            }
            
            // Update local reference
            notes = globalNotes;
            
            console.log('[DELETE EVENT] Event removed, remaining events:', 
                globalNotes[selectedDateString] ? globalNotes[selectedDateString].length : 0);
            
            // Save to Firebase if signed in, otherwise just update UI
            if (firebase.auth().currentUser) {
                saveNotesToFirebase().then(() => {
                    updateUIAfterEventChange();
                    console.log('[DELETE EVENT] Change saved to Firebase');
                });
            } else {
                // TEST MODE: Just update UI without Firebase
                updateUIAfterEventChange();
                console.log('[DELETE EVENT] Change saved to memory only (test mode)');
            }
        } else {
            console.error('[DELETE EVENT] Event not found with ID:', currentEditingEventId);
        }
    }
    
    // Helper function to update UI after event changes
    function updateUIAfterEventChange() {
        // Always use the global notes object
        const globalNotes = window.calendarNotes;

        console.log('[UI UPDATE] Starting UI refresh');
        
        // Hide edit section
        hideEditEventSection();
        
        // Check if there are events for the date
        const eventsForDay = globalNotes[selectedDateString] || [];
        
        // Determine whether to show events list
        if (eventsForDay.length === 0) {
            // No events - hide the events list container
            document.getElementById('events-list-container').style.display = 'none';
            document.getElementById('add-event-section').style.display = 'block';
            document.getElementById('add-event-section').querySelector('h4').textContent = 'Create New Event';
        } else {
            // Events exist - ensure the events list is visible but hide add event section
            document.getElementById('events-list-container').style.display = 'block';
            document.getElementById('add-event-section').style.display = 'none';
            
            // Make sure the "Add Event" button exists
            if (!document.getElementById('show-add-event-button')) {
                const addEventButtonContainer = document.createElement('div');
                addEventButtonContainer.className = 'add-event-button-container';
                
                const showAddEventButton = document.createElement('button');
                showAddEventButton.id = 'show-add-event-button';
                showAddEventButton.className = 'action-button';
                showAddEventButton.textContent = 'Add New Event';
                showAddEventButton.addEventListener('click', () => {
                    // Show the add event section when button is clicked
                    document.getElementById('add-event-section').style.display = 'block';
                    document.getElementById('add-event-section').querySelector('h4').textContent = 'Add Another Event';
                    
                    // Scroll to the add event section
                    document.getElementById('add-event-section').scrollIntoView({ behavior: 'smooth' });
                });
                
                addEventButtonContainer.appendChild(showAddEventButton);
                document.getElementById('events-list-container').appendChild(addEventButtonContainer);
            }
        
        // Refresh the events list
        displayEventsInModal();
        }
        
        // Update modal instructions
        updateModalInstructions();
        
        // Update calendar view
        renderCalendarView();
        
        // Log the current state
        console.log('[UI UPDATE] Completed. Events for date', selectedDateString + ':',
            globalNotes[selectedDateString] ? globalNotes[selectedDateString].length : 0);
    }
    
    // Save notes to Firebase
    function saveNotesToFirebase() {
        return new Promise((resolve, reject) => {
            const user = firebase.auth().currentUser;
            if (!user) {
                reject(new Error('User not logged in'));
                return;
            }
            
            // Always use the global notes object for saving
            const globalNotes = window.calendarNotes;
            
            db.collection('userNotes').doc(user.uid).set({ 
                notes: globalNotes,
                mainGoals: mainGoals
            })
                .then(() => {
                    console.log('[FIREBASE] Notes and goals saved successfully');
                    resolve();
                })
                .catch(error => {
                    console.error("[FIREBASE] Error saving notes:", error);
                    alert("Error saving to cloud: " + error.message);
                    reject(error);
                });
        });
    }

    // --- Event Listeners ---
    prevButton.addEventListener('click', () => {
        currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
        
        if (currentView === 'week' && window.innerWidth <= 768) {
                mobileWeekStartDate.setDate(mobileWeekStartDate.getDate() - 7);
        }
        renderCalendarView();
    });

    nextButton.addEventListener('click', () => {
        currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
        
        if (currentView === 'week' && window.innerWidth <= 768) {
                mobileWeekStartDate.setDate(mobileWeekStartDate.getDate() + 7);
        }
        renderCalendarView();
    });

    // Toggle view only affects mobile
    toggleViewButton.addEventListener('click', () => {
        currentView = (currentView === 'week') ? 'month' : 'week';
        if (currentView === 'month') {
             // When switching to month view, set month based on current week view start date
            currentMonthDate = new Date(mobileWeekStartDate);
            currentMonthDate.setDate(1);
        } else {
            // When switching back to week view, reset to today
             mobileWeekStartDate = new Date(); 
             mobileWeekStartDate.setHours(0, 0, 0, 0);
        }
        renderCalendarView(); // Re-render mobile view
    });

    // Add event listener for Today button
    document.getElementById('today-button').addEventListener('click', () => {
        console.log('[CALENDAR] Today button clicked');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Reset calendar view to current month
        currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
        currentMonthDate.setHours(0, 0, 0, 0);
        
        // Set mobile week view to start on the Sunday before the current date
        const dayOfWeek = today.getDay();
        mobileWeekStartDate = new Date(today);
        mobileWeekStartDate.setDate(today.getDate() - dayOfWeek);
        mobileWeekStartDate.setHours(0, 0, 0, 0);
        
        // Force refresh with today highlighted
        window.forceCalendarReset = true;
        renderCalendarView();
        
        console.log('[CALENDAR] Calendar reset to today');
    });

    // Handle month selection from dropdown
    if (document.getElementById('month-select')) {
        const monthSelectElement = document.getElementById('month-select');
        monthSelectElement.addEventListener('change', () => {
            const selectedMonth = parseInt(monthSelectElement.value);
            const yearDisplay = document.getElementById('year-display');
            const year = yearDisplay ? parseInt(yearDisplay.textContent) : currentMonthDate.getFullYear();
            
            // Update month view
            currentMonthDate = new Date(year, selectedMonth, 1);
            currentMonthDate.setHours(0, 0, 0, 0);
            renderCalendarView();
        });
    }

    // Update month/year display
    function updateMonthSelect() {
        // This function now only needs to update the month-year-1 display
        // since we removed the month selector dropdown
        const monthYearElement = document.getElementById('month-year-1');
        if (monthYearElement) {
            const options = { year: 'numeric', month: 'long' };
            monthYearElement.textContent = currentMonthDate.toLocaleDateString('en-US', options);
        }
    }

    // --- Event Progress Panel for Multiple Events ---
    function renderEventProgressPanel() {
        // Always use the global notes object
        const globalNotes = window.calendarNotes;
        
        console.log('[PROGRESS PANEL] Starting to render progress panel');
        
        // Clear existing panel content
        progressItemsContainer.innerHTML = '';
        
        // Get all dates with events
        const datesWithEvents = Object.entries(globalNotes);
        console.log('[PROGRESS PANEL] Found', datesWithEvents.length, 'dates with events');
        
        // Empty check for test mode
        if (datesWithEvents.length === 0) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.classList.add('no-events-message-panel');
            noEventsMessage.innerHTML = `
                <p>No tasks to track yet!</p>
                <p class="subtext">Add checklists to events to see your progress here.</p>
            `;
            progressItemsContainer.appendChild(noEventsMessage);
            return;
        }
        
        // Filter to include only events with checklists and sort by date
        let eventsWithChecklists = [];
        
        datesWithEvents.forEach(([dateString, eventsArray]) => {
            console.log(`Processing date ${dateString} with ${eventsArray.length} events`);
            
            // For each date, filter to events with checklists
            const dateEvents = eventsArray.filter(event => {
                const hasChecklist = event.checklist && event.checklist.length > 0;
                console.log(`Event ${event.id}: has checklist = ${hasChecklist}, items: ${event.checklist ? event.checklist.length : 0}`);
                return hasChecklist;
            });
            
            console.log(`Found ${dateEvents.length} events with checklists for ${dateString}`);
            
            // Add date and event details to our array
            dateEvents.forEach(event => {
                eventsWithChecklists.push({
                    dateString,
                    event
                });
            });
        });
        
        console.log('Total events with checklists:', eventsWithChecklists.length);
        
        // Sort by date
        eventsWithChecklists.sort((a, b) => new Date(a.dateString) - new Date(b.dateString));
        
        // If no events with checklists, show message
        if (eventsWithChecklists.length === 0) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.classList.add('no-events-message-panel');
            noEventsMessage.innerHTML = `
                <p>No tasks to track yet!</p>
                <p class="subtext">Add checklists to your events by clicking on a calendar date.</p>
            `;
            progressItemsContainer.appendChild(noEventsMessage);
            return;
        }
        
        // Group events by date for the panel
        const groupedByDate = {};
        
        eventsWithChecklists.forEach(item => {
            if (!groupedByDate[item.dateString]) {
                groupedByDate[item.dateString] = [];
            }
            groupedByDate[item.dateString].push(item.event);
        });
        
        // Create and append elements for each date
        Object.entries(groupedByDate).forEach(([dateString, events]) => {
            // Create the card container
            const itemContainer = document.createElement('div');
            itemContainer.classList.add('progress-item');

            // Create header section with date
            const headerSection = document.createElement('div');
            headerSection.classList.add('progress-item-header');
            
            // Add Date
            const itemDate = document.createElement('span');
            itemDate.classList.add('item-date');
            const [year, month, day] = dateString.split('-');
            const dateObj = new Date(year, month-1, day);
            
            // Format date with day of week and relative time indicator
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const relativeTimeStr = formatTimeDifference(dateObj, today);
            
            itemDate.textContent = `${dateObj.toLocaleDateString('en-US', { 
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
            })} ${relativeTimeStr}`;
            
            headerSection.appendChild(itemDate);

            // Add Date Text
            const itemText = document.createElement('div');
            itemText.classList.add('item-text');
            itemText.textContent = `${events.length} event${events.length > 1 ? 's' : ''}`;
            headerSection.appendChild(itemText);
            
            itemContainer.appendChild(headerSection);

            // Add Events Container
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            
            // Add each event
            events.forEach((event, index) => {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'panel-event';
                
                // Create event header with time, text and edit button
                const eventHeader = document.createElement('div');
                eventHeader.classList.add('panel-event-header');
                
                // Add event time and text
                const eventDetails = document.createElement('div');
                eventDetails.classList.add('panel-event-details');
                
                if (event.time) {
                    const timeElement = document.createElement('span');
                    timeElement.classList.add('panel-event-time');
                    timeElement.textContent = event.time;
                    eventDetails.appendChild(timeElement);
                }
                
                const textElement = document.createElement('span');
                textElement.classList.add('panel-event-text');
                textElement.textContent = event.text || '(No description)';
                eventDetails.appendChild(textElement);
                
                eventHeader.appendChild(eventDetails);
                
                // Create edit button
                const editButton = document.createElement('button');
                editButton.className = 'panel-event-edit';
                editButton.innerHTML = '<span class="edit-icon">✎</span> Edit';
                editButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openNoteModal(dateString);
                    // Find and click the event in the modal to edit it
                    setTimeout(() => {
                        const eventItems = eventsListElement.querySelectorAll('.event-item');
                        eventItems.forEach(item => {
                            if (item.dataset.eventId == event.id) {
                                item.click();
                            }
                        });
                    }, 100);
                });
                
                eventHeader.appendChild(editButton);
                eventDiv.appendChild(eventHeader);
                
                // Add checklist progress for this event
                if (event.checklist && event.checklist.length > 0) {
                    const totalItems = event.checklist.length;
                    const completedItems = event.checklist.filter(item => item.done).length;
                    const percent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

            const progressContainer = document.createElement('div');
            progressContainer.classList.add('progress-container');
            
            const progressBarContainer = document.createElement('div');
            progressBarContainer.classList.add('progress-bar-container');
            
            const progressBar = document.createElement('div');
            progressBar.classList.add('progress-bar');
                    progressBar.style.width = `${percent}%`;
            
            progressBarContainer.appendChild(progressBar);
            progressContainer.appendChild(progressBarContainer);

            const progressSummary = document.createElement('div');
            progressSummary.classList.add('progress-summary');
                    progressSummary.textContent = `${completedItems}/${totalItems} Tasks`;
                    
                    // Add toggle button
                    const toggleButton = document.createElement('button');
                    toggleButton.classList.add('toggle-checklist-button');
                    toggleButton.textContent = 'Hide Tasks';
                    toggleButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent event bubble to parent
                        const checklistContainer = e.target.nextElementSibling;
                        if (checklistContainer.style.display === 'none' || !checklistContainer.style.display) {
                            checklistContainer.style.display = 'block';
                            e.target.textContent = 'Hide Tasks';
            } else {
                            checklistContainer.style.display = 'none';
                            e.target.textContent = 'Show Tasks';
                        }
                    });
                    
                    // Create checklist container (initially visible)
            const checklistContainer = document.createElement('div');
                    checklistContainer.classList.add('panel-checklist-container');
                    checklistContainer.style.display = 'block';
            
                    // Add checklist items
                    const checklistUl = document.createElement('ul');
                    checklistUl.classList.add('panel-checklist');

                    // Add clickable checklist items
                    event.checklist.forEach((item, index) => {
                const li = document.createElement('li');

                // Create checkbox with proper event handler
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `panel-cb-${event.id}-${index}`;
                checkbox.checked = item.done;
                
                // Create label once
                const label = document.createElement('label');
                label.classList.add('panel-checklist-label');
                label.htmlFor = checkbox.id;
                label.textContent = item.task;
                
                if (item.done) {
                    label.classList.add('completed');
                }
                
                // Prevent event propagation to parent
                checkbox.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent opening edit modal
                });
                
                label.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent opening edit modal
                });
                
                // Add elements to the list item
                li.appendChild(checkbox);
                li.appendChild(label);
                
                // Add deadline display if there is a deadline - now positioned after label
                if (item.deadline) {
                    const deadlineElement = createDeadlineElement(item.deadline);
                    if (deadlineElement) {
                        deadlineElement.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent opening edit modal
                });
                        li.appendChild(deadlineElement);
                    }
                }
                
                // Add event listener for checkbox changes
                checkbox.addEventListener('change', (e) => {
                    // Always use the global notes object
                    const globalNotes = window.calendarNotes;
                    
                    // Update the checked state in the UI
                    label.classList.toggle('completed', checkbox.checked);
                    
                    // Find and update the item in the data structure
                    const updatedEvents = globalNotes[dateString] || [];
                    const eventIndex = updatedEvents.findIndex(e => e.id === event.id);
                    
                    if (eventIndex !== -1) {
                        const checklistItems = updatedEvents[eventIndex].checklist || [];
                        const itemIndex = checklistItems.findIndex(i => i.task === item.task);
                        
                        if (itemIndex !== -1) {
                            // Update the done state
                            checklistItems[itemIndex].done = checkbox.checked;
                            
                            // Update in the data structure
                            updatedEvents[eventIndex].checklist = checklistItems;
                            globalNotes[dateString] = updatedEvents;
                            // Update local reference
                            notes = globalNotes;
                            
                            // Update progress bar
                            const totalItems = checklistItems.length;
                            const completedItems = checklistItems.filter(i => i.done).length;
                            const percent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
                            progressBar.style.width = `${percent}%`;
                            progressSummary.textContent = `${completedItems}/${totalItems} Tasks`;
                            
                            // Save to Firebase if signed in
                            if (firebase.auth().currentUser) {
                                saveNotesToFirebase();
                                console.log('[CHECKBOX] Saved change to Firebase');
                            } else {
                                console.log('[CHECKBOX] Test mode: Checklist update saved to memory only');
                            }
                        }
                    }
                });
                        
                        // Append the list item to the checklist
                        checklistUl.appendChild(li);
                    });
                    
                    checklistContainer.appendChild(checklistUl);
                    progressContainer.appendChild(progressSummary);
                    
                    eventDiv.appendChild(progressContainer);
                    eventDiv.appendChild(toggleButton);
                    eventDiv.appendChild(checklistContainer);
                }
                
                eventsContainer.appendChild(eventDiv);
            });
            
            itemContainer.appendChild(eventsContainer);
            progressItemsContainer.appendChild(itemContainer);
        });
    }

    // --- Modal Functions ---
    function openNoteModal(dateString) {
        // TEST MODE: Allow adding notes without signing in
        // if (!firebase.auth().currentUser) {
        //     alert("Please sign in to add or view notes");
        //     return;
        // }
        
        console.log('------ OPENING NOTE MODAL ------');
        console.log('Opening modal for date:', dateString);
        
        selectedDateString = dateString;
        const [year, month, day] = dateString.split('-');
        const dateObj = new Date(year, month - 1, day);
    // Refresh deadline displays in progress panel
    const checklistItems = document.querySelectorAll('.panel-checklist li');
    checklistItems.forEach(item => {
        const deadlineElement = item.querySelector('.days-left');
        if (deadlineElement && item.dataset.deadline) {
            const newDeadlineElement = createDeadlineElement(item.dataset.deadline);
            if (newDeadlineElement) {
                item.replaceChild(newDeadlineElement, deadlineElement);
            }
        }
    });
    
    console.log('[DEADLINES] Deadline displays refreshed');
} 

    // --- Fix Button Event Listeners ---

    // Make sure Edit Goals button works
    if (editGoalsButton) {
        editGoalsButton.addEventListener('click', openGoalsModal);
        console.log('[INIT] Added event listener to Edit Goals button');
    }

    if (goalsCloseButton) {
        goalsCloseButton.addEventListener('click', closeGoalsModal);
        console.log('[INIT] Added event listener to Goals Close button');
    }

    if (saveGoalsButton) {
        saveGoalsButton.addEventListener('click', saveMainGoals);
        console.log('[INIT] Added event listener to Save Goals button');
    }

    // Fix news tab functionality
    initializeNewsTabs();
    fetchNews();

    // Add checklist event listeners
    addItemButton.addEventListener('click', addNewEventChecklistItem);
    editAddItemButton.addEventListener('click', addEditEventChecklistItem);

    // Add event buttons
    addEventButton.addEventListener('click', addEvent);
    saveEditedEventButton.addEventListener('click', saveEditedEvent);
    cancelEditButton.addEventListener('click', hideEditEventSection);
    deleteEventButton.addEventListener('click', handleDeleteEvent);

    // Modal close button
    noteCloseButton.addEventListener('click', closeNoteModal);

    // Fix task filtering
    if (taskSearchInput) {
        taskSearchInput.addEventListener('input', filterTasks);
    }

    // Goal tabs
    if (selectTasksTab) {
        selectTasksTab.addEventListener('click', () => {
            selectTasksTab.classList.add('active');
            customGoalsTab.classList.remove('active');
            selectTasksContainer.style.display = 'block';
            customGoalsContainer.style.display = 'none';
        });
    }

    if (customGoalsTab) {
        customGoalsTab.addEventListener('click', () => {
            customGoalsTab.classList.add('active');
            selectTasksTab.classList.remove('active');
            customGoalsContainer.style.display = 'block';
            selectTasksContainer.style.display = 'none';
        });
    }

    // Render initial view
    renderCalendarView();
    renderMainGoals();
    renderEventProgressPanel();

    // --- Weather Widget Functionality ---
    function initializeWeatherWidget() {
        const requestLocationButton = document.getElementById('request-location-button');
        const weatherLocation = document.getElementById('weather-location');
        const weatherTemp = document.getElementById('weather-temp');
        const weatherCondition = document.getElementById('weather-condition');
        const weatherHumidity = document.getElementById('weather-humidity');
        const weatherWind = document.getElementById('weather-wind');
        const weatherIcon = document.getElementById('weather-icon-img');
        const weatherDate = document.getElementById('weather-date');
        
        // Set current date in weather widget
        const today = new Date();
        weatherDate.textContent = today.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Function to get weather data
        function fetchWeatherData(latitude, longitude) {
            // Use OpenWeatherMap API for weather data
            const apiKey = 'bd5e378503939ddaee76f12ad7a97608'; // Free API key, usage limits apply
            const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=imperial&appid=${apiKey}`;
            
            fetch(apiUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Weather API error: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('[WEATHER] API response:', data);
                    
                    // Update weather widget with data
                    weatherLocation.textContent = data.name;
                    weatherTemp.textContent = Math.round(data.main.temp);
                    weatherCondition.textContent = data.weather[0].main;
                    weatherHumidity.textContent = data.main.humidity;
                    weatherWind.textContent = Math.round(data.wind.speed);
                    
                    // Set weather icon
                    const iconCode = data.weather[0].icon;
                    weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
                    
                    // Hide the request button once we have weather data
                    requestLocationButton.style.display = 'none';
                })
                .catch(error => {
                    console.error('[WEATHER] Error fetching weather:', error);
                    weatherCondition.textContent = 'Weather data unavailable';
                    weatherLocation.textContent = 'Error loading weather data';
                    
                    // Keep the button visible on error
                    requestLocationButton.style.display = 'block';
                });
        }
        
        // Function to request location and get weather
        function requestLocationAndWeather() {
            if (navigator.geolocation) {
                weatherCondition.textContent = 'Requesting location...';
                
                navigator.geolocation.getCurrentPosition(
                    // Success callback
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        console.log(`[WEATHER] Location obtained: ${latitude}, ${longitude}`);
                        fetchWeatherData(latitude, longitude);
                    },
                    // Error callback
                    (error) => {
                        console.error('[WEATHER] Geolocation error:', error);
                        
                        let errorMessage = 'Location access denied';
                        if (error.code === error.PERMISSION_DENIED) {
                            errorMessage = 'Location permission denied. Please enable in settings.';
                        } else if (error.code === error.POSITION_UNAVAILABLE) {
                            errorMessage = 'Location information unavailable.';
                        } else if (error.code === error.TIMEOUT) {
                            errorMessage = 'Location request timed out.';
                        }
                        
                        weatherCondition.textContent = 'Cannot access location';
                        weatherLocation.textContent = errorMessage;
                        
                        // Keep button visible
                        requestLocationButton.style.display = 'block';
                    },
                    // Options
                    { 
                        maximumAge: 600000, // Cache location for 10 minutes
                        timeout: 10000,     // 10 second timeout
                        enableHighAccuracy: false // No need for high accuracy
                    }
                );
            } else {
                // Browser doesn't support geolocation
                weatherCondition.textContent = 'Geolocation not supported';
                weatherLocation.textContent = 'Please use a different browser';
            }
        }
        
        // Add click handler to request button
        if (requestLocationButton) {
            requestLocationButton.addEventListener('click', requestLocationAndWeather);
        }
        
        // Try to get weather automatically on page load (will only work if user previously granted permission)
        requestLocationAndWeather();
    }

    // Add this to the event listeners section
    // ... existing code ...
        // Fix news tab functionality
        initializeNewsTabs();
        fetchNews();
        
        // Initialize weather widget
        initializeWeatherWidget();
        
        // Add checklist event listeners
    // ... existing code ...
});