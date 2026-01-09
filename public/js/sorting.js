// Table sorting functionality
// Handles column sorting with chevron indicators and localStorage persistence
(function () {
    const tableBody = document.getElementById('table-body');
    if (!tableBody)
        return;
    // Get saved sort from localStorage
    let sortState = { column: null, direction: null };
    try {
        const saved = localStorage.getItem('tableSort');
        if (saved)
            sortState = JSON.parse(saved);
    }
    catch (e) {
        // If parse fails, just use defaults
    }
    // Update which chevron is highlighted
    function updateChevrons(column, direction) {
        const rateIcon = document.getElementById('sort-icon-rate');
        const valueIcon = document.getElementById('sort-icon-value');
        // Clear both icons first
        if (rateIcon) {
            const up = rateIcon.querySelector('.sort-up');
            const down = rateIcon.querySelector('.sort-down');
            if (up)
                up.classList.remove('active');
            if (down)
                down.classList.remove('active');
        }
        if (valueIcon) {
            const up = valueIcon.querySelector('.sort-up');
            const down = valueIcon.querySelector('.sort-down');
            if (up)
                up.classList.remove('active');
            if (down)
                down.classList.remove('active');
        }
        // Highlight the active one
        if (column === 'rate' && rateIcon) {
            if (direction === 'asc') {
                const up = rateIcon.querySelector('.sort-up');
                if (up)
                    up.classList.add('active');
            }
            else if (direction === 'desc') {
                const down = rateIcon.querySelector('.sort-down');
                if (down)
                    down.classList.add('active');
            }
        }
        else if (column === 'value' && valueIcon) {
            if (direction === 'asc') {
                const up = valueIcon.querySelector('.sort-up');
                if (up)
                    up.classList.add('active');
            }
            else if (direction === 'desc') {
                const down = valueIcon.querySelector('.sort-down');
                if (down)
                    down.classList.add('active');
            }
        }
    }
    // Actually sort the rows
    function applySort(column, direction) {
        if (!tableBody)
            return;
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        if (rows.length <= 1)
            return;
        if (!column) {
            // No sort - restore original zip code order
            rows.sort((a, b) => {
                const zipA = a.dataset.zip || '';
                const zipB = b.dataset.zip || '';
                return zipA.localeCompare(zipB);
            });
        }
        else {
            // Sort by the column
            rows.sort((a, b) => {
                let valA, valB;
                if (column === 'rate') {
                    valA = parseFloat(a.dataset.rate || '0') || 0;
                    valB = parseFloat(b.dataset.rate || '0') || 0;
                }
                else if (column === 'value') {
                    valA = parseFloat(a.dataset.value || '0') || 0;
                    valB = parseFloat(b.dataset.value || '0') || 0;
                }
                else {
                    return 0;
                }
                return direction === 'desc' ? valB - valA : valA - valB;
            });
        }
        // Put rows back in new order
        rows.forEach(row => tableBody.appendChild(row));
    }
    // Handle column header click
    window.sortTable = function (column) {
        if (!tableBody)
            return;
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        if (rows.length <= 1)
            return;
        // Toggle direction if same column, otherwise switch columns
        if (sortState.column === column) {
            // Same column - flip direction
            sortState.direction = sortState.direction === 'desc' ? 'asc' : 'desc';
        }
        else {
            // New column - start with descending
            sortState.column = column;
            sortState.direction = 'desc';
        }
        // Save to localStorage
        localStorage.setItem('tableSort', JSON.stringify(sortState));
        // Update UI and sort
        updateChevrons(sortState.column, sortState.direction);
        applySort(sortState.column, sortState.direction);
    };
    // Apply saved sort on page load
    if (sortState.column && sortState.direction) {
        updateChevrons(sortState.column, sortState.direction);
        applySort(sortState.column, sortState.direction);
    }
})();
export {};
//# sourceMappingURL=sorting.js.map