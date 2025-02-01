import { fetchJSON, renderProjects } from '/portfolio/global.js';

(async () => {
    try {
        const projects = await fetchJSON('/portfolio/lib/projects.json');

        const projectsContainer = document.querySelector('.projects');

        renderProjects(projects, projectsContainer, 'h2');

    } catch (error) {
        console.error('Error loading projects:', error);
    }
})();