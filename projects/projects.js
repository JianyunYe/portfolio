import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

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

fetchJSON('/lib/projects.json').then(projects => {
    let rolledData = d3.rollups(
        projects,
        v => v.length,
        d => d.year
    );

    let data = rolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));

    let sliceGenerator = d3.pie().value(d => d.value);
    let arcData = sliceGenerator(data);

    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    arcData.forEach((d, idx) => {
        d3.select("#projects-pie-plot")
          .append("path")
          .attr("d", arcGenerator(d))
          .attr("fill", colors(idx));
    });

    let legend = d3.select('.legend');
    legend.html("");
    data.forEach((d, idx) => {
        legend.append('li')
              .attr('style', `--color:${colors(idx)}`)
              .attr('class', 'legend-item')
              .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
});

