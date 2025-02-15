let data = [];
let commits = [];
const width = 1000;
const height = 600;
let xScale, yScale;

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line),
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));
  
    displayStats();
  }
  

document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
});

function processCommits() {
    commits = d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
  
        let { author, date, time, timezone, datetime } = first;
  
        let ret = {
          id: commit,
          url: `https://github.com/JianyunYe/portfolio/commit/${commit}`,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
          value: lines,
          writable: false,
          enumerable: false,
          configurable: false,
        });
  
        return ret;
      });
  }

  function displayStats() {
    d3.select("#stats").html(""); 
    processCommits();

    const dl = d3.select("#stats").append("dl").attr("class", "stats");

    dl.append("dt").html('Total <abbr title="Lines of Code">LOC</abbr>');
    dl.append("dd").text(data.length);

    dl.append("dt").text("Total commits");
    dl.append("dd").text(commits.length);

    const fileCount = d3.group(data, (d) => d.file).size;
    dl.append("dt").text("Number of files");
    dl.append("dd").text(fileCount);

    const longestFile = d3.greatest(data, (d) => d.line)?.file || "N/A";
    dl.append("dt").text("Longest file");
    dl.append("dd").text(longestFile);

    const fileLengths = d3.rollups(data, (v) => d3.max(v, (d) => d.line), (d) => d.file);
    const avgFileLength = d3.mean(fileLengths, (d) => d[1]);
    dl.append("dt").text("Average file length (lines)");
    dl.append("dd").text(avgFileLength.toFixed(2));

    const maxLineLength = d3.max(data, (d) => d.length);
    dl.append("dt").text("Longest line length");
    dl.append("dd").text(maxLineLength);

    const workByPeriod = d3.rollups(
        data,
        (v) => v.length,
        (d) => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
    );
    const maxPeriod = d3.greatest(workByPeriod, (d) => d[1])?.[0] || "N/A";
    dl.append("dt").text("Most active period");
    dl.append("dd").text(maxPeriod);
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createScatterplot();
});

function createScatterplot() {
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    const margin = { top: 10, right: 10, bottom: 30, left: 50 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top])
        .nice();

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);
    
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const xAxis = d3.axisBottom(xScale);
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
    
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    
    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', function (event, d) {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            updateTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', function () {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipContent({});
            updateTooltipVisibility(false);
        })
        .on('mousemove', (event) => updateTooltipPosition(event));

    brushSelector();
}



function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const lines = document.getElementById('commit-lines');

    if (Object.keys(commit).length === 0) {
        document.getElementById('commit-tooltip').style.display = 'none';
        return;
    }

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    time.textContent = commit.datetime?.toLocaleTimeString('en', { timeStyle: 'short' });
    author.textContent = commit.author;
    lines.textContent = commit.totalLines;

    document.getElementById('commit-tooltip').style.display = 'block';
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    const offsetX = 10;
    const offsetY = 10;

    tooltip.style.left = `${event.pageX + offsetX}px`;
    tooltip.style.top = `${event.pageY + offsetY}px`;
}

function brushSelector() {
    const svg = d3.select('svg');
    const brush = d3.brush()
        .on('start brush end', brushed);

    svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    svg.selectAll('.dots, .overlay ~ *').raise();
}

let brushSelection = null;

function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}

function isCommitSelected(commit) {
    if (!brushSelection) return false;

    const [x0, y0] = brushSelection[0];
    const [x1, y1] = brushSelection[1];

    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);

    return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
}

function updateSelection() {
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function updateSelectionCount() {
    const selectedCommits = brushSelection
        ? commits.filter(isCommitSelected)
        : [];

    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${
        selectedCommits.length || 'No'
    } commits selected`;

    return selectedCommits;
}

function updateLanguageBreakdown() {
    const selectedCommits = brushSelection
        ? commits.filter(isCommitSelected)
        : [];
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);

    const breakdown = d3.rollup(
        lines,
        (v) => v.length,
        (d) => d.type
    );

    container.innerHTML = '';

    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);

        container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }

    return breakdown;
}


