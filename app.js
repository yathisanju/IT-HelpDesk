document.addEventListener('DOMContentLoaded', () => {
    const ticketForm = document.getElementById('ticketForm');
    const submitBtn = document.getElementById('submitBtn');
    const toast = document.getElementById('toast');

    // Live Zoho Catalyst API URL
    const API_URL = 'https://it-helpdesk1-60068587326.development.catalystserverless.in/server/helpdesk_function/';

    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Gather Data
        const formData = {
            HotelName: document.getElementById('hotelName').value,
            FullName: document.getElementById('fullName').value,
            WorkEmail: document.getElementById('workEmail').value,
            Department: document.getElementById('department').value,
            Category: document.getElementById('category').value,
            Priority1: document.getElementById('priority').value,
            Subject: document.getElementById('subject').value,
            Discription: document.getElementById('description').value,
            Phone: '0', // Phone must be a bigint for Zoho Catalyst
            OperatingSystem: 'Unknown'
        };

        // 2. Loading State
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            // 3. Send Request to Catalyst
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Action': 'save' // Essential for the backend routing logic
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.ok) {
                // 4. Success Handling
                showToast('Ticket Submitted Successfully!', '✓');
                ticketForm.reset();
            } else {
                throw new Error(result.error || 'Failed to submit ticket');
            }
        } catch (err) {
            console.error('Submission Error:', err);
            showToast('Error: ' + err.message, '✕', '#f43f5e');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Support Ticket';
        }
    });

    function showToast(message, icon, color = '#10b981') {
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMsg = toast.querySelector('.toast-msg');
        const toastTitle = toast.querySelector('.toast-title');

        toast.style.backgroundColor = color;
        toastIcon.textContent = icon;
        toastTitle.textContent = message.includes('Error') ? 'Submission Failed' : 'Ticket Submitted!';
        toastMsg.textContent = message;

        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 500);
        }, 4000);
    }
});
