const pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'cv/', title: 'CV' },
    { url: 'https://github.com/JianyunYe', title: 'GitHub Profile' }
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