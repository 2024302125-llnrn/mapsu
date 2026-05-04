document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('feedbackForm');
    const submitButton = document.getElementById('submitFeedbackBtn');
    const statusMessage = document.getElementById('feedbackStatusMessage');
    const starLabels = document.querySelectorAll('.stars label');

    if (!form) return;

    starLabels.forEach((label) => {
        label.innerHTML = '&#9733;';
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const ratingInput = document.querySelector('input[name="r"]:checked');

        if (!ratingInput) {
            showStatus('Please select a rating.', true);
            return;
        }

        const payload = {
            action: 'create',
            name: document.getElementById('feedbackName').value.trim(),
            type: document.getElementById('feedbackType').value,
            message: document.getElementById('feedbackMessage').value.trim(),
            rating: parseInt(ratingInput.id.replace('s', ''), 10)
        };

        if (!payload.type || !payload.message) {
            showStatus('FEEDBACK TYPE AND MESSAGE ARE REQUIRED.', true);
            return;
        }

        submitButton.disabled = true;
        showStatus('SUBMITTING FEEDBACK...', false);

        try {
            const response = await fetch('api/manage_feedback.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('SERVER ERROR: ' + response.status);
            }

            const result = await response.json();

            if (result.success) {
                form.reset(); 
                
                const radios = document.querySelectorAll('input[name="r"]');
                radios.forEach(radio => {
                    radio.checked = false;
                });

                showStatus('THANK YOU FOR SUBMITTING YOUR FEEDBACK!', false);
            } else {
                throw new Error(result.error || 'UNABLE TO SUBMIT FEEDBACK.');
            }

        } catch (error) {
            showStatus(error.message.toUpperCase(), true);
        } finally {
            submitButton.disabled = false;
        }
    });

    function showStatus(message, isError) {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? '#c0392b' : '#27ae60';
        statusMessage.style.marginTop = '12px';
        statusMessage.style.fontSize = '12px';
        statusMessage.style.fontWeight = '700';
        statusMessage.style.textAlign = 'center';
        statusMessage.style.textTransform = 'uppercase';
    }
});