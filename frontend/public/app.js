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

// to show password

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
});

