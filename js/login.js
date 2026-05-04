function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
}

function showCustomAlert(title, message) {
    const modal = document.getElementById('alertModal');
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    modal.style.display = 'block';
}

function closeAlertModal() {
    document.getElementById('alertModal').style.display = 'none';
}

document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    const emailInput = document.querySelector("input[type='email']");
    const passwordInput = document.querySelector("input[type='password']");

    setTimeout(() => {
        form.reset();
        emailInput.value = "";
        passwordInput.value = "";
    }, 50);

    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        window.location.href = 'admin.html';
        return;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!validateEmail(email)) {
            showCustomAlert("Invalid Input", "Invalid email format!");
            return;
        }

        if (password === "") {
            showCustomAlert("Invalid Input", "Password cannot be empty!");
            return;
        }

        try {
            const response = await fetch('php/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            });

            const data = await response.json();

            if (data.success) {
                sessionStorage.setItem('adminLoggedIn', 'true');
                sessionStorage.setItem('adminId', data.adminid);
                sessionStorage.setItem('adminName', data.name);
                sessionStorage.setItem('adminRole', data.role);

                showCustomAlert("Success", "Login successful!");
                
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1500);
                
            } else {
                showCustomAlert("Login Failed", data.error || "Invalid credentials!");
            }
        } catch (error) {
            console.error('Login error:', error);
            showCustomAlert("Error", "A connection error occurred. Please try again.");
        }
    });
});