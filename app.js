document.addEventListener('DOMContentLoaded', () => {
    const ticketForm = document.getElementById('ticketForm');
    const submitBtn = document.getElementById('submitBtn');
    const toast = document.getElementById('toast');

    const API_URL = 'https://it-helpdesk1-60068587326.development.catalystserverless.in/server/helpdesk_function/';

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });

    /** When user clicks Submit — Catalyst DateTime: YYYY-MM-DD HH:mm:ss (IST) */
    function loggedTimeAtSubmit() {
        return new Date().toLocaleString('sv-SE', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace('T', ' ').replace(',', '').trim();
    }

    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 2. Loading State
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const fileInput = document.getElementById('screenshot');
            const formData = {
                HotelName: document.getElementById('hotelName').value,
                FullName: document.getElementById('fullName').value,
                WorkEmail: document.getElementById('workEmail').value,
                Department: document.getElementById('department').value,
                Phone: document.getElementById('phone').value,
                Category: document.getElementById('category').value,
                Priority1: document.getElementById('priority').value,
                Discription: document.getElementById('description').value,
                OperatingSystem: 'Unknown',
                ticketattachementlink: ''
            };

            // 2.5 Handle File Upload if exists
            if (fileInput && fileInput.files.length > 0) {
                submitBtn.textContent = 'Uploading Screenshot...';
                const file = fileInput.files[0];
                const base64Data = await toBase64(file);
                
                const uploadRes = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Action': 'upload' },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileData: base64Data
                    })
                });
                
                const uploadResult = await uploadRes.json();
                if (uploadResult.ok) {
                    formData.ticketattachementlink = uploadResult.downloadUrl;
                } else {
                    throw new Error('Screenshot upload failed: ' + uploadResult.error);
                }
            }

            formData.LoggedTimeAndDate = loggedTimeAtSubmit();

            // 3. Submit Ticket
            submitBtn.textContent = 'Saving Ticket...';

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Action': 'save'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.ok) {
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
        setTimeout(() => toast.classList.add('show'), 1000 / 60);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 500);
        }, 4000);
    }
});
