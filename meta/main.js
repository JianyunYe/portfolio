let data = [];
let commits = [];
const width = 1000;
const height = 600;
let xScale, yScale;
let selectedCommits = [];

let commitProgress = 100; // 进度条初始值，默认100%（显示所有提交）
let timeScale;  // 时间比例尺
let commitMaxTime; // 选定时间的最大范围
let filteredCommits = [];

let NUM_ITEMS = commits.length;
let ITEM_HEIGHT = 60;
let VISIBLE_COUNT = 10;
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;

const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);

const itemsContainer = d3.select('#items-container');

scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
  renderItems(startIndex);
});


async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line),
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));

    processCommits();  // 确保 commits 已经处理
    initializeTimeScale(); // 现在可以安全初始化 timeScale

    // ✅ 现在 `commits` 已经有数据，更新 `NUM_ITEMS`
    NUM_ITEMS = commits.length;
    totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
    spacer.style('height', `${totalHeight}px`);  // ✅ 确保滚动区域正确

    displayStats();
  }
  
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initializeTimeScale(); // 初始化时间比例尺
    createTimeSlider();  // 创建滑块 UI
    updateTimeDisplay(); // 更新时间显示
    renderItems(0);
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

function initializeTimeScale() {
    timeScale = d3.scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, 100]);

    commitMaxTime = timeScale.invert(commitProgress);
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
    initializeTimeScale();
    createTimeSlider();
    filterCommitsByTime();
    updateScatterplot(commits); // 初始加载显示所有提交
});


function updateScatterplot(filteredCommits) {
    // 清除之前的 SVG 避免重叠
    d3.select('#chart').select('svg').remove();

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

    // 重新计算 xScale，确保缩放适应 `filteredCommits`
    xScale = d3
        .scaleTime()
        .domain(d3.extent(filteredCommits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top])
        .nice();

    // 重新计算点的大小比例
    const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt()
        .domain([minLines || 0, maxLines || 1]) // 避免空数据时报错
        .range([2, 30]);

    // 添加网格线
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);
    
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // 添加坐标轴
    const xAxis = d3.axisBottom(xScale);
    svg.append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    svg.append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // 重新排序 `filteredCommits` 以保证大的点在后面绘制
    const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);
    
    const dots = svg.append('g').attr('class', 'dots');

    // 移除旧的点
    dots.selectAll('circle').remove();

    // 重新绘制新的散点
    dots.selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .style('--r', (d) => rScale(d.totalLines) + 'px') // 让 CSS 动画生效
        .style('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', function (event, d) {
            d3.select(event.currentTarget).classed('selected', true).style('fill-opacity', 1);
            updateTooltipContent(d);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', function (event, d) {
            d3.select(event.currentTarget)
                .classed('selected', selectedCommits.includes(d))
                .style('fill-opacity', selectedCommits.includes(d) ? 1 : 0.7);
            updateTooltipContent({});
            updateTooltipVisibility(false);
        })
        .on('mousemove', (event) => updateTooltipPosition(event));

    brushSelector(); // 重新应用刷选
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

function brushed(event) {
    let brushSelection = event.selection;
    selectedCommits = !brushSelection
        ? []
        : commits.filter((commit) => {
            let min = { x: brushSelection[0][0], y: brushSelection[0][1] };
            let max = { x: brushSelection[1][0], y: brushSelection[1][1] };
            let x = xScale(commit.datetime);
            let y = yScale(commit.hourFrac);
            return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
        });

    updateSelection();
    updateSelectionCount();
    updateLanguageBreakdown();
}


function isCommitSelected(commit) {
    return selectedCommits.includes(commit);
}


function updateSelection() {
    d3.selectAll('circle').classed('selected', (d) => selectedCommits.includes(d));
}

function updateSelectionCount() {
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
}


function updateLanguageBreakdown() {
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }
    const lines = selectedCommits.flatMap((d) => d.lines);

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

function createTimeSlider() {
    const timeSlider = document.getElementById('time-slider');
    timeSlider.addEventListener('input', updateTimeDisplay);
}

function updateTimeDisplay() {
    commitProgress = Number(document.getElementById('time-slider').value);
    commitMaxTime = timeScale.invert(commitProgress);
    document.getElementById('selectedTime').textContent = commitMaxTime.toLocaleString('en', { dateStyle: "long", timeStyle: "short" });

    filterCommitsByTime(); // 过滤提交数据
    updateScatterplot(filteredCommits); // 重新渲染散点图
    updateFileVisualization();
}

function filterCommitsByTime() {
    filteredCommits = commits.filter(commit => commit.datetime <= commitMaxTime);
}

let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

function updateFileVisualization() {

    let lines = filteredCommits.flatMap((d) => d.lines);
    let files = [];
    files = d3
      .groups(lines, (d) => d.file)
      .map(([name, lines]) => {
        return { name, lines };
      });
    
    files = d3.sort(files, (d) => -d.lines.length);

    d3.select('.files').selectAll('div').remove(); // 清空旧数据

    let filesContainer = d3.select('.files')
        .selectAll('div')
        .data(files)
        .enter()
        .append('div');

    filesContainer.append('dt')
        .append('code')
        .html(d => `${d.name} <small>${d.lines.length} lines</small>`); // ✅ 添加行数显示

    // 代码行可视化
    let linesContainer = filesContainer.append('dd');

    linesContainer.selectAll('div')
        .data(d => d.lines)
        .enter()
        .append('div')
        .attr('class', 'line') // ✅ 生成代码行的可视化方块
        .style('background', d => fileTypeColors(d.type));
}

function renderItems(startIndex) {
    // 清空当前的 commit 项
    itemsContainer.selectAll('div').remove();

    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    let newCommitSlice = commits.slice(startIndex, endIndex);

    // ✅ 让 scatterplot 也只显示这些 commits
    updateScatterplot(newCommitSlice);
    updateFileVisualization(newCommitSlice);

    // 绑定 commit 数据
    itemsContainer.selectAll('div')
                  .data(newCommitSlice)
                  .enter()
                  .append('div')
                  .attr('class', 'item')
                  .style('position', 'absolute')
                  .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)
                  .html(d => `
                      <p>
                        On ${d.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "short"})},
                        I made
                        <a href="${d.url}" target="_blank">
                          ${startIndex > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
                        </a>.
                        I edited ${d.totalLines} lines across 
                        ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.
                        Then I looked over all I had made, and I saw that it was very good.
                      </p>
                  `);
}

function displayCommitFiles(filteredCommits) {
    const lines = filteredCommits.flatMap((d) => d.lines);
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

    let files = d3.groups(lines, (d) => d.file).map(([name, lines]) => ({ name, lines }));
    files = d3.sort(files, (d) => -d.lines.length);

    d3.select('.files').selectAll('div').remove();
    let filesContainer = d3.select('.files').selectAll('div').data(files).enter().append('div');

    filesContainer.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
    filesContainer.append('dd')
                  .selectAll('div')
                  .data(d => d.lines)
                  .enter()
                  .append('div')
                  .attr('class', 'line')
                  .style('background', d => fileTypeColors(d.type));
}