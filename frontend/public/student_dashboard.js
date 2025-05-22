document.addEventListener('DOMContentLoaded', function () {
    const createStudentForm = document.getElementById('createStudentForm');
    const studentPassword = document.getElementById('studentPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const phoneInput = document.getElementById('guardianPhone');
    const emailInput = document.getElementById('guardianEmail');
    const studentEmailInput = document.getElementById('studentEmail');
    const submitButton = document.querySelector('button[type="submit"]'); // The submit button

    // Initially disable the submit button
    submitButton.disabled = true;

    // Track whether the user has attempted to submit the form
    let formAttemptedSubmit = false;

    // Helper function to display error tooltips
    function showError(input, message) {
        const tooltip = input.nextElementSibling;
        tooltip.textContent = message;
        tooltip.style.display = 'block';
        input.classList.add('input-error');
    }

    function hideError(input) {
        const tooltip = input.nextElementSibling;
        tooltip.style.display = 'none';
        input.classList.remove('input-error');
    }

    function showSuccess(input) {
        hideError(input);
        input.classList.add('input-success');
    }

    // Phone number validation (allow only numbers, no letters or symbols)
    function validatePhoneNumber() {
        const phoneRegex = /^[0-9]{10,15}$/; // Adjust the length and format as needed
        if (!phoneRegex.test(phoneInput.value)) {
            if (formAttemptedSubmit || phoneInput.value.length > 0) {
                showError(phoneInput, 'Phone number must contain only numbers and be between 10-15 digits.');
            }
            return false;
        } else {
            showSuccess(phoneInput);
            return true;
        }
    }

    // Email validation for guardian and student
    function validateEmail(input, type) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value)) {
            if (formAttemptedSubmit || input.value.length > 0) {
                showError(input, `${type} email is not valid`);
            }
            return false;
        } else {
            showSuccess(input);
            return true;
        }
    }

    // Password validation (at least 8 characters, a number, a letter, and a special character)
    function validatePassword() {
        const password = studentPassword.value;
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            if (formAttemptedSubmit || studentPassword.value.length > 0) {
                showError(studentPassword, 'Password must be at least 8 characters, contain a letter, a number, and a special character');
            }
            return false;
        } else {
            showSuccess(studentPassword);
            return true;
        }
    }

    // Confirm password validation
    function validateConfirmPassword() {
        if (studentPassword.value !== confirmPassword.value) {
            if (formAttemptedSubmit || confirmPassword.value.length > 0) {
                showError(confirmPassword, 'Passwords do not match');
            }
            return false;
        } else {
            showSuccess(confirmPassword);
            return true;
        }
    }

    // Validate required fields (after user interacts)
    function validateRequiredFields() {
        const requiredFields = ['studentName', 'studentDOB', 'studentGrade', 'studentSchool', 'guardianName', 'relationship', 'username'];
        let isFormValid = true;

        requiredFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input.value.trim() === '') {
                if (formAttemptedSubmit || input.value.length > 0) {
                    showError(input, 'This field is required');
                }
                isFormValid = false;
            } else {
                showSuccess(input);
            }
        });

        return isFormValid;
    }

    // Function to check overall form validity and enable/disable the submit button
    function checkFormValidity() {
        const isPhoneValid = validatePhoneNumber();
        const isGuardianEmailValid = validateEmail(emailInput, 'Guardian');
        const isStudentEmailValid = validateEmail(studentEmailInput, 'Student');
        const isPasswordValid = validatePassword();
        const isConfirmPasswordValid = validateConfirmPassword();
        const isFormValid = validateRequiredFields();

        if (isFormValid && isPhoneValid && isGuardianEmailValid && isStudentEmailValid && isPasswordValid && isConfirmPasswordValid) {
            submitButton.disabled = false; // Enable the submit button when all validations pass
        } else {
            submitButton.disabled = true; // Disable the submit button if any validation fails
        }
    }

    // Add event listeners for validation on input and blur events
    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', checkFormValidity);
        input.addEventListener('blur', checkFormValidity);
    });

    // Final form validation before submission
    if (createStudentForm) {
        createStudentForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent traditional form submission

            // Mark that the form has been attempted to submit
            formAttemptedSubmit = true;

            // Validation flags
            const isPhoneValid = validatePhoneNumber();
            const isGuardianEmailValid = validateEmail(emailInput, 'Guardian');
            const isStudentEmailValid = validateEmail(studentEmailInput, 'Student');
            const isPasswordValid = validatePassword();
            const isConfirmPasswordValid = validateConfirmPassword();
            const isFormValid = validateRequiredFields();

            // **STRICT CHECK BEFORE SUBMISSION**
            if (!isFormValid || !isPhoneValid || !isGuardianEmailValid || !isStudentEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
                console.log('Form submission blocked due to validation errors');
                return; // Exit and block the form submission
            }

            // If all validations pass, proceed with the form submission
            console.log('Form is valid, proceeding with submission...');

            // Collect student details from the form fields
            const username = document.getElementById('username').value;
            const email = document.getElementById('studentEmail').value;
            const password = document.getElementById('studentPassword').value;
            const studentName = document.getElementById('studentName').value;
            const studentDOB = document.getElementById('studentDOB').value;
            const studentGrade = document.getElementById('studentGrade').value;
            const studentSchool = document.getElementById('studentSchool').value;

            // Collect guardian details from the form fields
            const guardianName = document.getElementById('guardianName').value;
            const guardianEmail = document.getElementById('guardianEmail').value;
            const guardianPhone = document.getElementById('guardianPhone').value;
            const relationship = document.getElementById('relationship').value;

            // Make a POST request to the server to create the student account
            fetch('/tutors/create-student', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    studentName,
                    studentDOB,
                    studentGrade,
                    studentSchool,
                    guardianName,
                    guardianEmail,
                    guardianPhone,
                    relationship
                })
            })
                .then(async response => {
                    const data = await response.json(); // Parse the JSON response
                    console.log('Response Status:', response.status); // Log the status code for debugging
                    console.log('Response Data:', data); // Log the response data

                    if (response.ok) { // Check if the response status is OK (200-299)
                        alert(data.message); // Show success message
                        document.getElementById('createStudentForm').reset(); // Clear the form
                        submitButton.disabled = true; // Disable the button again after successful submission
                    } else {
                        alert('Error creating student account: ' + data.message); // Show the error message
                    }
                })
                .catch(error => {
                    alert('An error occurred: ' + error.message); // Show a general error message
                });
        });
    }
});
