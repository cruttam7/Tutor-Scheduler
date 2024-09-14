document.addEventListener('DOMContentLoaded', function () {
    // Handle registration form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            })
            .then(async response => {
                const data = await response.json();
                console.log('Response Status:', response.status); // Log the status code
                console.log('Response Data:', data); // Log the response data for debugging
                if (response.ok) { // Check if the response status is OK (200-299)
                    alert(data.message); // Show the success message
                    window.location.href = 'login.html'; // Redirect to login page after successful registration
                } else {
                    alert('Registration failed: ' + data.message); // Show the error message
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error); // Log any fetch errors
                alert('An error occurred: ' + error.message); // Show the error message
            });
        });
    }

    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Prevent the form from submitting the traditional way

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }), // Send email and password as JSON
            })
            .then(async response => {
                try {
                    const data = await response.json(); // Parse the JSON response
                    console.log('Response Status:', response.status); // Log the status code
                    console.log('Response Data:', data); // Log the response data for debugging

                    if (response.ok) { // Login was successful (status code 200-299)
                        alert(data.message); // Show "Login successful"
                        window.location.href = 'dashboard.html'; // Redirect to dashboard
                    } else {
                        // Handle login failure (e.g., wrong password, user not found)
                        alert('Login failed: ' + data.message); // Show the error message
                    }
                } catch (error) {
                    // Handle any unexpected errors during JSON parsing or network issues
                    console.error('Error parsing response:', error);
                    alert('An error occurred while processing your request. Please try again.');
                }
            })
            .catch(error => {
                // Handle any fetch errors (e.g., network issues)
                console.error('Fetch Error:', error);
                alert('A network error occurred. Please try again.');
            });
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Assume we fetch student data from a server-side API
    fetch('/api/student/details')
    .then(response => response.json())
    .then(data => {
        document.getElementById('studentName').textContent = data.name;
        // Populate activities or other dashboard elements
    })
    .catch(error => console.log('Error fetching student data:', error));

    // Logout functionality
    window.logout = function() {
        fetch('/api/logout', { method: 'POST' })
        .then(() => window.location.href = '/index.html')
        .catch(error => console.error('Logout failed:', error));
    }
});

function logout() {
    fetch('/logout', {
        method: 'POST'
    })
    .then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        }
    })
    .catch(error => console.error('Logout failed:', error));
}
document.getElementById('createStudentForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const email = document.getElementById('studentEmail').value;
    const password = document.getElementById('studentPassword').value;

    fetch('/tutors/create-student', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
    })
    .then(response => response.json())
    .then(data => {
        alert(data.message);
        if (data.message === 'Student account created successfully') {
            // Clear the form after successful creation
            document.getElementById('studentEmail').value = '';
            document.getElementById('studentPassword').value = '';
        }
    })
    .catch(error => console.error('Error:', error));
});


