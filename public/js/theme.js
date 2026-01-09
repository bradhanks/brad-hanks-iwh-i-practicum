// Theme management - handles light/dark mode switching
// Load theme preference immediately to avoid flash
(function () {
    const app = document.getElementById('app');
    if (app && localStorage.theme === 'light') {
        app.classList.remove('bg-neutral-950', 'text-neutral-50');
        app.classList.add('bg-neutral-50', 'text-neutral-950', 'light');
    }
})();
window.toggleTheme = function () {
    const app = document.getElementById('app');
    const icon = document.getElementById('theme-icon');
    if (!app)
        return;
    const isLight = app.classList.contains('bg-neutral-50');
    if (isLight) {
        // Switch to dark
        app.classList.remove('bg-neutral-50', 'text-neutral-950', 'light');
        app.classList.add('bg-neutral-950', 'text-neutral-50');
        localStorage.theme = 'dark';
        if (icon)
            icon.textContent = '◐';
    }
    else {
        // Switch to light
        app.classList.remove('bg-neutral-950', 'text-neutral-50');
        app.classList.add('bg-neutral-50', 'text-neutral-950', 'light');
        localStorage.theme = 'light';
        if (icon)
            icon.textContent = '◑';
    }
};
// Set initial icon state
(function () {
    const icon = document.getElementById('theme-icon');
    if (icon && localStorage.theme === 'light') {
        icon.textContent = '◑';
    }
})();