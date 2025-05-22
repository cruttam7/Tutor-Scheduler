document.addEventListener('DOMContentLoaded', function() {
    // Handle student account creation form submission
    const createStudentForm = document.getElementById('createStudentForm');
    if (createStudentForm) {
        createStudentForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent traditional form submission

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
                } else {
                    alert('Error creating student account: ' + data.message); // Show the error message
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error); // Log any fetch errors
                alert('An error occurred: ' + error.message); // Show a general error message
            });
        });
    }

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent the form from submitting the traditional way

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }) // Send email and password as JSON
            })
            .then(async response => {
                try {
                    const data = await response.json(); // Parse the JSON response
                    console.log('Response Status:', response.status); // Log the status code
                    console.log('Response Data:', data); // Log the response data for debugging

                    if (response.ok) { // Login was successful (status code 200-299)
                        alert(data.message); // Show "Login successful"
                        window.location.href = 'tutordashboard.html'; // Redirect to dashboard
                    } else {
                        alert('Login failed: ' + data.message); // Show the error message
                    }
                } catch (error) {
                    console.error('Error parsing response:', error);
                    alert('An error occurred while processing your request. Please try again.');
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                alert('A network error occurred. Please try again.');
            });
        });
    }

    // Fetch student details and populate the dashboard
    fetch('/api/student/details')
    .then(response => response.json())
    .then(data => {
        document.getElementById('studentName').textContent = data.name;
        // Populate other elements if needed
    })
    .catch(error => console.log('Error fetching student data:', error));

    // Toggle password visibility
    const togglePassword = document.querySelector('#togglePassword');
    const password = document.querySelector('#loginPassword');

    togglePassword.addEventListener('click', function () {
        // Toggle the type attribute
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);

        // Toggle the eye slash icon
        this.classList.toggle('fa-eye-slash');
    });

    // Logout functionality
    window.logout = function() {
        fetch('/logout', { method: 'POST' })
        .then(() => window.location.href = '/index.html')
        .catch(error => console.error('Logout failed:', error));
    }

    // Handle Forgot Password modal display
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const closeModalButtons = document.getElementsByClassName('close-modal');

    // Open forgot password modal
    forgotPasswordLink.addEventListener('click', function() {
        forgotPasswordModal.style.display = 'block';
    });

    // Close modals
    Array.from(closeModalButtons).forEach(button => {
        button.addEventListener('click', function() {
            forgotPasswordModal.style.display = 'none';
            messageModal.style.display = 'none';
        });
    });

    // Handle forgot password form submission
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const messageModal = document.getElementById('messageModal');
    const messageText = document.getElementById('messageText');

    forgotPasswordForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const email = document.getElementById('forgotEmail').value;

        try {
            const response = await fetch('/tutors/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();
            messageText.textContent = result.message || 'If the email is registered, a reset link has been sent.';
            messageModal.style.display = 'block';
        } catch (error) {
            messageText.textContent = 'Error sending reset link. Please try again.';
            messageModal.style.display = 'block';
        }
    });

    // Handle reset password form submission
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        // Show reset password form when the token is in the URL
        document.getElementById('resetPasswordContainer').style.display = 'block';

        resetPasswordForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const newPassword = document.getElementById('newPassword').value;

            try {
                const response = await fetch(`/tutors/reset-password-with-token/${token}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ newPassword })
                });

                const result = await response.json();
                const resetMessage = document.getElementById('resetMessage');
                resetMessage.textContent = result.message || 'Password has been reset successfully.';
            } catch (error) {
                document.getElementById('resetMessage').textContent = 'Error resetting password. Please try again.';
            }
        });
    }
});
