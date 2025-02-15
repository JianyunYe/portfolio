import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let query = '';
let projects = [];
let searchInput = document.querySelector('.searchBar');

(async () => {
    try {
        const projectsContainer = document.querySelector('.projects');
        if (!projectsContainer) {
            console.error("Error: .projects container not found.");
            return;
        }

        projects = await fetchJSON('/lib/projects.json');
        renderProjects(projects, projectsContainer, 'h2');
        renderPieChart(projects);

    } catch (error) {
        console.error('Fail to load projects:', error);
    }
})();


searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();

    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query);
    });

    renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');
    renderPieChart(filteredProjects);
});

let selectedIndex = -1;

function renderPieChart(projectsGiven) {
    let newSVG = d3.select("#projects-pie-plot"); 
    newSVG.selectAll("path").remove();
    
    let legend = d3.select('.legend');
    legend.html("");

    let rolledData = d3.rollups(
        projectsGiven,
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
        newSVG.append("path")
              .attr("d", arcGenerator(d))
              .attr("fill", colors(idx))
              .attr("class", idx === selectedIndex ? "selected" : "")
              .style("cursor", "pointer")
              .on("click", () => {
                selectedIndex = selectedIndex === idx ? -1 : idx;
                let selectedYear = selectedIndex !== -1 ? data[selectedIndex].label : null;

                let filteredProjects = selectedYear 
                    ? projects.filter(p => p.year === selectedYear) 
                    : projects;

                renderProjects(filteredProjects, document.querySelector('.projects'), 'h2');

                newSVG.selectAll("path")
                      .attr("class", (_, i) => i === selectedIndex ? "selected" : "");

                legend.selectAll("li")
                      .attr("class", (_, i) => i === selectedIndex ? "legend-item selected" : "legend-item");
                });
    });

    data.forEach((d, idx) => {
        legend.append('li')
              .attr('style', `--color:${colors(idx)}`)
              .attr('class', 'legend-item')
              .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
              .on("click", () => {
                  selectedIndex = selectedIndex === idx ? -1 : idx;

                  newSVG.selectAll("path")
                        .attr("class", (_, i) => i === selectedIndex ? "selected" : "");

                  legend.selectAll("li")
                        .attr("class", (_, i) => i === selectedIndex ? "legend-item selected" : "legend-item");
              });
    });
}
