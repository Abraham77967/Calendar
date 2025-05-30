// Calendar Module
document.addEventListener('DOMContentLoaded', function() {
    // Get references for calendar controls
    const calendarGrid1 = document.getElementById('calendar-grid-1');
    const monthYearElement1 = document.getElementById('month-year-1');
    const prevButton = document.getElementById('prev-month');
    const nextButton = document.getElementById('next-month');
    const toggleViewButton = document.getElementById('toggle-view-button');
    const todayButton = document.getElementById('today-button');
    
    // Create fresh date objects for the current date
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    // Set up month view (start at first day of current month)
    let currentMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    currentMonthDate.setHours(0, 0, 0, 0);
    console.log('[CALENDAR INIT] Current month date:', currentMonthDate);
    
    // Set up mobile week view (start at current date)
    let mobileWeekStartDate = new Date(currentDate);
    mobileWeekStartDate.setHours(0, 0, 0, 0);
    
    // Track current view (month or week)
    let currentView = 'month';
    
    // --- Rendering Functions ---
    
    // Function to truncate text with ellipsis after a certain length
    function truncateText(text, maxLength = 25) {
        if (text && text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    }
    
    // Renders a single month into the calendar grid
    function renderCalendar(targetDate, gridElement, headerElement) {
        console.log(`[RENDER] Rendering calendar for ${targetDate.toDateString()}`);
        const globalNotes = window.calendarNotes || {};
        
        // Get current date for today highlighting
        const nowDate = new Date();
        nowDate.setHours(0, 0, 0, 0);
        const todayYear = nowDate.getFullYear();
        const todayMonth = nowDate.getMonth();
        const todayDay = nowDate.getDate();
        
        // Clear previous content
        gridElement.innerHTML = '';
        
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        
        // Update header with month and year
        const options = { year: 'numeric', month: 'long' };
        headerElement.textContent = targetDate.toLocaleDateString('en-US', options);
        
        const firstDayOfMonth = new Date(year, month, 1);
        const firstDayIndex = firstDayOfMonth.getDay(); // 0-6 (Sun-Sat)
        
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        
        // Create fragment for better performance
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
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            
            const dayCell = document.createElement('div');
            dayCell.classList.add('day');
            dayCell.dataset.date = dateString;
            
            const dayNumberElement = document.createElement('div');
            dayNumberElement.classList.add('day-number');
            dayNumberElement.textContent = dayNum;
            dayCell.appendChild(dayNumberElement);
            
            // Mark today's date
            if (dayNum === todayDay && month === todayMonth && year === todayYear) {
                dayCell.classList.add('today');
                console.log(`[RENDER] Marked as TODAY: ${dateString}`);
            }
            
            // Display events for this day
            const eventsForDay = globalNotes[dateString] || [];
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('day-events');
            
            if (eventsForDay.length === 1) {
                const eventTextElement = document.createElement('div');
                eventTextElement.classList.add('note-text', 'single-event');
                let displayText = eventsForDay[0].text || '(No description)';
                if (eventsForDay[0].time) displayText = `${eventsForDay[0].time} - ${displayText}`;
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
            
            // Add click handler to open modal
            dayCell.addEventListener('click', () => {
                if (typeof openNoteModal === 'function') {
                    openNoteModal(dateString);
                } else {
                    console.error('openNoteModal function not defined');
                }
            });
            
            fragment.appendChild(dayCell);
        }
        
        // Add the fragment to the grid
        gridElement.appendChild(fragment);
    }
    
    // Renders the mobile week view
    function renderMobileTwoWeekView() {
        console.log(`[RENDER] Starting mobile week view`);
        const globalNotes = window.calendarNotes || {};
        
        const nowDate = new Date();
        nowDate.setHours(0, 0, 0, 0);
        const todayYear = nowDate.getFullYear();
        const todayMonth = nowDate.getMonth();
        const todayDay = nowDate.getDate();
        
        // Clear previous content
        calendarGrid1.innerHTML = '';
        
        const viewStartDate = new Date(mobileWeekStartDate);
        const viewEndDate = new Date(viewStartDate);
        viewEndDate.setDate(viewStartDate.getDate() + 13); // 14 days total
        
        // Update header with date range
        const headerOptions = { month: 'short', day: 'numeric' };
        monthYearElement1.textContent = `${viewStartDate.toLocaleDateString('default', headerOptions)} - ${viewEndDate.toLocaleDateString('default', headerOptions)}, ${viewStartDate.getFullYear()}`;
        
        const fragment = document.createDocumentFragment();
        
        // Add day headers (Sun-Sat)
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayNames.forEach(name => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('day-header');
            dayHeader.textContent = name;
            fragment.appendChild(dayHeader);
        });
        
        // Create and add all 14 day cells
        for (let i = 0; i < 14; i++) {
            const currentDateOfLoop = new Date(viewStartDate);
            currentDateOfLoop.setDate(viewStartDate.getDate() + i);
            
            const year = currentDateOfLoop.getFullYear();
            const month = currentDateOfLoop.getMonth();
            const dayNum = currentDateOfLoop.getDate();
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            
            const dayCell = document.createElement('div');
            dayCell.classList.add('day', 'week-view');
            dayCell.dataset.date = dateString;
            
            const dayNameElement = document.createElement('div');
            dayNameElement.classList.add('day-name');
            dayNameElement.textContent = dayNames[currentDateOfLoop.getDay()];
            dayCell.appendChild(dayNameElement);
            
            const dayNumberElement = document.createElement('div');
            dayNumberElement.classList.add('day-number');
            dayNumberElement.textContent = dayNum;
            dayCell.appendChild(dayNumberElement);
            
            // Mark today's date
            if (dayNum === todayDay && month === todayMonth && year === todayYear) {
                dayCell.classList.add('today');
            }
            
            // Display events for this day
            const eventsForDay = globalNotes[dateString] || [];
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('day-events');
            
            if (eventsForDay.length === 1) {
                const eventTextElement = document.createElement('div');
                eventTextElement.classList.add('note-text', 'single-event');
                let displayText = eventsForDay[0].text || '(No description)';
                if (eventsForDay[0].time) displayText = `${eventsForDay[0].time} - ${displayText}`;
                eventTextElement.textContent = truncateText(displayText, 20); // Shorter for mobile
                eventTextElement.title = displayText; // Show full text on hover
                eventsContainer.appendChild(eventTextElement);
            } else if (eventsForDay.length > 1) {
                const eventCountElement = document.createElement('div');
                eventCountElement.classList.add('note-text', 'event-count');
                eventCountElement.textContent = `${eventsForDay.length} Events`;
                eventsContainer.appendChild(eventCountElement);
            }
            
            dayCell.appendChild(eventsContainer);
            
            // Add click handler to open modal
            dayCell.addEventListener('click', () => {
                if (typeof openNoteModal === 'function') {
                    openNoteModal(dateString);
                } else {
                    console.error('openNoteModal function not defined');
                }
            });
            
            fragment.appendChild(dayCell);
        }
        
        // Add the fragment to the grid
        calendarGrid1.appendChild(fragment);
    }
    
    // Renders month view (single calendar)
    function renderMonthView() {
        renderCalendar(currentMonthDate, calendarGrid1, monthYearElement1);
    }
    
    // Main render function - decides which view to show
    function renderCalendarView() {
        console.log('[CALENDAR] Rendering calendar view');
        
        // Reset to current month/week on first render or when requested
        if (!window.calendarInitialized || window.forceCalendarReset) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Set month view to current month
            currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
            currentMonthDate.setHours(0, 0, 0, 0);
            
            // Set mobile week view to include current date
            const dayOfWeek = today.getDay();
            mobileWeekStartDate = new Date(today);
            mobileWeekStartDate.setDate(today.getDate() - dayOfWeek);
            mobileWeekStartDate.setHours(0, 0, 0, 0);
            
            window.calendarInitialized = true;
            window.forceCalendarReset = false;
        }
        
        const isMobile = window.innerWidth <= 768;
        
        // Show/hide toggle button based on screen size
        toggleViewButton.style.display = isMobile ? 'inline-block' : 'none';
        
        if (isMobile && currentView === 'week') {
            renderMobileTwoWeekView();
            toggleViewButton.textContent = 'Month View';
        } else {
            renderMonthView();
            if (isMobile) toggleViewButton.textContent = 'Week View';
        }
        
        // Render event progress panel if it exists and function is defined
        if (typeof renderEventProgressPanel === 'function') {
            renderEventProgressPanel();
        }
    }
    
    // --- Event Listeners ---
    
    // Previous month/week button
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            if (currentView === 'week' && window.innerWidth <= 768) {
                mobileWeekStartDate.setDate(mobileWeekStartDate.getDate() - 7);
            } else {
                currentMonthDate.setMonth(currentMonthDate.getMonth() - 1);
            }
            renderCalendarView();
        });
    }
    
    // Next month/week button
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            if (currentView === 'week' && window.innerWidth <= 768) {
                mobileWeekStartDate.setDate(mobileWeekStartDate.getDate() + 7);
            } else {
                currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
            }
            renderCalendarView();
        });
    }
    
    // Toggle view button (mobile only)
    if (toggleViewButton) {
        toggleViewButton.addEventListener('click', () => {
            currentView = (currentView === 'week') ? 'month' : 'week';
            renderCalendarView();
        });
    }
    
    // Today button
    if (todayButton) {
        todayButton.addEventListener('click', () => {
            window.forceCalendarReset = true;
            renderCalendarView();
        });
    }
    
    // Initialize view on page load
    renderCalendarView();
    
    // Expose functions to the global scope
    window.renderCalendarView = renderCalendarView;
}); 