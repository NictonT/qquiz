class FileManager {
    constructor() {
        this.files = JSON.parse(localStorage.getItem('files')) || [];
        this.currentFolderPath = [];
        this.ascending = true;
        this.filesContainer = document.getElementById('filesContainer');
        this.fileNameInput = document.getElementById('fileNameInput');
        this.fileType = document.getElementById('fileType');
        this.newFileNameInput = document.getElementById('newFileNameInput');
        this.addFileModal = document.getElementById('addFileModal');
        this.renameFileModal = document.getElementById('renameFileModal');
        this.nightModeToggle = document.getElementById('nightModeToggleFiles');
        this.currentFile = null;
        this.attachEventListeners();
        this.displayFiles();
    }

    attachEventListeners() {
        if (this.nightModeToggle) {
            this.nightModeToggle.addEventListener('change', this.toggleNightMode.bind(this));
            if (localStorage.getItem('nightMode') === 'true') {
                document.body.classList.add('night-mode');
                this.nightModeToggle.checked = true;
            }
        }

        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.addEventListener('click', this.saveFile.bind(this));
        }

        const addFileButton = document.getElementById('addFileButton');
        if (addFileButton) {
            addFileButton.addEventListener('click', this.showAddFileModal.bind(this));
        }
    }

    generateUniqueId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    displayFiles() {
        if (!this.filesContainer) {
            console.error('Files container element not found');
            return;
        }
        this.filesContainer.innerHTML = '';
        const currentFolder = this.getCurrentFolder();
        const sortedFiles = currentFolder.slice().sort((a, b) => {
            return this.ascending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        });
        sortedFiles.forEach((file) => {
            if (!file.id) {
                file.id = this.generateUniqueId();
            }
            const fileElement = document.createElement('div');
            fileElement.classList.add('file-item');
            const fileTypeEmoji = file.type === 'JSON' ? '📄' : '📁';
            fileElement.innerHTML = `
                <div>
                    <span>${fileTypeEmoji} ${file.name}</span>
                    <button class="icon-button rename-button" data-id="${file.id}">✏️</button>
                </div>
                <div>
                    ${file.type === 'JSON'
                        ? `<button class="button primary edit-button" data-id="${file.id}">Edit</button>`
                        : `<button class="button primary open-button" data-id="${file.id}">Open</button>`
                    }
                    <button class="button secondary execute-button" data-id="${file.id}">Execute</button>
                    <button class="button delete-button" data-id="${file.id}">Delete</button>
                </div>
            `;
            this.filesContainer.appendChild(fileElement);
        });

        this.filesContainer.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.getAttribute('data-id');
                this.editFile(id);
            });
        });

        this.filesContainer.querySelectorAll('.rename-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.getAttribute('data-id');
                this.showRenameFileModal(id);
            });
        });

        this.filesContainer.querySelectorAll('.open-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.getAttribute('data-id');
                this.openFolder(id);
            });
        });

        this.filesContainer.querySelectorAll('.execute-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.getAttribute('data-id');
                this.executeFile(id);
            });
        });

        this.filesContainer.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const id = event.target.getAttribute('data-id');
                this.deleteFile(id);
            });
        });

        this.updatePageTitle();
    }

    getCurrentFolder() {
        let folder = this.files;
        for (const folderName of this.currentFolderPath) {
            const nextFolder = folder.find(file => file.name === folderName && file.type === 'Folder');
            if (nextFolder) {
                folder = nextFolder.content;
            }
        }
        return folder;
    }

    updatePageTitle() {
        const titleElement = document.querySelector('#pageTitle');
        if (titleElement) {
            titleElement.innerHTML = this.currentFolderPath.length > 0 ? `Files - ${this.currentFolderPath.join(' / ')}` : 'Files';
        }
    }

    showAddFileModal() {
        if (this.addFileModal) {
            this.addFileModal.style.display = 'flex';
        }
    }

    closeAddFileModal() {
        if (this.addFileModal) {
            this.addFileModal.style.display = 'none';
        }
    }

    addNewFile() {
        const fileName = this.fileNameInput ? this.fileNameInput.value.trim() : '';
        if (fileName) {
            const currentFolder = this.getCurrentFolder();
            const newFile = { name: fileName, type: this.fileType.value, content: this.fileType.value === 'JSON' ? '' : [], id: this.generateUniqueId() };
            currentFolder.push(newFile);
            localStorage.setItem('files', JSON.stringify(this.files));
            this.displayFiles();
            if (this.fileNameInput) {
                this.fileNameInput.value = '';
            }
            this.closeAddFileModal();
        } else {
            alert('File name cannot be empty.');
        }
    }

    editFile(id) {
        const file = this.findFileById(this.files, id);
        if (file && file.type === 'JSON') {
            const currentEditFileName = document.getElementById('currentEditFileName');
            const fileContentElement = document.getElementById('fileContent');
            if (currentEditFileName && fileContentElement) {
                currentEditFileName.textContent = file.name;
                fileContentElement.value = file.content;
                this.currentFile = file;
                document.getElementById('filesPage').classList.add('hidden');
                document.getElementById('editPage').classList.remove('hidden');
            } else {
                console.error('Edit elements not found');
            }
        } else {
            alert('Unable to edit the selected file.');
        }
    }

    saveFile() {
        const fileContentElement = document.getElementById('fileContent');
        if (this.currentFile && fileContentElement) {
            this.currentFile.content = fileContentElement.value;
            localStorage.setItem('files', JSON.stringify(this.files));
            alert('File saved successfully!');
            this.currentFile = null;
            this.displayFiles();
            document.getElementById('editPage').classList.add('hidden');
            document.getElementById('filesPage').classList.remove('hidden');
        } else {
            alert('No file is currently being edited or file content element is missing.');
        }
    }

    executeFile(id) {
        const file = this.findFileById(this.files, id);
        if (file && file.type === 'JSON') {
            localStorage.setItem('fileToExecute', JSON.stringify(file));
            window.location.href = 'execute.html';
        } else if (file && file.type === 'Folder') {
            const contentToExecute = this.executeAllJsonInFolder(file);
            if (contentToExecute.length > 0) {
                alert(`Executing the following content:
${contentToExecute.join('\n')}`);
            } else {
                alert('No JSON content found to execute.');
            }
        }
    }

    executeAllJsonInFolder(folder) {
        let jsonContents = [];
        folder.content.forEach(file => {
            if (file.type === 'JSON') {
                jsonContents.push(file.content);
            } else if (file.type === 'Folder') {
                jsonContents = jsonContents.concat(this.executeAllJsonInFolder(file));
            }
        });
        return jsonContents;
    }

    openFolder(id) {
        const file = this.findFileById(this.files, id);
        if (file && file.type === 'Folder') {
            this.currentFolderPath.push(file.name);
            this.displayFiles();
        }
    }

    deleteFile(id) {
        const currentFolder = this.getCurrentFolder();
        const fileIndex = currentFolder.findIndex(file => file.id === id);
        if (fileIndex !== -1 && confirm(`Are you sure you want to delete "${currentFolder[fileIndex].name}"?`)) {
            currentFolder.splice(fileIndex, 1);
            localStorage.setItem('files', JSON.stringify(this.files));
            this.displayFiles();
        }
    }

    showRenameFileModal(id) {
        const file = this.findFileById(this.files, id);
        if (file) {
            this.currentFile = file;
            this.newFileNameInput.value = file.name;
            if (this.renameFileModal) {
                this.renameFileModal.style.display = 'flex';
            }
        }
    }

    closeRenameFileModal() {
        if (this.renameFileModal) {
            this.renameFileModal.style.display = 'none';
        }
    }

    renameFile() {
        const newName = this.newFileNameInput.value.trim();
        if (newName && this.currentFile) {
            this.currentFile.name = newName;
            localStorage.setItem('files', JSON.stringify(this.files));
            this.displayFiles();
            this.newFileNameInput.value = '';
            this.closeRenameFileModal();
        } else {
            alert('File name cannot be empty.');
        }
    }

    toggleFileList() {
        this.ascending = !this.ascending;
        const listButton = document.querySelector('.list-button');
        if (listButton) {
            listButton.innerText = `List ${this.ascending ? '↑' : '↓'}`;
        }
        this.displayFiles();
    }

    goBack() {
        if (this.currentFolderPath.length > 0) {
            this.currentFolderPath.pop();
            this.displayFiles();
        } else {
            document.getElementById('editPage').classList.add('hidden');
            document.getElementById('filesPage').classList.remove('hidden');
        }
    }

    toggleNightMode() {
        if (this.nightModeToggle) {
            const nightModeEnabled = this.nightModeToggle.checked;
            if (nightModeEnabled) {
                document.body.classList.add('night-mode');
                localStorage.setItem('nightMode', 'true');
            } else {
                document.body.classList.remove('night-mode');
                localStorage.setItem('nightMode', 'false');
            }
        }
    }

    findFileById(files, id) {
        for (const file of files) {
            if (file.id === id) {
                return file;
            } else if (file.type === 'Folder') {
                const found = this.findFileById(file.content, id);
                if (found) return found;
            }
        }
        return null;
    }
}

const fileManager = new FileManager();

window.showAddFileModal = () => fileManager.showAddFileModal();
window.closeAddFileModal = () => fileManager.closeAddFileModal();
window.addNewFile = () => fileManager.addNewFile();
window.editFile = (id) => fileManager.editFile(id);
window.saveFile = () => fileManager.saveFile();
window.executeFile = (id) => fileManager.executeFile(id);
window.openFolder = (id) => fileManager.openFolder(id);
window.deleteFile = (id) => fileManager.deleteFile(id);
window.showRenameFileModal = (id) => fileManager.showRenameFileModal(id);
window.closeRenameFileModal = () => fileManager.closeRenameFileModal();
