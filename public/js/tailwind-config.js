// Tailwind CSS configuration
// Custom fonts and theme settings
if (typeof window !== 'undefined' && window.tailwind) {
    window.tailwind.config = {
        darkMode: 'class',
        theme: {
            extend: {
                fontFamily: {
                    'display': ['Space Grotesk', 'sans-serif'],
                    'body': ['Inter', 'sans-serif'],
                }
            }
        }
    };
}