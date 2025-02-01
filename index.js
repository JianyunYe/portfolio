import { fetchJSON, renderProjects } from '/portfolio/global.js';

(async () => {
    try {
        const projects = await fetchJSON('/portfolio/lib/projects.json');

        const latestProjects = projects.slice(0, 3);

        const projectsContainer = document.querySelector('.projects');

        renderProjects(latestProjects, projectsContainer, 'h2');

    } catch (error) {
        console.error('Fail to load the latest projects:', error);
    }
})();