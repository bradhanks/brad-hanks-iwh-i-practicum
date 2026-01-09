// Form submission handler with debounce, loading state, and custom validation
// Prevents double-submission and provides user feedback with accessible error messages

(function() {
    // Track if a form is currently being submitted
    let isSubmitting = false;

    /**
     * Custom validation messages for better UX
     */
    const validationMessages = {
        zipCode: {
            valueMissing: 'Please enter a zip code.',
            patternMismatch: 'Zip code must be exactly 5 digits (e.g., 84101).',
            tooShort: 'Zip code must be exactly 5 digits.',
            tooLong: 'Zip code must be exactly 5 digits.'
        },
        homeownershipRate: {
            valueMissing: 'Please enter a homeownership rate.',
            rangeUnderflow: 'Homeownership rate cannot be negative.',
            rangeOverflow: 'Homeownership rate cannot exceed 100%.',
            stepMismatch: 'Please enter a valid percentage (e.g., 65.4).'
        },
        medianHomeValue: {
            valueMissing: 'Please enter a median home value.',
            rangeUnderflow: 'Home value must be at least $1,000.',
            stepMismatch: 'Please enter a whole dollar amount.'
        }
    };

    /**
     * Sets custom validation message on an input field
     * @param {HTMLInputElement} input - The input element
     */
    function setCustomValidationMessage(input) {
        const fieldName = input.name;
        let messages;

        // Map field names to validation messages
        switch(fieldName) {
            case 'name':
                messages = validationMessages.zipCode;
                break;
            case 'homeownership_rate':
                messages = validationMessages.homeownershipRate;
                break;
            case 'median_home_age':
                messages = validationMessages.medianHomeValue;
                break;
            default:
                return;
        }

        // Check validation state and set appropriate message
        if (input.validity.valueMissing) {
            input.setCustomValidity(messages.valueMissing);
        } else if (input.validity.patternMismatch) {
            input.setCustomValidity(messages.patternMismatch);
        } else if (input.validity.tooShort) {
            input.setCustomValidity(messages.tooShort);
        } else if (input.validity.tooLong) {
            input.setCustomValidity(messages.tooLong);
        } else if (input.validity.rangeUnderflow) {
            input.setCustomValidity(messages.rangeUnderflow);
        } else if (input.validity.rangeOverflow) {
            input.setCustomValidity(messages.rangeOverflow);
        } else if (input.validity.stepMismatch) {
            input.setCustomValidity(messages.stepMismatch);
        } else {
            input.setCustomValidity('');
        }
    }

    /**
     * Creates and shows an inline error message
     * @param {HTMLInputElement} input - The input element
     * @param {string} message - The error message
     */
    function showInlineError(input, message) {
        // Remove any existing error
        removeInlineError(input);

        // Add error styling to input
        input.classList.add('error');
        input.setAttribute('aria-invalid', 'true');

        // Create error message element
        const errorId = `${input.id}-error`;
        const errorElement = document.createElement('p');
        errorElement.id = errorId;
        errorElement.className = 'field-error';
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', 'polite');
        errorElement.textContent = message;

        // Insert after the input's parent container
        const container = input.closest('.mb-6') || input.closest('.mb-8');
        if (container) {
            container.appendChild(errorElement);
        }

        // Link error to input for screen readers
        input.setAttribute('aria-describedby', `${input.getAttribute('aria-describedby') || ''} ${errorId}`.trim());
    }

    /**
     * Removes inline error message from an input
     * @param {HTMLInputElement} input - The input element
     */
    function removeInlineError(input) {
        input.classList.remove('error');
        input.setAttribute('aria-invalid', 'false');

        const errorId = `${input.id}-error`;
        const existingError = document.getElementById(errorId);
        if (existingError) {
            existingError.remove();
        }

        // Clean up aria-describedby
        const describedBy = input.getAttribute('aria-describedby');
        if (describedBy) {
            const newDescribedBy = describedBy.replace(errorId, '').trim();
            if (newDescribedBy) {
                input.setAttribute('aria-describedby', newDescribedBy);
            } else {
                input.removeAttribute('aria-describedby');
            }
        }
    }

    /**
     * Sets the loading state on a submit button
     * @param {HTMLButtonElement} button - The button element
     * @param {boolean} loading - Whether the button should show loading state
     */
    function setButtonLoadingState(button, loading) {
        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = `
                <span class="inline-flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Submitting...</span>
                </span>
            `;
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            button.classList.add('opacity-50', 'cursor-not-allowed');
            button.classList.remove('hover:bg-neutral-200');
        } else {
            button.innerHTML = button.dataset.originalText || button.innerHTML;
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.classList.remove('opacity-50', 'cursor-not-allowed');
            button.classList.add('hover:bg-neutral-200');
            delete button.dataset.originalText;
        }
    }

    /**
     * Initializes form handling on page load
     */
    function initForms() {
        const forms = document.querySelectorAll('form[data-enhanced]');

        forms.forEach(form => {
            const inputs = form.querySelectorAll('input[required], input[pattern], input[min], input[max]');

            // Set up real-time validation on inputs
            inputs.forEach(input => {
                // Validate on blur (when user leaves the field)
                input.addEventListener('blur', function() {
                    if (input.value) {
                        setCustomValidationMessage(input);
                        if (!input.validity.valid) {
                            showInlineError(input, input.validationMessage);
                        } else {
                            removeInlineError(input);
                        }
                    }
                });

                // Clear error on input (as user types)
                input.addEventListener('input', function() {
                    setCustomValidationMessage(input);
                    if (input.validity.valid) {
                        removeInlineError(input);
                    }
                });

                // Set initial custom validity
                input.addEventListener('invalid', function(e) {
                    e.preventDefault();
                    setCustomValidationMessage(input);
                    showInlineError(input, input.validationMessage);
                });
            });

            // Handle form submission
            form.addEventListener('submit', function(e) {
                // Find the submit button
                const submitButton = form.querySelector('button[type="submit"]');

                // Prevent double submission
                if (isSubmitting) {
                    e.preventDefault();
                    return;
                }

                // Update all validation messages before checking validity
                inputs.forEach(input => {
                    setCustomValidationMessage(input);
                });

                // Validate form before showing loading state
                if (!form.checkValidity()) {
                    e.preventDefault();

                    // Show errors for all invalid fields
                    inputs.forEach(input => {
                        if (!input.validity.valid) {
                            showInlineError(input, input.validationMessage);
                        }
                    });

                    // Focus first invalid field
                    const firstInvalid = form.querySelector('input:invalid');
                    if (firstInvalid) {
                        firstInvalid.focus();
                    }

                    return;
                }

                // All validation passed - show loading state
                isSubmitting = true;

                if (submitButton) {
                    setButtonLoadingState(submitButton, true);
                }

                // Allow the form to submit naturally
                // The loading state will persist until the page redirects or reloads
            });
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initForms);
    } else {
        initForms();
    }

    // Export for use in other scripts if needed
    window.formHandler = {
        setButtonLoadingState,
        showInlineError,
        removeInlineError
    };
})();
