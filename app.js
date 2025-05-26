// DOM Elements
let loginForm, profileForm, authStatus, classmatesContainer;

// Check which page we're on and initialize accordingly
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('login-form')) {
        // Login page
        loginForm = document.getElementById('login-form');
        loginForm.addEventListener('submit', handleLogin);
    } else if (document.getElementById('profile-form')) {
        // Profile page
        profileForm = document.getElementById('profile-form');
        profileForm.addEventListener('submit', handleProfileSubmit);

        // Profile page or profile form on index.html
        const profileForm = document.getElementById('profileForm') || document.getElementById('profile-form');
        if (profileForm) {
            // Pre-fill form if user has a profile
            fetch('https://your-app.up.railway.app/api/profiles/me', {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            })
            .then(res => res.json())
            .then(profile => {
                if (profile) {
                    document.getElementById('displayName').value = profile.fullName || '';
                    document.getElementById('hobbies').value = profile.hobbies || '';
                    document.getElementById('whatsapp').value = profile.whatsapp || '';
                    document.getElementById('instagram').value = profile.instagram || '';
                    document.getElementById('twitter').value = profile.twitter || '';
                    window.currentProfileId = profile.id;

                    // Set profile photo
                    const photoElement = document.getElementById('profilePhoto');
                    if (photoElement) {
                        photoElement.src = profile.photo && profile.photo.startsWith('data:')
                            ? profile.photo
                            : (profile.photo ? profile.photo : 'photos/default.jpg');
                    }
                }
            });

            // Save profile handler
            window.saveProfile = function() {
                const fileInput = document.getElementById('profileImage');
                const file = fileInput.files[0];
                const reader = new FileReader();

                function sendProfile(photoData) {
                    const profile = {
                        fullName: document.getElementById('displayName').value,
                        hobbies: document.getElementById('hobbies').value,
                        whatsapp: document.getElementById('whatsapp').value,
                        instagram: document.getElementById('instagram').value,
                        twitter: document.getElementById('twitter').value,
                        photo: photoData
                    };
                    const method = window.currentProfileId ? 'PUT' : 'POST';
                    const url = window.currentProfileId
                        ? `https://your-app.up.railway.app/api/profiles/${window.currentProfileId}`
                        : 'https://your-app.up.railway.app/api/profiles';

                    fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + localStorage.getItem('token')
                        },
                        body: JSON.stringify(profile)
                    })
                    .then(res => res.json())
                    .then(data => {
                        document.getElementById('profileStatus').textContent = 'Profile saved!';
                        setTimeout(() => window.location.reload(), 1000);
                    })
                    .catch(() => {
                        document.getElementById('profileStatus').textContent = 'Error saving profile!';
                    });
                }

                if (file) {
                    reader.onload = function(event) {
                        sendProfile(event.target.result);
                    };
                    reader.readAsDataURL(file);
                } else {
                    sendProfile('');
                }
            };
        }
    } else {
        // Homepage
        authStatus = document.getElementById('auth-status');
        classmatesContainer = document.getElementById('classmates-container');
    }
});

// Handle login (dummy, replace with your own logic)
function handleLogin(e) {
    e.preventDefault();
    // Example: Always succeed and redirect
    window.location.href = 'index.html';
}

// Handle profile submission (dummy, replace with your own logic)
function handleProfileSubmit(e) {
    e.preventDefault();
    // Example: Show a success message
    alert('Profile saved (not really, since Firebase is removed).');
}

// Check for token in localStorage
if (!localStorage.getItem('token') && !window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html')) {
    window.location.href = 'login.html';
}

// Logout button functionality
const logoutBtn = document.getElementById('logout-button');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
}

// Ensure saveProfile is defined if a button with onclick="saveProfile()" exists
if (document.querySelector('button[onclick*="saveProfile"]') && typeof window.saveProfile !== 'function') {
    window.saveProfile = function() {
        alert('Profile save function is not available on this page.');
    };
}