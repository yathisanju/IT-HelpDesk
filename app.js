// Global file handler for index.html onchange
function handleFileSelect(input) {
    const placeholder = document.getElementById('uploadPlaceholder');
    const display = document.getElementById('fileNameDisplay');
    const zone = document.getElementById('uploadZone');

    if (input.files && input.files[0]) {
        placeholder.style.display = 'none';
        display.style.display = 'block';
        display.textContent = '📄 ' + input.files[0].name;
        zone.style.borderColor = '#4ade80';
        zone.style.background = 'rgba(74, 222, 128, 0.05)';
    } else {
        placeholder.style.display = 'block';
        display.style.display = 'none';
        zone.style.borderColor = 'var(--border)';
        zone.style.background = 'rgba(255,255,255,0.05)';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const ticketForm = document.getElementById('ticketForm');
    const submitBtn = document.getElementById('submitBtn');
    const toast = document.getElementById('toast');
    const fileInput = document.getElementById('screenshot');

    const API_URL = 'https://it-helpdesk1-60068587326.development.catalystserverless.in/server/helpdesk_function/';

    ticketForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Check for file attachment
        let screenshotURL = '';
        const file = fileInput.files[0];

        // 2. Loading State
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            // Upload file if exists
            if (file) {
                submitBtn.textContent = 'Uploading image...';
                const base64 = await toBase64(file);
                const uploadRes = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-action': 'upload'
                    },
                    body: JSON.stringify({
                        fileName: file.name,
                        fileData: base64.split(',')[1] // remove data:image/png;base64,
                    })
                });
                const uploadData = await uploadRes.json();
                if (uploadData.ok) {
                    screenshotURL = uploadData.downloadUrl;
                } else {
                    throw new Error(uploadData.error || 'File upload failed');
                }
            }

            // 3. Submit Ticket
            submitBtn.textContent = 'Submitting ticket...';
            const formData = {
                HotelName: document.getElementById('hotelName').value,
                FullName: document.getElementById('fullName').value,
                WorkEmail: document.getElementById('workEmail').value,
                Department: document.getElementById('department').value,
                Category: document.getElementById('category').value,
                Priority1: document.getElementById('priority').value,
                Subject: document.getElementById('subject').value,
                Discription: document.getElementById('description').value,
                ScreenshotURL: screenshotURL,
                Phone: '0', 
                OperatingSystem: 'Unknown'
            };

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
                handleFileSelect(fileInput); // Reset UI
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

    function toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

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
