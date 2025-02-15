import { fetchJSON, renderProjects } from '../global.js';

(async () => {
    try {
        const projectsContainer = document.querySelector('.projects');
        if (!projectsContainer) {
            console.error("Error: .projects container not found.");
            return;
        }

        projectsContainer.innerHTML = "";

        const projects = await fetchJSON('/lib/projects.json');

        renderProjects(projects, projectsContainer, 'h2');

    } catch (error) {
        console.error('Fail to load projects:', error);
    }
})();