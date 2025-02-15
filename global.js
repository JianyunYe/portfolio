const pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'cv/', title: 'CV' },
    { url: 'https://github.com/JianyunYe', title: 'GitHub Profile' },
  ];
  
  const ARE_WE_HOME = document.documentElement.classList.contains('home');
  
  let nav = document.createElement('nav');
  document.body.prepend(nav);
  
  for (let p of pages) {
    let url = p.url;
    let title = p.title;
  
    if (!ARE_WE_HOME && !url.startsWith('http')) {
      url = '../' + url;
    }
  
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
  
    if (url.startsWith('http')) {
      a.target = "_blank";
    }
  
    a.classList.toggle(
      'current',
      a.host === location.host && a.pathname === location.pathname
    );
  
    nav.append(a);
  }
  
  function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty('color-scheme', colorScheme);
    select.value = colorScheme;
    localStorage.colorScheme = colorScheme;
  }
  
  const detectColorScheme = () =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic (${detectColorScheme()})</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`
  );
  
  const select = document.querySelector('.color-scheme select');
  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
  }
  select.addEventListener('input', (event) => {
    setColorScheme(event.target.value)
  });

  export async function fetchJSON(url) {
    try {
        const basePath = window.location.hostname.includes("github.io") ? "/portfolio" : "";
        
        const response = await fetch(`${basePath}${url}?v=${new Date().getTime()}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!Array.isArray(projects) || !containerElement || !(containerElement instanceof Element)) {
      console.error('Invalid parameters passed to renderProjects.');
      return;
  }

  const titleElement = document.querySelector('.projects-title');
  if (titleElement) {
    titleElement.textContent = `${projects.length} Projects`;
  }

  if (projects.length === 0) {
      containerElement.innerHTML = '<p>No projects found.</p>';
      return;
  }

  containerElement.innerHTML = '';

  const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (!validHeadings.includes(headingLevel)) {
      headingLevel = 'h2';
  }

  projects.forEach((project) => {
      const title = project.title || 'Untitled Project';
      const image = project.image || 'https://via.placeholder.com/150';
      const description = project.description || 'No description available.';

      const article = document.createElement('article');
      article.innerHTML = `
          <${headingLevel}>${title}</${headingLevel}>
          <img src="${image}" alt="${title}" onerror="this.src='https://via.placeholder.com/150';">
          <p>${description}</p>
      `;

      containerElement.appendChild(article);
  });

  console.log('Projects rendered successfully!');
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}