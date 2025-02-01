import { fetchJSON, renderProjects, fetchGitHubData } from '/portfolio/global.js';

(async () => {
    try {
        const projects = await fetchJSON('/portfolio/lib/projects.json');

        const latestProjects = projects.slice(0, 3);

        const projectsContainer = document.querySelector('.projects');

        renderProjects(latestProjects, projectsContainer, 'h2');

        const githubData = await fetchGitHubData("JianyunYe");
        console.log("GitHub Data:", githubData);

        const profileStats = document.querySelector('#profile-stats');
        if (profileStats) {
            profileStats.innerHTML = `
                <h2>GitHub Profile Stats</h2>
                <dl class="github-stats">
                    <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
                    <dt>Public Gists:</dt><dd>${githubData.public_gists}</dd>
                    <dt>Followers:</dt><dd>${githubData.followers}</dd>
                    <dt>Following:</dt><dd>${githubData.following}</dd>
                </dl>
            `;
        }
    } catch (error) {
        console.error("Error loading data:", error);
    }
})();