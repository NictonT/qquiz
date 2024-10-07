let currentFileName = '';

document.addEventListener('DOMContentLoaded', () => {
    const nightModeToggle = document.getElementById('nightModeToggle');
    if (localStorage.getItem('nightMode') === 'true') {
        document.body.classList.add('night-mode');
        nightModeToggle.checked = true;
    }
    nightModeToggle.addEventListener('change', function () {
        document.body.classList.toggle('night-mode', this.checked);
        localStorage.setItem('nightMode', this.checked);
    });

    document.getElementById('executeButton').addEventListener('click', function() {
        const jsonInput = document.getElementById('jsonInput').value;
        try {
            const parsedData = JSON.parse(jsonInput);
            localStorage.setItem('jsonData', JSON.stringify(parsedData));
            window.location.href = 'execute.html';
        } catch (e) {
            alert('Invalid JSON format');
        }
    });

    document.querySelector('.button.secondary').addEventListener('click', function() {
        window.location.href = 'files.html';
    });
});
